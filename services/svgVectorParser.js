/* ==================================================================== */
/*  SvgVectorParser — SVG 파일 텍스트에서 벡터 도형(Path/Rect/Circle/...)  */
/*  을 추출해 PdfVectorParser와 동일한 정규화 형식으로 반환한다.            */
/*  브라우저(Renderer) 전용 — DOMParser·SVGGeometryElement(getCTM /        */
/*  getTotalLength / getPointAtLength)를 그대로 활용해 중첩된 transform    */
/*  과 곡선(Bezier/Arc)까지 별도 수식 구현 없이 정확히 좌표를 얻는다.        */
/* ==================================================================== */
(function (root) {
  "use strict";

  const UNIT_TO_MM = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, "": 25.4 / 96, "%": null };

  function parseLength(str) {
    if (!str) return null;
    const m = /^\s*(-?[\d.]+)\s*([a-z%]*)\s*$/i.exec(str);
    if (!m) return null;
    const unit = m[2].toLowerCase();
    const factor = UNIT_TO_MM[unit];
    if (factor == null) return null; // % 등 절대 단위로 환산 불가능한 값
    return parseFloat(m[1]) * factor;
  }

  // svg 루트의 width/height/viewBox로부터 "사용자 단위(user unit) → mm" 배율을 구한다.
  function computeScale(svgRoot) {
    const vb = (svgRoot.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const hasVb = vb.length === 4 && vb.every((n) => !isNaN(n));
    const declaredWmm = parseLength(svgRoot.getAttribute("width"));
    const declaredHmm = parseLength(svgRoot.getAttribute("height"));

    if (hasVb) {
      const vbW = vb[2] || 1, vbH = vb[3] || 1;
      const wMM = declaredWmm != null ? declaredWmm : vbW * UNIT_TO_MM.px;
      const hMM = declaredHmm != null ? declaredHmm : vbH * UNIT_TO_MM.px;
      return { scale: wMM / vbW, widthMM: wMM, heightMM: hMM, unitSource: declaredWmm != null ? "declared" : "assumed" };
    }
    if (declaredWmm != null && declaredHmm != null) {
      return { scale: 1, widthMM: declaredWmm, heightMM: declaredHmm, unitSource: "declared" };
    }
    // 단위를 전혀 알 수 없으면 사용자 단위를 px로 간주(가장 흔한 기본값)
    const w = parseFloat(svgRoot.getAttribute("width")) || 0;
    const h = parseFloat(svgRoot.getAttribute("height")) || 0;
    return { scale: UNIT_TO_MM.px, widthMM: w * UNIT_TO_MM.px, heightMM: h * UNIT_TO_MM.px, unitSource: "assumed" };
  }

  function applyCtm(ctm, x, y) {
    return [ctm.a * x + ctm.c * y + ctm.e, ctm.b * x + ctm.d * y + ctm.f];
  }

  // geomEl(Path/Rect/Circle/... 모두 SVGGeometryElement 인터페이스 구현) 하나를 등간격으로
  // 샘플링해 폴리라인으로 만든다. getTotalLength가 이미 닫힌 하위경로(Z)의 닫는 구간까지
  // 포함해 측정하므로, 반환값은 항상 "이미 닫혀 있는 폴리라인"이며 별도로 다시 닫지 않는다.
  function samplePoints(geomEl, ctm, scale) {
    let total = 0;
    try { total = geomEl.getTotalLength(); } catch (e) { return []; }
    if (!total || !isFinite(total)) return [];
    const steps = Math.max(2, Math.min(300, Math.ceil(total / 1.5)));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const len = (i / steps) * total;
      let p;
      try { p = geomEl.getPointAtLength(len); } catch (e) { continue; }
      const [x, y] = applyCtm(ctm, p.x, p.y);
      pts.push([x * scale, y * scale]);
    }
    return pts;
  }

  function segmentCountOf(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "path") {
      const d = el.getAttribute("d") || "";
      return (d.match(/[MLHVCSQTAmlhvcsqta]/g) || []).length;
    }
    if (tag === "rect") return 4;
    if (tag === "circle" || tag === "ellipse") return 4;
    if (tag === "polygon" || tag === "polyline") {
      try { return el.points.numberOfItems; } catch (e) { return 1; }
    }
    return 1; // line
  }

  // <path>의 d 속성을 M/m 단위로 쪼개 서브패스별 임시 엘리먼트를 만든다 — getTotalLength/
  // getPointAtLength가 경로 전체 길이 기준으로 동작해 여러 서브패스(외곽+글자 속 구멍)를
  // 하나로 뭉뚱그리는 것을 막기 위함이다. 임시 엘리먼트는 원본과 같은 부모에 붙여 동일한
  // 조상 transform(=getCTM 결과)을 그대로 물려받는다.
  function pathSubShapes(el, ctm, scale) {
    const d = el.getAttribute("d") || "";
    const parts = d.match(/[Mm][^Mm]*/g) || [];
    const subpaths = [];
    const parent = el.parentNode;
    for (const part of parts) {
      const temp = el.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      temp.setAttribute("d", part);
      parent.appendChild(temp);
      const pts = samplePoints(temp, ctm, scale);
      parent.removeChild(temp);
      if (pts.length >= 2) subpaths.push({ points: pts, closed: false });
    }
    return subpaths;
  }

  function shapeFromElement(el, scale) {
    let ctm;
    try { ctm = el.getCTM(); } catch (e) { ctm = null; }
    if (!ctm) ctm = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    const tag = el.tagName.toLowerCase();
    let subpaths;
    if (tag === "path") {
      subpaths = pathSubShapes(el, ctm, scale);
    } else {
      const pts = samplePoints(el, ctm, scale);
      subpaths = pts.length >= 2 ? [{ points: pts, closed: false }] : [];
    }
    if (!subpaths.length) return null;
    return { subpaths, segmentCount: segmentCountOf(el) };
  }

  function safeBBox(el) {
    try { return el.getBBox(); } catch (e) { return null; }
  }

  // 글자(문자) 하나에 해당하는 <g> 조상을 찾는다 — 직계 부모만 보지 않고 그 조부모(한 단계
  // 더 바깥쪽)까지만 확인한다. "글자 그룹 > 획(Stroke) 서브그룹"처럼 한 단계 더 중첩된 구조에서
  // 직계 부모만 보면 서브그룹(획 단위)만 잡히고 정작 "글자" 단위인 바깥쪽 그룹을 놓치기
  // 때문이다(초성/중성/종성이 각각 별도 서브그룹으로 내보내지는 도면에서 실제로 발생). 다만
  // 그 이상(단어/줄 단위)까지는 올라가지 않는다 — 서로 다른 글자를 하나로 묶어버릴 위험이
  // 커지기 때문이다. <g>가 전체 도면의 70% 이상을 차지하면(=레이어/아트보드 전체를 감싸는
  // 그룹) 신호로 쓰지 않는다.
  function characterGroupOf(el, overallBBox) {
    let node = el.parentNode;
    let best = null;
    let bestBBox = null;
    while (node && node.tagName && node.tagName.toLowerCase() === "g") {
      const gBBox = safeBBox(node);
      if (!gBBox) break;
      const isWhole = overallBBox && overallBBox.width > 0 && overallBBox.height > 0
        && gBBox.width >= overallBBox.width * 0.7 && gBBox.height >= overallBBox.height * 0.7;
      if (isWhole) break; // 레이어/아트보드 전체를 감싸는 그룹으로 보임 — 여기서 멈춤
      // 이전에 채택한 레벨보다 폭/높이가 갑자기 크게(2배 이상) 넓어지면, 이 레벨부터는
      // "다른 글자"까지 포함하는 상위(단어/줄) 그룹으로 넘어간 것으로 보고 여기서 멈춘다.
      if (bestBBox && (gBBox.width > bestBBox.width * 2 || gBBox.height > bestBBox.height * 2)) break;
      best = node; // 지금까지 확인한 것 중 "전체를 덮지 않는" 가장 바깥쪽 그룹
      bestBBox = gBBox;
      node = node.parentNode;
    }
    return best;
  }

  function parse(svgText) {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error("SVG 파일을 해석할 수 없습니다.");
    const svgRoot = doc.documentElement;
    const { scale, widthMM, heightMM, unitSource } = computeScale(svgRoot);

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;visibility:hidden;";
    document.body.appendChild(container);
    try {
      const liveSvg = document.importNode(svgRoot, true);
      container.appendChild(liveSvg);
      const candidates = Array.from(liveSvg.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line"))
        .filter((el) => !el.closest("clipPath,mask,defs,symbol,pattern"));
      const overallBBox = safeBBox(liveSvg);
      const groupKeyMap = new Map();
      let nextGroupKey = 1;
      const shapes = [];
      for (const el of candidates) {
        const shape = shapeFromElement(el, scale);
        if (!shape) continue;
        const groupEl = characterGroupOf(el, overallBBox);
        if (groupEl) {
          if (!groupKeyMap.has(groupEl)) groupKeyMap.set(groupEl, nextGroupKey++);
          shape.groupKey = "g" + groupKeyMap.get(groupEl);
        }
        shapes.push(shape);
      }
      return { widthMM, heightMM, unitSource, shapes };
    } finally {
      document.body.removeChild(container);
    }
  }

  const SvgVectorParser = { parse };
  if (typeof window !== "undefined") window.SvgVectorParser = SvgVectorParser;
})(typeof globalThis !== "undefined" ? globalThis : this);
