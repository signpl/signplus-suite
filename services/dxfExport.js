/* ==================================================================== */
/*  DxfExport — 분석된 벡터 도형(mm 좌표)을 레이저 가공용 DXF(R12) 텍스트로  */
/*  변환한다. 외부 라이브러리 없이 DXF 텍스트 포맷을 직접 생성한다.          */
/*  POLYLINE/VERTEX(R12부터 지원되는 가장 호환성 높은 폴리라인 엔티티)만     */
/*  사용해 대부분의 레이저/CAM 소프트웨어에서 열 수 있게 한다.               */
/* ==================================================================== */
"use strict";

function line(code, value) {
  return `${code}\n${value}\n`;
}

// shapes: [{ subpaths: [{ points:[[x,y]mm...], closed }] }], heightMM: 페이지 높이(y 반전용)
function buildDxf(shapes, heightMM) {
  let out = "";
  out += line(0, "SECTION");
  out += line(2, "HEADER");
  out += line(9, "$ACADVER");
  out += line(1, "AC1009");
  out += line(9, "$INSUNITS");
  out += line(70, 4); // 4 = Millimeters
  out += line(0, "ENDSEC");

  out += line(0, "SECTION");
  out += line(2, "ENTITIES");

  const h = Number(heightMM) || 0;
  for (const shape of shapes || []) {
    for (const sp of shape.subpaths || []) {
      const pts = sp.points || [];
      if (pts.length < 2) continue;
      out += line(0, "POLYLINE");
      out += line(8, "0");
      out += line(66, 1);
      out += line(70, sp.closed ? 1 : 0);
      for (const [x, y] of pts) {
        out += line(0, "VERTEX");
        out += line(8, "0");
        out += line(10, x.toFixed(4));
        out += line(20, (h - y).toFixed(4)); // DXF는 y-up, 내부 데이터는 y-down이라 반전
      }
      out += line(0, "SEQEND");
    }
  }

  out += line(0, "ENDSEC");
  out += line(0, "EOF");
  return out;
}

module.exports = { buildDxf };
