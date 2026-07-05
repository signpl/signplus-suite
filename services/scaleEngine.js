/* ==================================================================== */
/*  ScaleEngine — 도면(AI/PDF/SVG)에 선언된 단위로 얻은 "도면 좌표(mm)"를    */
/*  실제 간판 크기(mm)로 변환하는 축척 계산만 담당하는 순수 로직.           */
/*                                                                        */
/*  Auto 모드는 파일이 선언한 물리 단위(PDF pt, SVG mm/pt/px+viewBox 등)를  */
/*  이미 mm로 환산한 값을 "1:1 실제 크기"로 신뢰할 수 있는지만 판단한다 —    */
/*  도면 안의 치수선/치수 텍스트를 해석해 실제 축척을 역산하는 것은         */
/*  범용적으로 신뢰하기 어려워 Version 1 범위에서는 지원하지 않는다.        */
/*  단위 정보 자체가 없거나 추정치인 경우 reliable:false를 반환해 렌더러가   */
/*  "도면 축척을 선택하십시오" 안내를 띄우도록 한다.                        */
/* ==================================================================== */
(function (root) {
  "use strict";

  const SCALE_PRESETS = [
    { id: "auto", label: "Auto" },
    { id: "1:1", label: "1 : 1" },
    { id: "1:2", label: "1 : 2" },
    { id: "1:5", label: "1 : 5" },
    { id: "1:10", label: "1 : 10" },
    { id: "1:20", label: "1 : 20" },
    { id: "custom", label: "직접 입력" },
  ];
  const SCALE_RATIO_MAP = { "1:1": 1, "1:2": 2, "1:5": 5, "1:10": 10, "1:20": 20 };

  // parsedResult.unitSource: "declared"(파일이 명시한 물리 단위) | "assumed"(단위 정보 없어 px 등으로 추정)
  function detectAutoScale(parsedResult) {
    const reliable = !!(parsedResult && parsedResult.unitSource === "declared" && parsedResult.widthMM > 0 && parsedResult.heightMM > 0);
    return { ratio: 1, reliable, reason: reliable ? "unit" : "no-declared-unit" };
  }

  function resolveRatio(scaleMode, customRatio, detection) {
    if (scaleMode === "auto") return (detection && detection.ratio) || 1;
    if (scaleMode === "custom") { const n = Number(customRatio); return n > 0 ? n : 1; }
    return SCALE_RATIO_MAP[scaleMode] || 1;
  }

  function scaleShapes(shapes, ratio) {
    if (ratio === 1) return shapes;
    return (shapes || []).map((shape) => ({
      segmentCount: shape.segmentCount,
      groupKey: shape.groupKey,
      subpaths: (shape.subpaths || []).map((sp) => ({ closed: sp.closed, points: sp.points.map(([x, y]) => [x * ratio, y * ratio]) })),
    }));
  }

  function scalePageSize(pageSize, ratio) {
    return { widthMM: (pageSize.widthMM || 0) * ratio, heightMM: (pageSize.heightMM || 0) * ratio };
  }

  const ScaleEngine = { SCALE_PRESETS, SCALE_RATIO_MAP, detectAutoScale, resolveRatio, scaleShapes, scalePageSize };
  if (typeof module !== "undefined" && module.exports) module.exports = ScaleEngine;
  if (typeof window !== "undefined") window.ScaleEngine = ScaleEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
