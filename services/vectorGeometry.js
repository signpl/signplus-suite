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
  //   2) Group 분석 — 파서가 SVG의 <g> 조상 또는 PDF의 q/Q 중첩 구간에서 판별해 넘겨준
  //      groupKey("같은 글자" 신호)가 있으면 최우선으로 신뢰한다(아래 0단계).
  //   3~4) Bounding Box 병합 / 같은 글자의 Path 병합 — groupKey가 없는 도형은 간격(gap)이 가까운
  //      순서대로 최소신장트리(MST, Kruskal)를 만들고, 간선 가중치가 오름차순으로 이어지는
  //      도중 배율(비율) 기준으로 가장 크게 벌어지는 지점 바로 앞까지를 "같은 글자 내부 간격"
  //      으로 본다. 초성/중성/종성처럼 획끼리 아예 겹치지 않는 자소도 같은 글자 안에서는 간격이
  //      촘촘하고, 서로 다른 글자 사이의 자간은 그보다 뚜렷하게 넓다는 실무 관례를 이용한다 —
  //      절대 차이가 아니라 배율로 판정해 자소 1개짜리 홑글자 옆 여백 같은 이상치에도 흔들리지
  //      않는다(도면마다 실제 글자 크기·자간이 달라도 고정 숫자 없이 이 도면 자체에서 임계값을
  //      구한다).
  //   5) Character 객체 생성 — { bbox, center, width, height, paths, holes, segments } 로
  //      반환한다. Path/Segment는 이 단계 이후로는 "각수" 계산 등 보조 용도로만 쓰고, 글자수·
  //      집계·단가 계산 등 모든 계산은 이 Character 배열을 기준으로 한다.
  // ===================================================================
  function rectGap(a, b) {
    const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
    const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
    return Math.sqrt(dx * dx + dy * dy);
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

  // 3~4단계 — candidates 간 완전 그래프의 MST(Kruskal)를 만들고, 간선 가중치(간격)가 오름차순
  // 으로 이어지는 도중 배율(비율) 기준으로 가장 크게 벌어지는 지점까지를 병합 임계값으로 삼아
  // union(a,b)로 실제 병합한다. union/find는 호출측(groupIntoGlyphs)의 것을 그대로 받아 공유한다.
  function mergeByAdaptiveGap(candidates, boxes, find, union) {
    const m = candidates.length;
    if (m <= 1) return;
    const edges = [];
    for (let a = 0; a < m; a++) {
      for (let b = a + 1; b < m; b++) {
        const i = candidates[a], j = candidates[b];
        edges.push([rectGap(boxes[i], boxes[j]), i, j]);
      }
    }
    edges.sort((x, y) => x[0] - y[0]);

    // MST 간선(가중치 오름차순)을 만들면서, 동시에 그 간선으로 실제 union할 (i,j) 쌍도 기록한다.
    const mstParent = new Map(candidates.map((i) => [i, i]));
    const mstFind = (x) => { while (mstParent.get(x) !== x) { mstParent.set(x, mstParent.get(mstParent.get(x))); x = mstParent.get(x); } return x; };
    const mstEdges = []; // [weight, i, j] — 오름차순
    let joined = 1;
    for (const [w, i, j] of edges) {
      const ri = mstFind(i), rj = mstFind(j);
      if (ri !== rj) {
        mstParent.set(ri, rj);
        mstEdges.push([w, i, j]);
        joined++;
        if (joined === m) break;
      }
    }
    if (!mstEdges.length) return;
    if (mstEdges.length === 1) { union(mstEdges[0][1], mstEdges[0][2]); return; }

    // 배율(ratio) 계산 기준값(eps) — 0(맞닿은 자소)과 작은 양수 간격이 섞여 있을 때, eps를
    // 이 도면에 실제로 존재하는 "가장 작은 양수 간격"과 같은 눈금으로 잡아야 0→작은값 전환이
    // 진짜 경계(자간)보다 먼저 잘못 끊기지 않는다.
    let firstPositive = 0;
    for (const [w] of mstEdges) { if (w > 0) { firstPositive = w; break; } }
    const eps = firstPositive > 0 ? firstPositive : 1;
    let cutIdx = mstEdges.length - 1, biggestRatio = -1;
    for (let k = 1; k < mstEdges.length; k++) {
      const ratio = (mstEdges[k][0] + eps) / (mstEdges[k - 1][0] + eps);
      if (ratio > biggestRatio) { biggestRatio = ratio; cutIdx = k - 1; }
    }
    for (let k = 0; k <= cutIdx; k++) union(mstEdges[k][1], mstEdges[k][2]);
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

    // 0) groupKey가 같은 도형은 무조건 같은 글자로 병합(강한 신호, 기하 판정보다 우선)
    const byGroupKey = new Map();
    for (let i = 0; i < n; i++) {
      const key = list[i].groupKey;
      if (!key) continue;
      if (!byGroupKey.has(key)) byGroupKey.set(key, i);
      else union(i, byGroupKey.get(key));
    }

    // 1~4) groupKey가 없는 도형만 기하 기반(배경 제외 + 자동 간격 임계값 병합)으로 판정
    const geometryCandidates = [];
    for (let i = 0; i < n; i++) if (!list[i].groupKey && !isExcluded(i)) geometryCandidates.push(i);
    mergeByAdaptiveGap(geometryCandidates, boxes, find, union);

    const groups = new Map();
    for (let i = 0; i < n; i++) {
      if (!list[i].groupKey && isExcluded(i)) continue; // 배경/아트보드 테두리 등은 글자 수에서 제외
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }

    return buildCharacters(list, Array.from(groups.values()));
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
