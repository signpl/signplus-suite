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

  // 글자(실제 Object) 인식 — Path/Segment/SubPath 개수가 아니라 "실제 글자 하나"를 하나의
  // 단위로 묶는다. 두 가지 신호를 함께 쓴다.
  //   0) groupKey(파서가 SVG의 <g> 구조에서 판별해 넘겨준 "같은 글자" 신호) — 있으면 최우선으로
  //      신뢰한다. 초성/중성/종성이 개별 도형으로 나뉜 한글처럼, 인접한 다른 글자와의 간격이 한
  //      글자 내부 자소 간격과 비슷해 좌표만으로는 구분이 안 되는 경우에도 정확히 구분해준다.
  //   1~3) groupKey가 없는 도형은 기존처럼 기하 정보로 판정한다 — 전체 도면의 70% 이상을 차지하는
  //      배경/테두리 제외 → 배경 제외 도형만으로 다시 계산한 median 대비 지나치게 작거나 큰 도형
  //      제외 → 남은 도형끼리 간격(gap)이 자동 임계값 이하이면 병합(겹치는 경우 포함, gap=0).
  //      임계값은 고정 비율이 아니라 이 도면 자체의 간격 분포에서 구한다(최소신장트리 컷) —
  //      초성/중성/종성처럼 획끼리 아예 겹치지 않는 자소도 같은 "각"(정사각형 셀) 안에서는
  //      간격이 촘촘하고, 서로 다른 글자 사이의 자간은 그보다 뚜렷하게 넓다는 실무 관례상
  //      두 간격대 사이에 뚜렷한 도약(jump)이 생기기 때문에, 글꼴 크기·각수와 무관하게
  //      도면마다 자동으로 맞는 임계값을 구할 수 있다.
  function rectGap(a, b) {
    const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
    const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // candidates: 병합 판정 대상 인덱스 목록. 이들 간의 완전 그래프에 대해 최소신장트리(MST,
  // Kruskal)를 만들고, 간선 가중치(간격)가 오름차순으로 이어지는 도중 가장 크게 벌어지는
  // 지점 바로 앞까지를 "같은 글자 내부 간격"으로 본다. 도약폭은 절대 차이가 아니라 배율
  // (비율)로 판정한다 — 자간이 유독 넓은 도면 한두 곳(예: 자소 1개짜리 홑글자 옆의 여백)이
  // 있어도 절대값 기준으로는 그 큰 값이 기준을 왜곡하지만, 배율 기준은 "촘촘한 무리"와
  // "그보다 몇 배 넓은 무리" 사이의 경계만 찾으므로 이런 이상치에 흔들리지 않는다.
  function autoMergeThreshold(candidates, boxes) {
    const m = candidates.length;
    if (m <= 1) return 0;
    const edges = [];
    for (let a = 0; a < m; a++) {
      for (let b = a + 1; b < m; b++) {
        const i = candidates[a], j = candidates[b];
        edges.push([rectGap(boxes[i], boxes[j]), i, j]);
      }
    }
    edges.sort((x, y) => x[0] - y[0]);
    const parent = new Map(candidates.map((i) => [i, i]));
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const mstWeights = [];
    let joined = 1;
    for (const [w, i, j] of edges) {
      const ri = find(i), rj = find(j);
      if (ri !== rj) {
        parent.set(ri, rj);
        mstWeights.push(w);
        joined++;
        if (joined === m) break;
      }
    }
    if (!mstWeights.length) return 0;
    if (mstWeights.length === 1) return mstWeights[0];
    // 배율(ratio) 계산의 기준값(eps) — 0(맞닿은 자소)과 작은 양수 간격(예: 5)이 섞여 있을 때,
    // eps를 전체 최댓값 기준의 아주 작은 값으로 두면 "0 → 5" 전환 자체가 무한대에 가까운
    // 배율로 보여 실제 경계(자간)보다 먼저 잘못 끊긴다. 그래서 eps는 이 도면에 실제로 존재하는
    // "가장 작은 양수 간격"과 같은 눈금으로 잡아, 0과 그 값 사이의 배율이 다른 진짜 경계의
    // 배율보다 작게 나오도록 한다(양수 간격이 전혀 없으면 전부 맞닿아 있다는 뜻이라 1로 둬도 무해).
    let firstPositive = 0;
    for (const w of mstWeights) { if (w > 0) { firstPositive = w; break; } }
    const eps = firstPositive > 0 ? firstPositive : 1;
    let cutIdx = mstWeights.length - 1, biggestRatio = -1;
    for (let k = 1; k < mstWeights.length; k++) {
      const ratio = (mstWeights[k] + eps) / (mstWeights[k - 1] + eps);
      if (ratio > biggestRatio) { biggestRatio = ratio; cutIdx = k - 1; }
    }
    return mstWeights[cutIdx];
  }

  function groupIntoGlyphs(shapes) {
    const list = shapes || [];
    const n = list.length;
    if (n <= 1) return list;

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

    // 1~3) groupKey가 없는 도형만 기하 기반(배경 제외 + 자동 간격 임계값)으로 판정
    const geometryCandidates = [];
    for (let i = 0; i < n; i++) if (!list[i].groupKey && !isExcluded(i)) geometryCandidates.push(i);
    const mergeGap = autoMergeThreshold(geometryCandidates, boxes);
    for (let a = 0; a < geometryCandidates.length; a++) {
      for (let b = a + 1; b < geometryCandidates.length; b++) {
        const i = geometryCandidates[a], j = geometryCandidates[b];
        if (rectGap(boxes[i], boxes[j]) <= mergeGap) union(i, j);
      }
    }

    const groups = new Map();
    for (let i = 0; i < n; i++) {
      if (!list[i].groupKey && isExcluded(i)) continue; // 배경/아트보드 테두리 등은 글자 수에서 제외
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }

    return Array.from(groups.values()).map((idxs) => ({
      subpaths: idxs.reduce((acc, i) => acc.concat(list[i].subpaths || []), []),
      segmentCount: idxs.reduce((s, i) => s + (list[i].segmentCount || 0), 0),
    }));
  }

  const VectorGeometry = { bboxOfPoints, unionBbox, lengthOfPoints, signedAreaOfPoints, statsOfShape, aggregateShapes, groupIntoGlyphs };

  if (typeof module !== "undefined" && module.exports) module.exports = VectorGeometry;
  if (typeof window !== "undefined") window.VectorGeometry = VectorGeometry;
})(typeof globalThis !== "undefined" ? globalThis : this);
