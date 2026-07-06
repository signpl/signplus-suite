/* ==================================================================== */
/*  VectorGeometry — AI/PDF/SVG 도면에서 추출한 폴리라인(Path)에 대한        */
/*  순수 기하 계산(Bounding Box · 외곽 길이 · 면적 · 집계)만 담당한다.        */
/*  main.js(Node, require)와 renderer(<script> 전역)에서 모두 그대로       */
/*  쓸 수 있도록 CommonJS/브라우저 전역을 함께 노출한다.                     */
/*                                                                        */
/*  좌표 단위는 호출측이 이미 mm로 정규화해서 넘긴다고 가정한다(파서 쪽       */
/*  책임). 이 모듈 자체는 단위를 모른 채 순수 숫자 좌표만 다룬다.             */
/* ==================================================================== */
(function (root) {
  "use strict";

  // 폴리라인(점 배열)의 Bounding Box
  function bboxOfPoints(points) {
    if (!points || !points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  function unionBbox(a, b) {
    if (!a) return b;
    if (!b) return a;
    const minX = Math.min(a.minX, b.minX), minY = Math.min(a.minY, b.minY);
    const maxX = Math.max(a.maxX, b.maxX), maxY = Math.max(a.maxY, b.maxY);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  // 폴리라인 길이(닫힌 경로면 마지막→처음 구간도 더함)
  function lengthOfPoints(points, closed) {
    if (!points || points.length < 2) return 0;
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i - 1][0];
      const dy = points[i][1] - points[i - 1][1];
      len += Math.sqrt(dx * dx + dy * dy);
    }
    if (closed) {
      const a = points[points.length - 1], b = points[0];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  // Shoelace 공식 — 부호 있는 면적(반시계=양수). 글자 하나(글립)에 외곽선+구멍(속칸)이 여러
  // 서브패스로 있을 때, 각 서브패스의 "부호 있는" 면적을 그대로 더하면 외곽선과 구멍의 권취
  // 방향이 반대인 정상적인 폰트/도면에서는 구멍 면적이 자동으로 상쇄된다(비영-와인딩 규칙).
  // 그래서 abs()는 개별 서브패스가 아니라 합산된 최종값에만 적용한다.
  function signedAreaOfPoints(points) {
    if (!points || points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    return area / 2;
  }

  // 하나의 도형(글자/글립) = 여러 서브패스(외곽+구멍)의 집합에 대한 통계
  function statsOfShape(shape) {
    const subpaths = shape.subpaths || [];
    let bbox = null;
    let perimeter = 0;
    let signedArea = 0;
    for (const sp of subpaths) {
      bbox = unionBbox(bbox, bboxOfPoints(sp.points));
      perimeter += lengthOfPoints(sp.points, sp.closed !== false);
      signedArea += signedAreaOfPoints(sp.points);
    }
    bbox = bbox || { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    const area = Math.abs(signedArea);
    // 획폭 추정 — 가늘고 긴 스트로크는 area ≈ (획폭/2) × perimeter 관계를 근사적으로 만족한다
    // (medial-axis 폭 추정에서 흔히 쓰는 방식). Version 1 참고값이며 정밀 폭 측정은 아니다.
    const strokeWidthEstimate = perimeter > 0 ? (2 * area) / perimeter : 0;
    // 내부 공간(Bounding Box 대비 실제 채워지지 않은 여백/구멍 면적) 추정
    const internalSpace = Math.max(0, bbox.width * bbox.height - area);
    return {
      bbox,
      width: bbox.width,
      height: bbox.height,
      perimeter,
      area,
      segmentCount: shape.segmentCount || 0,
      strokeWidthEstimate,
      internalSpace,
    };
  }

  // 도면 전체(여러 글립) 집계 — 우측 분석 패널이 그대로 쓸 수 있는 합계값
  function aggregateShapes(shapes) {
    let bbox = null;
    let totalArea = 0;
    let totalPerimeter = 0;
    let totalSegments = 0;
    let strokeSum = 0;
    let internalSpaceSum = 0;
    const enriched = (shapes || []).map((shape) => {
      const stats = statsOfShape(shape);
      bbox = unionBbox(bbox, stats.bbox);
      totalArea += stats.area;
      totalPerimeter += stats.perimeter;
      totalSegments += stats.segmentCount;
      strokeSum += stats.strokeWidthEstimate;
      internalSpaceSum += stats.internalSpace;
      return Object.assign({}, shape, stats);
    });
    // 글자간 간격 추정 — 중심 X좌표 기준으로 정렬한 뒤 인접한 글자 사이의 양의 간격(=글자 사이 빈 공간)만 평균
    const sortedByX = [...enriched].sort((a, b) => (a.bbox.minX + a.bbox.maxX) / 2 - (b.bbox.minX + b.bbox.maxX) / 2);
    let gapSum = 0, gapCount = 0;
    for (let i = 1; i < sortedByX.length; i++) {
      const gap = sortedByX[i].bbox.minX - sortedByX[i - 1].bbox.maxX;
      if (gap > 0) { gapSum += gap; gapCount++; }
    }
    return {
      shapes: enriched,
      count: enriched.length,
      bbox: bbox || { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      totalArea,
      totalPerimeter,
      totalSegments,
      avgStrokeWidth: enriched.length ? strokeSum / enriched.length : 0,
      avgInternalSpace: enriched.length ? internalSpaceSum / enriched.length : 0,
      avgGap: gapCount ? gapSum / gapCount : 0,
    };
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  // ===================================================================
  // Character 엔진 — 도면을 "획(Path)"이 아니라 "글자(Character)" 단위로 인식한다.
  // 처리 순서:
  //   1) CompoundPath 분석 — 파서(PdfVectorParser/SvgVectorParser) 단계에서 이미 끝나 있다.
  //      PDF는 하나의 채우기 연산(f/f*/B/...)까지 그려진 모든 서브패스를, SVG는 <path> 하나의
  //      d 속성 안에 담긴 모든 서브패스를 이미 "하나의 도형(shape)"으로 묶어서 넘겨준다 —
  //      외곽선+구멍(속칸)이 한 글자 안에서 이미 올바르게 하나로 묶여 있다는 뜻이다.
  //   2~4) Feature 기반 병합 — groupKey(Group/CompoundPath 신호) 하나만으로 병합을 결정하지
  //      않는다. Illustrator 아웃라인 구조·폰트마다 그룹/컴파운드패스 단위가 실제 "글자"와
  //      다르게 잡힐 수 있어(예: 획 하나하나가 각각 별도 그룹으로 내보내지는 경우), groupKey를
  //      유일한 진실로 신뢰하면 오히려 병합이 전혀 안 되는 상황이 생길 수 있다. 그래서 여러
  //      Feature(Bounding Box Overlap/Containment, Center Distance, Height Similarity,
  //      Baseline Alignment, Group/CompoundPath 신호, Hole 관계, Path 간 접촉 여부=간격)를
  //      모두 반영해 "병합 거리"를 계산하고(mergeDistance), 이 도면 자체의 거리 분포에서
  //      배율(비율) 기준으로 가장 크게 벌어지는 지점까지만 실제로 병합한다(적응형 컷 —
  //      고정 숫자 임계값을 쓰지 않는다).
  //   5) Character 객체 생성 — { bbox, center, width, height, paths, holes, segments } 로
  //      반환한다. Path/Segment는 이 단계 이후로는 "각수" 계산 등 보조 용도로만 쓰고, 글자수·
  //      집계·단가 계산 등 모든 계산은 이 Character 배열을 기준으로 한다.
  // ===================================================================
  function rectGap(a, b) {
    const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
    const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bboxAreaOf(b) { return Math.max(0, b.width) * Math.max(0, b.height); }
  function bboxOverlapArea(a, b) {
    const ox = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
    const oy = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
    return ox * oy;
  }
  function bboxCenterOf(b) { return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]; }
  // 도형 하나의 지배적 권취 방향(가장 넓은 서브패스 기준) — 구멍/외곽 관계 판정용.
  function dominantWindingSign(shape) {
    const subpaths = shape.subpaths || [];
    let bestAbs = -1, bestSign = 1;
    for (const sp of subpaths) {
      const a = signedAreaOfPoints(sp.points);
      if (Math.abs(a) > bestAbs) { bestAbs = Math.abs(a); bestSign = a >= 0 ? 1 : -1; }
    }
    return bestSign;
  }

  // 두 도형 사이의 "병합 거리"를 여러 Feature로 함께 계산한다 — 실제 좌표 간격(gap) 하나만
  // 보지 않고, 아래 Feature들을 종합한 보너스만큼 그 간격을 줄여서(같은 글자일 가능성이 높을수록
  // 더 가깝게 보이도록) 하나의 지표로 합친다:
  //   Bounding Box Overlap/Containment, Center Distance, Height Similarity, Baseline
  //   Alignment, Group/CompoundPath 신호, Hole 관계, Path 간 접촉 여부(간격 자체).
  // scale은 이 도면의 전형적인 자소 크기(중앙값)로, 도면 배율·폰트 크기가 달라도 같은 기준으로
  // 동작하도록 정규화한다. 어느 한 Feature도 단독으로 병합을 결정하지 않으며, 최종 병합 여부는
  // 이렇게 합쳐진 거리들을 이 도면 자체의 분포에서 적응적으로 컷하는 mergeByAdaptiveFeatureGap이
  // 정한다(고정 숫자 임계값 없음).
  function bboxContainment(boxA, boxB) {
    const areaA = bboxAreaOf(boxA), areaB = bboxAreaOf(boxB);
    const minArea = Math.max(1e-6, Math.min(areaA, areaB) || 0);
    return areaA > 0 && areaB > 0 ? Math.min(1, bboxOverlapArea(boxA, boxB) / minArea) : 0;
  }
  function mergeDistance(shapeA, shapeB, boxA, boxB, scale) {
    const s = Math.max(scale, 1e-6);
    const gap = rectGap(boxA, boxB); // Path 간 접촉 여부/근접(Connected Components)

    const containment = bboxContainment(boxA, boxB); // Bounding Box Overlap/Containment, 0~1

    const cA = bboxCenterOf(boxA), cB = bboxCenterOf(boxB);
    const centerDist = Math.hypot(cA[0] - cB[0], cA[1] - cB[1]);
    const centerCloseness = Math.max(0, 1 - centerDist / (s * 2.0)); // Center Distance, 0~1(가까울수록 1)

    const hA = boxA.height || 0, hB = boxB.height || 0;
    const heightSim = Math.max(hA, hB) > 0 ? 1 - Math.abs(hA - hB) / Math.max(hA, hB) : 1; // Height Similarity, 0~1

    const baselineDiff = Math.abs(boxA.maxY - boxB.maxY);
    const baselineAlign = Math.max(0, 1 - baselineDiff / (s * 1.2)); // Baseline Alignment, 0~1

    const group = shapeA.groupKey && shapeB.groupKey && shapeA.groupKey === shapeB.groupKey ? 1 : 0; // Group/CompoundPath

    const hole = containment > 0.8 && dominantWindingSign(shapeA) !== dominantWindingSign(shapeB) ? 1 : 0; // Hole 관계/외곽선 포함

    // Height Similarity/Baseline Alignment는 "같은 글자인지"가 아니라 "같은 줄(같은 폰트 크기)인지"에
    // 더 가까운 신호다 — 한 줄에 나열된 모든 글자가 동일한 높이·베이스라인을 공유하는 것이 정상이라,
    // 실제로는 가깝지 않은(다른 글자일) 후보 쌍에도 이 보너스가 그대로 붙어버린다. 그래서 이 두
    // 신호는 실제 근접도(Bounding Box 겹침 또는 중심 거리)가 어느 정도 있을 때만 반영되도록
    // 게이팅한다 — 같은 줄이라는 이유만으로는 병합 쪽으로 기울지 않는다.
    const proximityGate = Math.max(containment, centerCloseness);

    // 같은 글자일 가능성을 높이는 신호(보너스)가 클수록 간격을 더 크게 나눠 "더 가깝게" 만든다.
    const bonus = containment * 1.2 + centerCloseness * 0.6
      + heightSim * 0.5 * proximityGate + baselineAlign * 0.5 * proximityGate
      + group * 2.5 + hole * 2.5;
    return gap / (1 + bonus);
  }

  // 서브패스를 외곽선(paths)과 구멍(holes)으로 분류한다 — 절대 면적이 가장 큰 서브패스의
  // 권취 방향을 "외곽선" 기준으로 삼고, 반대 방향으로 감긴 서브패스만 구멍(예: "ㅁ","ㅇ"의
  // 속칸)으로 본다.
  function classifySubpaths(subpaths) {
    const list = subpaths || [];
    if (!list.length) return { paths: [], holes: [] };
    const withArea = list.map((sp) => ({ sp, area: signedAreaOfPoints(sp.points) }));
    const dominant = withArea.reduce((a, b) => (Math.abs(b.area) > Math.abs(a.area) ? b : a));
    const dominantSign = dominant.area >= 0 ? 1 : -1;
    const paths = [], holes = [];
    for (const { sp, area } of withArea) {
      if (area === 0 || (area >= 0 ? 1 : -1) === dominantSign) paths.push(sp);
      else holes.push(sp);
    }
    return { paths, holes };
  }

  // Character Engine 디버그 모드 — DEBUG_CHARACTER_MERGE=true 일 때만 동작하고, 그 외에는
  // 아래 debugLog가 즉시 return해 릴리즈 빌드에서 완전히 비활성화된다(콘솔 출력 없음, 성능
  // 영향 없음). 렌더러(브라우저 전역 window.DEBUG_CHARACTER_MERGE)와 Node(main 프로세스의
  // process.env.DEBUG_CHARACTER_MERGE) 양쪽에서 켤 수 있다.
  function isCharacterMergeDebugEnabled() {
    if (typeof window !== "undefined" && window.DEBUG_CHARACTER_MERGE) return true;
    if (typeof process !== "undefined" && process.env && process.env.DEBUG_CHARACTER_MERGE === "true") return true;
    return false;
  }
  function debugLog(...args) {
    if (!isCharacterMergeDebugEnabled()) return;
    console.log("[CharacterEngine]", ...args);
  }

  // 2~4단계 — candidates 간 완전 그래프에서 mergeDistance(여러 Feature를 종합한 거리)가 가장
  // 가까운 간선부터 최소신장트리(MST, Kruskal)를 만든다. 병합 여부를 가르는 고정 숫자 임계값은
  // 쓰지 않는다 — 실제 union에 쓰인 간선들을 오름차순으로 늘어놓고, 배율(비율) 기준으로 가장
  // 크게 벌어지는 지점까지만 실제로 병합한다(이 도면 자체의 거리 분포에서 구하는 적응형 컷).
  // union/find는 호출측(groupIntoGlyphs)의 것을 그대로 받아 공유한다. 디버그 모드에서 참조할 수
  // 있도록 실제 병합(accepted)/병합 안 한(rejected) 간선 목록과 컷 임계값을 반환한다.
  function mergeByAdaptiveFeatureGap(candidates, shapes, boxes, scale, find, union) {
    const m = candidates.length;
    if (m <= 1) return { acceptedEdges: [], rejectedEdges: [], cutThreshold: null };
    const edges = [];
    for (let a = 0; a < m; a++) {
      for (let b = a + 1; b < m; b++) {
        const i = candidates[a], j = candidates[b];
        edges.push([mergeDistance(shapes[i], shapes[j], boxes[i], boxes[j], scale), i, j]);
      }
    }
    edges.sort((x, y) => x[0] - y[0]); // 거리 오름차순(가장 확실한 같은-글자 후보부터)

    const mstParent = new Map(candidates.map((i) => [i, i]));
    const mstFind = (x) => { while (mstParent.get(x) !== x) { mstParent.set(x, mstParent.get(mstParent.get(x))); x = mstParent.get(x); } return x; };
    const mstEdges = []; // [dist, i, j] — 오름차순
    let joined = 1;
    for (const [dist, i, j] of edges) {
      const ri = mstFind(i), rj = mstFind(j);
      if (ri !== rj) {
        mstParent.set(ri, rj);
        mstEdges.push([dist, i, j]);
        joined++;
        if (joined === m) break;
      }
    }
    if (!mstEdges.length) return { acceptedEdges: [], rejectedEdges: [], cutThreshold: null };
    if (mstEdges.length === 1) {
      union(mstEdges[0][1], mstEdges[0][2]);
      return { acceptedEdges: mstEdges, rejectedEdges: [], cutThreshold: mstEdges[0][0] };
    }

    // 배율(ratio) 계산 기준값(eps) — 0(맞닿은 자소)과 작은 양수 거리가 섞여 있을 때, eps를 이
    // 도면에 실제로 존재하는 "가장 작은 양수 거리"와 같은 눈금으로 잡아야 0→작은값 전환이
    // 진짜 경계(자간)보다 먼저 잘못 끊기지 않는다.
    let firstPositive = 0;
    for (const [d] of mstEdges) { if (d > 0) { firstPositive = d; break; } }
    // scale(글자 크기) 기준 하한을 둬, 자소 중 아주 살짝 떨어진 조각의 미세 간격(예: 0.5mm)이
    // 비율 계산을 지배해 컷이 자소 경계에 잘못 걸리는(→ 글자가 반으로 쪼개지는) 것을 막는다.
    const eps = Math.max(scale * 0.1, firstPositive > 0 ? firstPositive : 1);
    // 도면에 글자 사이 간격 말고도 "단어 사이 간격"처럼 한 단계 더 큰 간격이 섞여 있을 수 있다
    // (예: "너를 만난곳"처럼 띄어쓰기가 있는 문구). 이때 전체 구간에서 "가장 큰" 도약 하나만
    // 고르면 그 도약이 글자 경계가 아니라 단어 경계에 걸려버려서, 더 작은(하지만 여전히 뚜렷한)
    // 글자 경계 도약들이 전부 그 밑에 묻혀 서로 다른 글자끼리 통째로 합쳐진다. 그래서 거리가
    // 작은 쪽부터 순서대로 훑다가 "뚜렷한 도약"(RATIO_SIGNIFICANT배 이상)을 처음 만나는 지점을
    // 컷으로 쓴다 — 여러 단계의 간격 중 가장 안쪽(글자 단위) 경계를 우선한다. 그런 도약이 전혀
    // 없으면(간격이 아주 매끄럽게 늘어나는 경우) 기존처럼 가장 큰 도약으로 대체한다.
    const RATIO_SIGNIFICANT = 1.5;
    let cutIdx = mstEdges.length - 1, biggestRatio = -1, biggestIdx = mstEdges.length - 1, firstSignificantIdx = -1;
    for (let k = 1; k < mstEdges.length; k++) {
      const ratio = (mstEdges[k][0] + eps) / (mstEdges[k - 1][0] + eps);
      if (ratio > biggestRatio) { biggestRatio = ratio; biggestIdx = k - 1; }
      if (firstSignificantIdx === -1 && ratio >= RATIO_SIGNIFICANT) firstSignificantIdx = k - 1;
    }
    cutIdx = firstSignificantIdx !== -1 ? firstSignificantIdx : biggestIdx;
    for (let k = 0; k <= cutIdx; k++) union(mstEdges[k][1], mstEdges[k][2]);
    return { acceptedEdges: mstEdges.slice(0, cutIdx + 1), rejectedEdges: mstEdges.slice(cutIdx + 1), cutThreshold: mstEdges[cutIdx][0] };
  }

  function groupIntoGlyphs(shapes) {
    const list = shapes || [];
    const n = list.length;
    if (n === 0) return [];
    if (n === 1) return buildCharacters(list, [[0]]);

    const stats = list.map(statsOfShape);
    const boxes = stats.map((s) => s.bbox);

    let overall = null;
    for (const b of boxes) overall = unionBbox(overall, b);
    const isFullPage = (b) => !!overall && overall.width > 0 && overall.height > 0 && b.width >= overall.width * 0.7 && b.height >= overall.height * 0.7;

    const roughCandidates = boxes.map((b, i) => i).filter((i) => !isFullPage(boxes[i]));
    const medH = median(roughCandidates.map((i) => stats[i].height).filter((h) => h > 0));
    const medA = median(roughCandidates.map((i) => stats[i].area).filter((a) => a > 0));

    const isTiny = (i) => medH > 0 && stats[i].height < medH * 0.25 && medA > 0 && stats[i].area < medA * 0.05;
    const isOversized = (i) => medH > 0 && (boxes[i].width > medH * 4 || boxes[i].height > medH * 4);
    const isExcluded = (i) => isFullPage(boxes[i]) || isTiny(i) || isOversized(i);

    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

    // 배경/아트보드 테두리·이상치를 뺀 나머지 전부를 하나의 후보군으로 놓고 Feature Score로
    // 병합한다 — groupKey(Group/CompoundPath 신호)는 mergeScore 안에서 여러 Feature 중 하나로만
    // 반영되고, 단독으로 병합 여부를 확정하지 않는다(groupKey 단위가 실제 글자와 다르게 잡히는
    // 도면에서도 다른 Feature로 보완되도록).
    const candidates = [];
    const excludedReasons = [];
    for (let i = 0; i < n; i++) {
      if (isExcluded(i)) { excludedReasons.push([i, isFullPage(boxes[i]) ? "배경/아트보드(전체 도면의 70% 이상)" : isTiny(i) ? "이상치(너무 작음)" : "이상치(너무 큼)"]); continue; }
      candidates.push(i);
    }
    const scale = medH > 0 ? medH : (median(candidates.map((i) => Math.max(boxes[i].width, boxes[i].height)).filter((v) => v > 0)) || 1);
    const debugOn = isCharacterMergeDebugEnabled();
    if (debugOn) debugLog(`입력 Path 수: ${n}, 제외: ${excludedReasons.length}, 병합 후보: ${candidates.length}, 기준 크기(scale): ${scale.toFixed(2)}`);
    const mergeResult = mergeByAdaptiveFeatureGap(candidates, list, boxes, scale, find, union);

    const groups = new Map();
    for (let i = 0; i < n; i++) {
      if (isExcluded(i)) continue; // 배경/아트보드 테두리 등은 글자 수에서 제외
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    const groupList = Array.from(groups.values());

    if (debugOn) {
      debugLog(`적응형 컷 임계값(거리): ${mergeResult.cutThreshold == null ? "N/A" : mergeResult.cutThreshold.toFixed(3)}`);
      for (const [i, reason] of excludedReasons) debugLog(`제외된 Path #${i}: ${reason}`);
      groupList.forEach((idxs, k) => {
        const memberScores = mergeResult.acceptedEdges.filter(([, i, j]) => idxs.includes(i) && idxs.includes(j));
        const merged = idxs.length > 1;
        debugLog(`--- Character #${k + 1} ---`);
        debugLog(`  병합 전 Path 수(후보 전체): ${candidates.length}`);
        debugLog(`  병합 후 Path 수(이 Character로 합쳐진 조각): ${idxs.length} (원본 인덱스: ${idxs.join(",")})`);
        debugLog(`  Merge Score(이 Character 내부 병합 거리): ${memberScores.map(([d]) => d.toFixed(3)).join(", ") || "(단일 조각 — 병합 없음)"}`);
        debugLog(`  병합 성공 여부: ${merged}`);
        if (!merged) {
          const nearest = mergeResult.rejectedEdges.find(([, i, j]) => i === idxs[0] || j === idxs[0]);
          debugLog(`  병합 실패 이유: ${nearest ? `가장 가까운 후보(거리 ${nearest[0].toFixed(3)})가 적응형 컷 임계값(${mergeResult.cutThreshold.toFixed(3)})을 초과함` : "비교할 다른 후보 없음"}`);
        }
      });
    }

    return buildCharacters(list, groupList);
  }

  // 5) Character 객체 생성 — 이 배열이 이후 모든 계산(집계/견적/치수)의 기준이 된다.
  function buildCharacters(list, groups) {
    return groups.map((idxs) => {
      const subpaths = idxs.reduce((acc, i) => acc.concat(list[i].subpaths || []), []);
      const segments = idxs.reduce((s, i) => s + (list[i].segmentCount || 0), 0);
      let bbox = null;
      for (const sp of subpaths) bbox = unionBbox(bbox, bboxOfPoints(sp.points));
      bbox = bbox || { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      const { paths, holes } = classifySubpaths(subpaths);
      return {
        bbox,
        center: [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2],
        width: bbox.width,
        height: bbox.height,
        paths,
        holes,
        segments,
        // 하위 호환 — 기존 statsOfShape/DXF export/캔버스 렌더링이 그대로 쓰는 필드명 유지
        subpaths,
        segmentCount: segments,
      };
    });
  }

  const VectorGeometry = { bboxOfPoints, unionBbox, lengthOfPoints, signedAreaOfPoints, statsOfShape, aggregateShapes, groupIntoGlyphs };

  if (typeof module !== "undefined" && module.exports) module.exports = VectorGeometry;
  if (typeof window !== "undefined") window.VectorGeometry = VectorGeometry;
})(typeof globalThis !== "undefined" ? globalThis : this);
