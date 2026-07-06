/* ==================================================================== */
/*  PdfVectorParser — PDF / AI(Illustrator, PDF 호환 저장) 파일에서 벡터    */
/*  Path(m/l/c/v/y/re)를 추출해 VectorGeometry가 이해하는 정규화된 도형     */
/*  목록으로 변환한다. main.js(Node 전용, zlib/Buffer 사용)에서만 쓰인다.    */
/*                                                                        */
/*  주의: 이 파서는 "Version 1" 기반 구현이다. 실제 PDF 파일 구조(xref/     */
/*  object stream) 전체를 파싱하지 않고, obj...stream...endstream 블록을   */
/*  직접 스캔해 콘텐츠 스트림만 뽑아 그래픽 연산자(q/Q/cm/m/l/c/v/y/re/     */
/*  파인팅 연산자)를 해석한다. 텍스트(Tj 등)는 처리하지 않으므로, 글자가     */
/*  아직 아웃라인(Path)으로 변환되지 않은 PDF/AI는 인식되지 않는다 —        */
/*  간판 도면은 통상 출력 전 텍스트를 윤곽선으로 변환하므로 실무 워크플로우   */
/*  기준으로는 충분하다(추후 개선 예정).                                    */
/* ==================================================================== */
"use strict";
const zlib = require("zlib");

const PT_TO_MM = 25.4 / 72;

function identity() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
function multiply(A, B) {
  return {
    a: A.a * B.a + A.b * B.c,
    b: A.a * B.b + A.b * B.d,
    c: A.c * B.a + A.d * B.c,
    d: A.c * B.b + A.d * B.d,
    e: A.e * B.a + A.f * B.c + B.e,
    f: A.e * B.b + A.f * B.d + B.f,
  };
}
function apply(m, x, y) {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

function flattenCubic(p0, p1, p2, p3, segments) {
  const pts = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    pts.push([x, y]);
  }
  return pts;
}

function bboxOfPts(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
function unionBboxPts(a, b) {
  if (!a) return b;
  if (!b) return a;
  const minX = Math.min(a.minX, b.minX), minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.maxX, b.maxX), maxY = Math.max(a.maxY, b.maxY);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
function shapeBboxPts(shape) {
  let b = null;
  for (const sp of shape.subpaths) b = unionBboxPts(b, bboxOfPts(sp.points));
  return b || { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
}

function dictSaysFlate(dictText) {
  return /\/Filter\s*(\[[^\]]*\]|\/[A-Za-z0-9]+)/.test(dictText) && /FlateDecode/.test(dictText);
}
function dictSaysSkip(dictText) {
  return /\/(Type|Subtype)\s*\/?\s*(ObjStm|XRef|Image|Metadata|Type1C|CIDFontType0C|OpenType|TrueType|Type0)\b/.test(dictText)
    || /\/Subtype\s*\/Image/.test(dictText);
}

// 콘텐츠 스트림 하나(텍스트)에서 그래픽 연산자를 해석해 shapesOut 배열에 도형을 채워 넣는다.
// qIdState: { next } — q/Q 중첩 구간에 전역 고유 id를 매기기 위한 카운터(스트림 여러 개에 걸쳐 공유).
// 각 도형에는 flush 시점에 열려있던 q 스택(qPath, 안쪽→바깥쪽)을 함께 기록해두고, 파일 전체를 다
// 읽은 뒤(parsePdfVectors) 그 q 구간들의 "최종" 크기를 비교해 같은 글자에 속하는 도형인지(=SVG의
// <g> 구조와 같은 역할) 판정한다(assignPdfGroupKeys).
function extractShapesFromContent(content, shapesOut, qIdState) {
  // 텍스트 표시 블록(BT..ET)은 문자열 리터럴을 포함해 토크나이저를 오염시킬 수 있고, 아웃라인화된
  // Path와 무관하므로 통째로 제거한다.
  const stripped = content.replace(/BT[\s\S]*?ET/g, " ");
  const tokenRe = /(-?\d*\.\d+(?:[eE][-+]?\d+)?|-?\d+(?:[eE][-+]?\d+)?)|([A-Za-z]+\*?)/g;

  let ctm = identity();
  const ctmStack = [];
  const qStack = [];
  let operands = [];
  let currentSubpaths = [];
  let currentSubpath = null;
  let segCount = 0;

  const pushCurrentSubpath = () => {
    if (currentSubpath && currentSubpath.points.length) currentSubpaths.push(currentSubpath);
    currentSubpath = null;
  };
  const flushShape = () => {
    pushCurrentSubpath();
    if (currentSubpaths.length) {
      shapesOut.push({
        subpaths: currentSubpaths.map((sp) => ({ points: sp.points, closed: !!sp.closed })),
        segmentCount: segCount,
        qPath: qStack.map((f) => f.id),
      });
    }
    currentSubpaths = [];
    segCount = 0;
  };
  const discardPath = () => {
    currentSubpaths = [];
    currentSubpath = null;
    segCount = 0;
  };

  let match;
  while ((match = tokenRe.exec(stripped))) {
    if (match[1] !== undefined) {
      operands.push(parseFloat(match[1]));
      continue;
    }
    const op = match[2];
    const nums = operands;
    switch (op) {
      case "q":
        ctmStack.push(ctm);
        qStack.push({ id: qIdState.next++ });
        break;
      case "Q":
        if (ctmStack.length) ctm = ctmStack.pop();
        if (qStack.length) qStack.pop();
        break;
      case "cm": {
        const n = nums.slice(-6);
        if (n.length === 6) ctm = multiply({ a: n[0], b: n[1], c: n[2], d: n[3], e: n[4], f: n[5] }, ctm);
        break;
      }
      case "m": {
        const n = nums.slice(-2);
        if (n.length === 2) {
          pushCurrentSubpath();
          const p = apply(ctm, n[0], n[1]);
          currentSubpath = { points: [p], closed: false };
          segCount++;
        }
        break;
      }
      case "l": {
        const n = nums.slice(-2);
        if (n.length === 2 && currentSubpath) {
          currentSubpath.points.push(apply(ctm, n[0], n[1]));
          segCount++;
        }
        break;
      }
      case "c": {
        const n = nums.slice(-6);
        if (n.length === 6 && currentSubpath) {
          const p0 = currentSubpath.points[currentSubpath.points.length - 1];
          const p1 = apply(ctm, n[0], n[1]);
          const p2 = apply(ctm, n[2], n[3]);
          const p3 = apply(ctm, n[4], n[5]);
          currentSubpath.points.push(...flattenCubic(p0, p1, p2, p3, 12));
          segCount++;
        }
        break;
      }
      case "v": {
        const n = nums.slice(-4);
        if (n.length === 4 && currentSubpath) {
          const p0 = currentSubpath.points[currentSubpath.points.length - 1];
          const p2 = apply(ctm, n[0], n[1]);
          const p3 = apply(ctm, n[2], n[3]);
          currentSubpath.points.push(...flattenCubic(p0, p0, p2, p3, 12));
          segCount++;
        }
        break;
      }
      case "y": {
        const n = nums.slice(-4);
        if (n.length === 4 && currentSubpath) {
          const p0 = currentSubpath.points[currentSubpath.points.length - 1];
          const p1 = apply(ctm, n[0], n[1]);
          const p3 = apply(ctm, n[2], n[3]);
          currentSubpath.points.push(...flattenCubic(p0, p1, p3, p3, 12));
          segCount++;
        }
        break;
      }
      case "re": {
        const n = nums.slice(-4);
        if (n.length === 4) {
          pushCurrentSubpath();
          const [x, y, w, hh] = n;
          const pts = [apply(ctm, x, y), apply(ctm, x + w, y), apply(ctm, x + w, y + hh), apply(ctm, x, y + hh)];
          currentSubpaths.push({ points: pts, closed: true });
          segCount++;
        }
        break;
      }
      case "h":
        if (currentSubpath) currentSubpath.closed = true;
        pushCurrentSubpath();
        break;
      case "S": case "s": case "f": case "F": case "f*": case "B": case "B*": case "b": case "b*":
        flushShape();
        break;
      case "n":
        discardPath();
        break;
      default:
        break; // W/W*/색상/텍스트/그래픽 상태 연산자 — Path 추출과 무관, operand만 비운다
    }
    operands = [];
  }
}

// 도형들의 qPath(flush 시점에 열려있던 q 스택 전체, 바깥쪽→안쪽 순서)를 이용해 "같은 글자"에
// 속하는 도형끼리 groupKey를 매긴다 — SvgVectorParser의 <g> 조상 체인 판정과 같은 원리다.
// 가장 안쪽(직계) q만 보지 않고, 그 도형에 열려있던 q 스택을 안쪽에서 바깥쪽으로 훑어가며
// 전체 도면의 70% 미만인 동안 계속 확장해 그중 가장 바깥쪽 q를 "글자 그룹"으로 본다. q...cm...
// (여러 획)...Q로 한 글자씩 묶어 그리는 것이 실제 도면(특히 초성/중성/종성이 개별 도형인 한글
// 채널 도면)에서 흔한 패턴이지만, "글자 그룹 > 획 서브그룹"처럼 q가 한 단계 더 중첩되어 있으면
// 안쪽 q만 봐서는 획 단위로만 쪼개져 정작 글자 단위인 바깥쪽 q를 놓친다 — 그래서 qPath 전체를
// 훑는다. 어떤 q 구간이 전체 도면의 70% 이상을 차지하면(=페이지/레이어 전체를 감싸는 q) 그
// 지점에서 확장을 멈춘다 — 여러 글자를 한꺼번에 묶어버리는 것이므로 신호로 쓰지 않는다.
function assignPdfGroupKeys(shapes) {
  const shapeBoxes = shapes.map(shapeBboxPts);
  let overall = null;
  for (const b of shapeBoxes) overall = unionBboxPts(overall, b);

  // qPath에 등장하는 모든 q id(안쪽/바깥쪽 구분 없이)에 대해, 그 q가 열려있는 동안 flush된
  // 모든 도형의 bbox 합집합을 구해둔다 — 이전에는 "가장 안쪽" q만 봤기 때문에, 바깥쪽(글자
  // 단위) q는 그 q 구간 안에 항상 더 안쪽 q가 열려 있는 한 이 집계에 전혀 등장하지 못했다.
  const qBboxById = new Map();
  shapes.forEach((shape, i) => {
    for (const qid of shape.qPath || []) {
      qBboxById.set(qid, unionBboxPts(qBboxById.get(qid), shapeBoxes[i]));
    }
  });
  const isWholePageBbox = (b) => !!overall && overall.width > 0 && overall.height > 0
    && b.width >= overall.width * 0.7 && b.height >= overall.height * 0.7;

  for (let i = 0; i < shapes.length; i++) {
    const path = shapes[i].qPath || [];
    let chosen = null;
    for (let d = path.length - 1; d >= 0; d--) {
      const qBbox = qBboxById.get(path[d]);
      if (!qBbox || isWholePageBbox(qBbox)) break;
      chosen = path[d];
    }
    if (chosen != null) shapes[i].groupKey = "q" + chosen;
    delete shapes[i].qPath;
  }
}

function findMediaBoxPt(text) {
  const m = /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/.exec(text);
  if (!m) return null;
  const x0 = parseFloat(m[1]), y0 = parseFloat(m[2]), x1 = parseFloat(m[3]), y1 = parseFloat(m[4]);
  return { widthPt: Math.abs(x1 - x0), heightPt: Math.abs(y1 - y0) };
}

// PDF/AI 원본 Buffer → { widthMM, heightMM, shapes:[{subpaths:[{points:[[x,y]mm...],closed}], segmentCount}] }
function parsePdfVectors(buffer) {
  const text = buffer.toString("latin1");
  const media = findMediaBoxPt(text) || { widthPt: 0, heightPt: 0 };

  const shapesPt = [];
  const qIdState = { next: 1 };
  const streamRe = /\d+\s+\d+\s+obj([\s\S]*?)stream\r?\n([\s\S]*?)[\r\n]+endstream/g;
  let m;
  while ((m = streamRe.exec(text))) {
    const dictText = m[1];
    const rawStreamStr = m[2];
    if (dictSaysSkip(dictText)) continue;
    let content = null;
    if (dictSaysFlate(dictText)) {
      const buf = Buffer.from(rawStreamStr, "latin1");
      try {
        content = zlib.inflateSync(buf).toString("latin1");
      } catch (e) {
        try {
          content = zlib.inflateSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString("latin1");
        } catch (e2) {
          continue;
        }
      }
    } else if (!/\/Filter/.test(dictText)) {
      content = rawStreamStr;
    }
    if (!content) continue;
    try {
      extractShapesFromContent(content, shapesPt, qIdState);
    } catch (e) {
      // 개별 스트림 해석 실패는 전체 가져오기를 막지 않고 건너뛴다
    }
  }
  assignPdfGroupKeys(shapesPt);

  // PDF 좌표계는 y-up(원점 좌하단)이라, SVG와 같은 y-down(원점 좌상단) 좌표계로 뒤집어 두 파서의
  // 출력 형식을 통일한다. 페이지 높이를 모르면(Media Box 없음) 뒤집지 않는다.
  const heightPt = media.heightPt || 0;
  const shapes = shapesPt.map((shape) => ({
    segmentCount: shape.segmentCount,
    groupKey: shape.groupKey,
    subpaths: shape.subpaths.map((sp) => ({
      closed: sp.closed,
      points: sp.points.map(([x, y]) => [x * PT_TO_MM, (heightPt ? heightPt - y : y) * PT_TO_MM]),
    })),
  }));

  return {
    widthMM: media.widthPt * PT_TO_MM,
    heightMM: media.heightPt * PT_TO_MM,
    unitSource: media.widthPt && media.heightPt ? "declared" : "assumed",
    shapes,
  };
}

module.exports = { parsePdfVectors };
