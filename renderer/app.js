"use strict";
/* ==================================================================== */
/*  Signplus Suite v2  —  순수 JS (Babel 런타임 변환 없음)                  */
/* ==================================================================== */
const { useState, useEffect, useMemo, useRef } = React;
const _h = React.createElement;
// 배열로 넘긴 자식 중 key가 없는 요소에 자동으로 key를 부여하는 래퍼.
// 인라인 [아이콘, 텍스트] 패턴 등에서 나오는 key 경고를 원천 차단한다.
function h(type, props, children) {
  if (Array.isArray(children)) {
    const kids = children.map((c, i) => {
      if (c && typeof c === "object" && c.$$typeof && c.key == null) {
        return React.cloneElement(c, { key: "k" + i });
      }
      return c;
    });
    return _h(type, props, kids);
  }
  if (arguments.length > 3) {
    return _h.apply(null, arguments);
  }
  return _h(type, props, children);
}

/* ------------------------------------------------------------------ */
/*  테마 (라이트/다크 토글)                                              */
/* ------------------------------------------------------------------ */
const THEMES = {
  light: {
    bg: "#F5F5F7",
    surface: "#FFFFFF",
    surface2: "#FAFAFB",
    ink: "#1D1D1F",
    muted: "#86868B",
    divider: "#E3E3E6",
    accent: "#FF6B35",
    accentSoft: "#FFF1E8",
    green: "#2FA84F",
    greenSoft: "#E9F7ED",
    blue: "#0071E3",
    blueSoft: "#EAF3FE",
    purple: "#AF52DE",
    red: "#E0453C",
    inkPanel: "#1D1D1F",
    inkPanelText: "#E5E5E7",
    inkPanelMuted: "#C7C7CC",
    inkPanelBorder: "#48484A",
  },
  dark: {
    bg: "#0E0E10",
    surface: "#1A1A1D",
    surface2: "#212125",
    ink: "#F5F5F7",
    muted: "#8E8E93",
    divider: "#2E2E33",
    accent: "#FF7A47",
    accentSoft: "#3A2418",
    green: "#32D74B",
    greenSoft: "#16301C",
    blue: "#0A84FF",
    blueSoft: "#15243A",
    purple: "#BF5AF2",
    red: "#FF453A",
    inkPanel: "#000000",
    inkPanelText: "#E5E5E7",
    inkPanelMuted: "#98989F",
    inkPanelBorder: "#38383C",
  },
};
const FONT = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif`;
const MONO = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
const APP_VERSION = (typeof window !== "undefined" && (window.__APP_VERSION__ || (window.appInfo && window.appInfo.version))) || "?";

/* ------------------------------------------------------------------ */
/*  유틸                                                                */
/* ------------------------------------------------------------------ */
const won = (n) => (Math.round(n) || 0).toLocaleString("ko-KR") + "원";
const num = (n) => (Math.round(n) || 0).toLocaleString("ko-KR");
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

async function loadKey(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  자재 단가 프리셋 (실무 참고용 기본값 — 앱에서 수정 가능)                  */
/*  단위 단가는 시장 평균대를 반영한 출발점이며 지역/물량에 따라 조정          */
/* ------------------------------------------------------------------ */
/* 단가 기본값: 제일에코 데이터(jeil-presets.js에서 로드). 없으면 빈 배열 */
const MATERIAL_PRESETS = (typeof JEIL_PRESETS !== "undefined" ? JEIL_PRESETS : []);
/* 단가표 카테고리 순서 */
const PRESET_CATS = ["채널", "채널바", "고무스카시", "LED", "현수막", "포마트", "코팅지/원단", "합성지/PVC/베너", "시트출력", "원단출력", "프레임", "에어간판", "어닝", "시공/경비"];

/* ==================================================================== */
/*  아이콘 (인라인 SVG)                                                   */
/* ==================================================================== */
function Svg(props, children) {
  const kids = Array.isArray(children)
    ? children.map((c, i) => (c ? React.cloneElement(c, { key: "s" + i }) : c))
    : children;
  return h(
    "svg",
    {
      width: props.size || 16,
      height: props.size || 16,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    kids
  );
}
const P = (d) => h("path", { d });
const L = (x1, y1, x2, y2) => h("line", { x1, y1, x2, y2 });
const Ico = {
  calc: (p) => Svg(p, [h("rect", { x: 4, y: 2, width: 16, height: 20, rx: 2 }), L(8, 7, 16, 7), h("circle", { cx: 8, cy: 12, r: 0.6, fill: "currentColor" }), h("circle", { cx: 12, cy: 12, r: 0.6, fill: "currentColor" }), h("circle", { cx: 16, cy: 12, r: 0.6, fill: "currentColor" }), h("circle", { cx: 8, cy: 16, r: 0.6, fill: "currentColor" }), h("circle", { cx: 12, cy: 16, r: 0.6, fill: "currentColor" })]),
  file: (p) => Svg(p, [P("M6 3h9l3 3v15a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"), L(8, 10, 16, 10), L(8, 14, 16, 14), L(8, 18, 13, 18)]),
  zap: (p) => Svg(p, [P("M13 2 4 14h6l-1 8 9-12h-6z")]),
  grid: (p) => Svg(p, [h("rect", { x: 3, y: 3, width: 8, height: 8, rx: 2 }), h("rect", { x: 13, y: 3, width: 8, height: 8, rx: 2 }), h("rect", { x: 3, y: 13, width: 8, height: 8, rx: 2 }), h("rect", { x: 13, y: 13, width: 8, height: 8, rx: 2 })]),
  book: (p) => Svg(p, [P("M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"), P("M4 19a2 2 0 012-2h13")]),
  plus: (p) => Svg(p, [L(12, 5, 12, 19), L(5, 12, 19, 12)]),
  trash: (p) => Svg(p, [P("M4 7h16"), P("M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"), P("M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13")]),
  save: (p) => Svg(p, [P("M5 3h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"), P("M8 3v6h6V3"), h("rect", { x: 7, y: 13, width: 10, height: 7 })]),
  download: (p) => Svg(p, [P("M12 3v11"), P("M7 10l5 5 5-5"), P("M5 21h14")]),
  pdf: (p) => Svg(p, [P("M6 3h9l3 3v15a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"), P("M8 13h1.5a1.5 1.5 0 010 3H8zM8 13v5"), P("M13 13v5M13 13h2M13 15.5h1.5"), P("M18 13h-1.5v5")]),
  copy: (p) => Svg(p, [h("rect", { x: 9, y: 9, width: 11, height: 11, rx: 2 }), P("M5 15V5a2 2 0 012-2h9")]),
  left: (p) => Svg(p, [P("M15 6l-6 6 6 6")]),
  right: (p) => Svg(p, [P("M9 6l6 6-6 6")]),
  check: (p) => Svg(p, [P("M5 13l4 4L19 7")]),
  x: (p) => Svg(p, [P("M6 6l12 12M18 6L6 18")]),
  sun: (p) => Svg(p, [h("circle", { cx: 12, cy: 12, r: 4 }), L(12, 2, 12, 4), L(12, 20, 12, 22), L(2, 12, 4, 12), L(20, 12, 22, 12), L(5, 5, 6.5, 6.5), L(17.5, 17.5, 19, 19), L(19, 5, 17.5, 6.5), L(6.5, 17.5, 5, 19)]),
  moon: (p) => Svg(p, [P("M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z")]),
  image: (p) => Svg(p, [h("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }), h("circle", { cx: 8.5, cy: 9.5, r: 1.5 }), P("M21 16l-5-5L5 20")]),
  edit: (p) => Svg(p, [P("M4 20h4l10-10a2 2 0 00-4-4L4 16z")]),
  arrowUp: (p) => Svg(p, [P("M12 19V5M6 11l6-6 6 6")]),
  arrowDown: (p) => Svg(p, [P("M12 5v14M18 13l-6 6-6-6")]),
};

/* ==================================================================== */
/*  공용 UI                                                              */
/* ==================================================================== */
function Card(t, props, children) {
  return h("div", { style: { background: t.surface, borderRadius: 16, border: `1px solid ${t.divider}`, padding: 20, ...(props && props.style) } }, children);
}
function SectionTitle(t, title, sub, right) {
  return h("div", { style: { marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } }, [
    h("div", { key: 1 }, [
      h("div", { key: "a", style: { fontSize: 21, fontWeight: 700, color: t.ink, letterSpacing: -0.3 } }, title),
      sub && h("div", { key: "b", style: { fontSize: 13, color: t.muted, marginTop: 4 } }, sub),
    ]),
    right && h("div", { key: 2 }, right),
  ]);
}
function Field(t, label, control) {
  return h("label", { style: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13 } }, [
    h("span", { key: 1, style: { color: t.muted, fontWeight: 600 } }, label),
    control,
  ]);
}
function inputStyle(t) {
  return { border: `1px solid ${t.divider}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: t.ink, outline: "none", fontFamily: FONT, background: t.surface2, width: "100%" };
}
function TextInput(t, props) {
  return h("input", { ...props, style: { ...inputStyle(t), ...(props && props.style) } });
}
function TextArea(t, props) {
  return h("textarea", { ...props, style: { ...inputStyle(t), resize: "vertical", ...(props && props.style) } });
}
function Sel(t, props, options) {
  return h("select", { ...props, style: { ...inputStyle(t), ...(props && props.style) } }, options.map((o) => h("option", { key: o.value !== undefined ? o.value : o, value: o.value }, o.label !== undefined ? o.label : o)));
}
function Btn(t, props, children) {
  const variant = (props && props.variant) || "primary";
  const base = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, borderRadius: 10, padding: "9px 14px", border: "none", cursor: props && props.disabled ? "not-allowed" : "pointer", opacity: props && props.disabled ? 0.5 : 1, fontFamily: FONT };
  const variants = {
    primary: { background: t.ink, color: t.bg },
    accent: { background: t.accent, color: "#fff" },
    ghost: { background: "transparent", color: t.ink, border: `1px solid ${t.divider}` },
    danger: { background: t.red, color: "#fff" },
    blue: { background: t.blue, color: "#fff" },
  };
  return h("button", { onClick: props && props.onClick, disabled: props && props.disabled, style: { ...base, ...variants[variant], ...(props && props.style) } }, children);
}
function IconBtn(t, icon, onClick, color) {
  return h("button", { onClick, style: { background: "none", border: "none", cursor: "pointer", color: color || t.muted, display: "inline-flex", alignItems: "center", padding: 3, borderRadius: 6 } }, icon({ size: 16 }));
}

/* ==================================================================== */
/*  견적서 PDF용 HTML 생성 (SIGNPLUS 정식 양식 · A4 1장 맞춤)              */
/* ==================================================================== */
/* 견적서 PDF 테마 팔레트 */
const QUOTE_THEMES = {
  classic: { name: "클래식 화이트", titleColor: "#1D1D1F", headBg: "#F3F3F3", headText: "#1D1D1F", tableHeadBg: "#F3F3F3", tableHeadText: "#333333", grandBorder: "#333333", barColor: "#222222", closingColor: "#1D1D1F" },
  navy: { name: "네이비 골드", titleColor: "#0B1F3A", headBg: "#0B1F3A", headText: "#FFFFFF", tableHeadBg: "#EEF1F6", tableHeadText: "#0B1F3A", grandBorder: "#0B1F3A", barColor: "#C9A24B", closingColor: "#0B1F3A" },
  charcoal: { name: "차콜 오렌지", titleColor: "#1D1D1F", headBg: "#1D1D1F", headText: "#FFFFFF", tableHeadBg: "#FFF1E8", tableHeadText: "#1D1D1F", grandBorder: "#1D1D1F", barColor: "#FF6B35", closingColor: "#FF6B35" },
};

function buildQuoteHTML(data) {
  const { company, client, quoteNo, quoteDate, validity, items, subtotal, vat, total, logo, stamp, notes } = data;
  const theme = QUOTE_THEMES[data.theme] || QUOTE_THEMES.classic;

  // 품목이 적으면 빈 행으로 채워 정형 유지, 많으면 빈 행 없이. 최대 12행까지 1장 안전.
  const realItems = items.filter((i) => i.name || i.spec || (Number(i.unitPrice) || 0) * (Number(i.qty) || 0));
  const displayItems = realItems.length ? realItems : items;
  const MIN_ROWS = 6;      // 최소 표시 행(빈 행 포함)
  const MAX_1PAGE = 12;    // 1장에 안전하게 들어가는 최대 행
  const targetRows = Math.min(Math.max(displayItems.length, MIN_ROWS), MAX_1PAGE);

  const bodyRows = displayItems.slice(0, MAX_1PAGE).map((i, idx) => {
    const amt = (Number(i.unitPrice) || 0) * (Number(i.qty) || 0);
    return `<tr>
      <td class="c num">${idx + 1}</td>
      <td class="l">${esc(i.name)}</td>
      <td class="c spec">${esc(i.spec)}</td>
      <td class="c">${num(i.qty)}${i.unit ? " " + esc(i.unit) : ""}</td>
      <td class="r">${amt ? num(i.unitPrice) : "-"}</td>
      <td class="r b">${amt ? num(amt) : "-"}</td>
      <td class="c"></td>
    </tr>`;
  });
  const emptyCount = Math.max(0, targetRows - bodyRows.length);
  for (let k = 0; k < emptyCount; k++) {
    bodyRows.push(`<tr class="empty"><td class="c"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`);
  }
  const rows = bodyRows.join("");

  const noteArr = (notes || "").split("\n").map((s) => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
  const notesHtml = (noteArr.length ? noteArr : ["상기 견적은 부가세 포함 금액입니다."])
    .map((s, i) => `<div class="note-line">${i + 1}. ${esc(s)}</div>`)
    .join("");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:210mm; height:297mm; overflow:hidden; }
    body { font-family:-apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color:#222; padding:14mm 13mm; font-size:10px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

    /* 헤더 */
    .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
    .title-ko { font-size:36px; font-weight:800; letter-spacing:12px; line-height:1; color:${theme.titleColor}; }
    .title-en { font-size:12px; letter-spacing:7px; color:#999; margin-top:7px; }
    .title-bar { width:40px; height:3px; background:${theme.barColor}; margin-top:11px; }
    .supplier { text-align:right; font-size:10.5px; line-height:1.7; color:#333; min-width:300px; }
    .supplier .logo-row { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-bottom:8px; }
    .supplier .logo-row img { max-height:36px; max-width:150px; object-fit:contain; }
    .supplier .brand-txt { font-size:20px; font-weight:800; letter-spacing:1px; }

    /* 메타(좌) + 합계(우) */
    .mid { display:flex; justify-content:space-between; gap:20px; margin-bottom:16px; }
    .meta-tbl { border-collapse:collapse; }
    .meta-tbl td { padding:4px 0; font-size:10.5px; vertical-align:middle; }
    .meta-tbl .k { color:#333; font-weight:700; letter-spacing:1px; width:64px; padding-right:14px; white-space:nowrap; }
    .meta-tbl .v { color:#111; white-space:nowrap; }
    .summary { width:330px; border:1px solid #DDD; align-self:flex-start; }
    .summary .row { display:flex; justify-content:space-between; align-items:center; padding:7px 14px; }
    .summary .row.head { background:${theme.headBg}; padding:9px 14px; }
    .summary .row + .row { border-top:1px solid #EEE; }
    .summary .lbl { font-size:11px; font-weight:600; letter-spacing:0.5px; color:#333; white-space:nowrap; }
    .summary .head .lbl { font-weight:700; color:${theme.headText}; }
    .summary .head .amt { font-size:19px; font-weight:800; color:${theme.headText}; }
    .summary .amt { font-size:12.5px; font-weight:600; }

    /* 품목 테이블 */
    table.items { width:100%; border-collapse:collapse; }
    table.items th { background:${theme.tableHeadBg}; border-top:2px solid ${theme.titleColor}; border-bottom:1px solid #CCC; padding:8px 5px; font-size:10px; font-weight:700; color:${theme.tableHeadText}; }
    table.items td { border-bottom:1px solid #EEE; padding:7px 7px; font-size:10px; }
    table.items tr.empty td { height:26px; }
    table.items .l { text-align:left; }
    table.items .c { text-align:center; }
    table.items .r { text-align:right; }
    table.items .b { font-weight:600; }
    table.items .num { color:#666; }
    table.items .spec { color:#555; font-size:9.5px; line-height:1.4; white-space:pre-line; }

    /* 합계행 */
    .foot-tbl { width:100%; border-collapse:collapse; margin-bottom:20px; }
    .foot-tbl td { padding:7px 7px; font-size:10.5px; }
    .foot-tbl .lbl { text-align:right; letter-spacing:1px; color:#333; }
    .foot-tbl .amt { text-align:right; width:130px; font-weight:600; }
    .foot-tbl .pad { width:80px; }
    .foot-tbl .grand td { border-top:2px solid ${theme.grandBorder}; font-weight:800; font-size:12px; }
    .foot-tbl .grand .amt { font-size:14px; color:${theme.titleColor}; }

    /* 하단 */
    .bottom { display:flex; justify-content:space-between; gap:24px; }
    .notes { flex:1; }
    .notes .hh { font-size:11px; font-weight:700; border-left:3px solid ${theme.barColor}; padding-left:7px; margin-bottom:9px; }
    .note-line { font-size:10px; color:#444; line-height:1.85; }
    .sign-box { width:280px; }
    .sign-tbl { width:100%; border-collapse:collapse; }
    .sign-tbl th { border:1px solid #CCC; background:${theme.tableHeadBg}; padding:7px; font-size:10px; font-weight:700; width:50%; color:${theme.tableHeadText}; }
    .sign-tbl td { border:1px solid #CCC; height:66px; position:relative; }
    .sign-tbl .stamp { position:absolute; right:50%; top:50%; transform:translate(50%,-50%); max-height:56px; max-width:74px; opacity:0.92; }
    .sign-tbl .writer { text-align:center; font-size:11px; padding-top:24px; font-weight:600; }

    .closing { text-align:center; margin-top:24px; }
    .closing .msg { font-size:10.5px; color:#555; }
    .closing .nm { font-size:13px; font-weight:800; letter-spacing:2px; margin-top:6px; color:${theme.closingColor}; }
  </style></head><body>

    <div class="top">
      <div>
        <div class="title-ko">견적서</div>
        <div class="title-en">QUOTATION</div>
        <div class="title-bar"></div>
      </div>
      <div class="supplier">
        <div class="logo-row">
          ${logo ? `<img src="${logo}"/>` : `<span class="brand-txt">SIGNPLUS<span style="color:#FF6B35;">+</span></span>`}
        </div>
        ${esc(company.addr)}<br>
        TEL. ${esc(company.tel)}${company.fax ? "&nbsp;&nbsp;FAX. " + esc(company.fax) : ""}<br>
        ${company.email ? "E-mail. " + esc(company.email) + "<br>" : ""}
        사업자등록번호 ${esc(company.biznum)}<br>
        대표자 ${esc(company.ceo)}
      </div>
    </div>

    <div class="mid">
      <table class="meta-tbl"><tbody>
        <tr><td class="k">견적번호</td><td class="v">${esc(quoteNo)}</td></tr>
        <tr><td class="k">견적일자</td><td class="v">${esc(quoteDate)}</td></tr>
        <tr><td class="k">유효기간</td><td class="v">${esc(validity)}</td></tr>
        <tr><td class="k">수 신 처</td><td class="v">${esc(client.name) || "-"} ${client.name ? "귀하" : ""}</td></tr>
        <tr><td class="k">담 당 자</td><td class="v">${esc(client.manager) || "-"}</td></tr>
        <tr><td class="k">연 락 처</td><td class="v">${esc(client.tel) || "-"}</td></tr>
      </tbody></table>

      <div class="summary">
        <div class="row head"><span class="lbl">합계금액 (VAT 포함)</span><span class="amt">₩ ${num(total)}</span></div>
        <div class="row"><span class="lbl">금액 (부가세 별도)</span><span class="amt">₩ ${num(subtotal)}</span></div>
        <div class="row"><span class="lbl">부 가 세 (10%)</span><span class="amt">₩ ${num(vat)}</span></div>
      </div>
    </div>

    <table class="items">
      <thead><tr>
        <th style="width:38px;">No.</th>
        <th>품목명</th>
        <th style="width:150px;">규격 / 사양</th>
        <th style="width:66px;">수량</th>
        <th style="width:100px;">단가</th>
        <th style="width:100px;">금액</th>
        <th style="width:70px;">비고</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="foot-tbl"><tbody>
      <tr><td class="lbl">합 계 (VAT 별도)</td><td class="amt">${num(subtotal)}</td><td class="pad"></td></tr>
      <tr><td class="lbl">부 가 세 (10%)</td><td class="amt">${num(vat)}</td><td></td></tr>
      <tr class="grand"><td class="lbl">합 계 금 액 (VAT 포함)</td><td class="amt">₩ ${num(total)}</td><td></td></tr>
    </tbody></table>

    <div class="bottom">
      <div class="notes">
        <div class="hh">기타 안내사항</div>
        ${notesHtml}
      </div>
      <div class="sign-box">
        <table class="sign-tbl">
          <thead><tr><th>작성자</th><th>확인 / 도장</th></tr></thead>
          <tbody><tr>
            <td class="writer">${esc(company.ceo)}</td>
            <td>${stamp ? `<img src="${stamp}" class="stamp"/>` : ""}</td>
          </tr></tbody>
        </table>
      </div>
    </div>

    <div class="closing">
      <div class="msg">견적 요청에 감사드리며, 귀사의 무궁한 발전을 기원합니다.</div>
      <div class="nm">${esc(company.name)}</div>
    </div>

  </body></html>`;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ==================================================================== */
/*  시안 의뢰서 PDF용 HTML 생성 (여러 간판 항목 · 업무지시서 형태)            */
/* ==================================================================== */
function buildBriefHTML(data) {
  const { form: f, signItems, images, createdAt } = data;
  const rows = (signItems || []).map((s, idx) => `
    <tr>
      <td class="c num">${idx + 1}</td>
      <td class="c">${esc(s.signType)}</td>
      <td class="c">${esc(s.width || "-")} × ${esc(s.height || "-")} mm</td>
      <td class="c">${esc(s.location || "-")}</td>
      <td class="c small">${esc(s.dayEffect || "-")}</td>
      <td class="c small">${esc(s.nightEffect || "-")}</td>
    </tr>`).join("");

  const imageBlock = (images && images.length)
    ? `<div class="imgsec"><div class="imgtitle">첨부 이미지 (${images.length}장)</div><div class="imggrid">${images.map((im) => `<img src="${im.data}" />`).join("")}</div></div>`
    : "";

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Malgun Gothic","맑은 고딕",sans-serif; color:#1D1D1F; }
    .mid { width:210mm; min-height:297mm; padding:16mm 15mm; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1D1D1F; padding-bottom:14px; margin-bottom:18px; }
    .head h1 { font-size:26px; margin:0; letter-spacing:2px; }
    .head .sub { font-size:11px; color:#888; letter-spacing:4px; margin-top:3px; }
    .head .meta { text-align:right; font-size:11px; color:#555; line-height:1.6; }
    .head .brand { font-size:15px; font-weight:800; color:#FF6B35; margin-bottom:4px; }
    .section-title { font-size:12px; font-weight:700; color:#FF6B35; letter-spacing:1px; margin:18px 0 8px; }
    .meta-tbl { border-collapse:collapse; width:100%; margin-bottom:6px; }
    .meta-tbl td { padding:4px 0; font-size:11px; }
    .meta-tbl .k { color:#333; font-weight:700; width:80px; white-space:nowrap; }
    table.items { width:100%; border-collapse:collapse; margin-top:6px; }
    table.items th { background:#F3F3F3; font-size:10.5px; padding:8px 6px; border:1px solid #DDD; }
    table.items td { font-size:10.5px; padding:7px 6px; border:1px solid #EEE; text-align:center; }
    table.items td.small { font-size:9.5px; text-align:left; }
    .swatch { display:inline-block; width:14px; height:14px; border-radius:3px; vertical-align:middle; margin-right:6px; border:1px solid #ccc; }
    .note { font-size:10.5px; color:#333; white-space:pre-wrap; line-height:1.7; background:#FAFAFA; border:1px solid #EEE; border-radius:6px; padding:10px 12px; }
    .imgsec { margin-top:14px; }
    .imgtitle { font-size:11px; font-weight:700; color:#555; margin-bottom:8px; }
    .imggrid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    .imggrid img { width:100%; height:38mm; object-fit:cover; border-radius:6px; border:1px solid #DDD; }
    .footer { margin-top:20px; text-align:center; font-size:10px; color:#999; }
  </style></head>
  <body><div class="mid">
    <div class="head">
      <div><div class="brand">SIGNPLUS+</div><h1>시안 제작 의뢰서</h1><div class="sub">DESIGN BRIEF ORDER</div></div>
      <div class="meta">작성일 : ${esc(createdAt || todayISO())}<br/>거래처 : ${esc(f.client || "-")}<br/>업종 : ${esc(f.industry || "-")}</div>
    </div>

    <div class="section-title">현장 · 설치 정보</div>
    <table class="meta-tbl"><tr><td class="k">건물/설치위치</td><td>${esc(f.location || "-")}</td></tr></table>

    <div class="section-title">디자인 방향</div>
    <table class="meta-tbl">
      <tr><td class="k">브랜드 컬러</td><td><span class="swatch" style="background:${esc(f.brandColor)}"></span>${esc(f.brandColor)}</td></tr>
      <tr><td class="k">폰트 느낌</td><td>${esc(f.fontMood)}</td></tr>
    </table>

    <div class="section-title">간판 제작 항목 (총 ${(signItems || []).length}건)</div>
    <table class="items">
      <thead><tr><th style="width:26px">No</th><th>간판 종류</th><th style="width:100px">사이즈</th><th>설치 위치</th><th>주간 효과</th><th>야간 효과</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" style="color:#999;padding:16px;">등록된 간판 항목이 없습니다.</td></tr>`}</tbody>
    </table>

    <div class="section-title">시공 참고사항</div>
    <div class="note">${esc(f.installNote || "특이사항 없음")}</div>

    ${imageBlock}

    <div class="footer">본 의뢰서는 싸인플러스(Signplus+) 상담 내용을 바탕으로 자동 생성되었습니다.</div>
  </div></body></html>`;
}

/* ==================================================================== */
/*  1. 견적 계산기                                                        */
/* ==================================================================== */
function QuoteCalculator(props) {
  const t = props.theme;
  const presets = props.presets;
  const company = props.company;
  const [client, setClient] = useState({ name: "", manager: "", tel: "" });
  const [projectName, setProjectName] = useState("");
  const [quoteNo, setQuoteNo] = useState("");
  const [quoteDate, setQuoteDate] = useState(todayISO());
  const [validity, setValidity] = useState("견적일로부터 30일");
  const [note, setNote] = useState("상기 견적은 부가세 포함 금액입니다.\n견적 유효기간 이후 변동될 수 있습니다.\n발주 후 제작이 진행되며, 제작 기간은 별도 협의입니다.\n기타 문의사항은 상단 연락처로 연락 부탁드립니다.");
  const [items, setItems] = useState([{ id: uid(), name: "", spec: "", unit: "식", unitPrice: 0, qty: 1, marginOverride: null }]);
  const [logo, setLogo] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [saved, setSaved] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [pCat, setPCat] = useState("전체");
  const [pSearch, setPSearch] = useState("");
  const [expandedSubs, setExpandedSubs] = useState({}); // { "cat|sub": true }
  const [savedSearch, setSavedSearch] = useState("");
  const [marginRate, setMarginRate] = useState(0); // 0~1000 (%)
  const [pdfTheme, setPdfTheme] = useState("classic");
  const [quoteStatus, setQuoteStatus] = useState("작성중"); // 작성중 / 발주 / 진행중 / 완료
  const [editingId, setEditingId] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState("jeil"); // 거래처 ID
  const [vendorPresets, setVendorPresets] = useState([]); // 현재 선택 거래처 단가

  // 견적번호 자동 생성: SP-YYYY-NNNN (연도별 순번)
  const genQuoteNo = (existing) => {
    const year = new Date().getFullYear();
    const prefix = `SP-${year}-`;
    const nums = (existing || []).map((r) => r.quoteNo).filter((q) => q && q.startsWith(prefix)).map((q) => parseInt(q.slice(prefix.length), 10) || 0);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + String(next).padStart(4, "0");
  };

  useEffect(() => {
    loadKey("sp2-quotes", []).then((v) => { setSaved(v); setLoaded(true); setQuoteNo(genQuoteNo(v)); });
    loadKey("sp2-brand", {}).then((b) => { if (b.logo) setLogo(b.logo); if (b.stamp) setStamp(b.stamp); });
    loadKey("sp2-pdf-theme", "classic").then(setPdfTheme);
  }, []);
  useEffect(() => { setVendorPresets(presets); }, [presets]); // 기본 거래처 단가 동기화
  const changePdfTheme = (v) => { setPdfTheme(v); saveKey("sp2-pdf-theme", v); };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), m && m.includes("실패") ? 6000 : 2200); };
  const setC = (k) => (e) => setClient((p) => ({ ...p, [k]: e.target.value }));
  const addItem = () => setItems((p) => [...p, { id: uid(), name: "", spec: "", unit: "식", unitPrice: 0, qty: 1, marginOverride: null }]);
  const addPreset = (pr) => setItems((p) => [...p.filter((i) => i.name || i.unitPrice), { id: uid(), name: pr.name, spec: pr.spec || "", unit: pr.unit, unitPrice: pr.price, qty: 1, marginOverride: null }]);
  const removeItem = (id) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id, f, v) => setItems((p) => p.map((i) => (i.id === id ? { ...i, [f]: v } : i)));

  // 원가(입력값) 기준으로 마진율을 적용한 판매단가 계산 — 개별 마진율(marginOverride)이 설정된 품목은 전체 마진율 대신 그 값을 사용
  const effectiveMargin = (i) => (i.marginOverride === null || i.marginOverride === undefined || i.marginOverride === "" ? (Number(marginRate) || 0) : (Number(i.marginOverride) || 0));
  const sellPrice = (i) => Math.round((Number(i.unitPrice) || 0) * (1 + effectiveMargin(i) / 100));
  const lineTotal = (i) => sellPrice(i) * (Number(i.qty) || 0);
  const baseLineTotal = (i) => (Number(i.unitPrice) || 0) * (Number(i.qty) || 0);
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;
  const baseSubtotal = items.reduce((s, i) => s + baseLineTotal(i), 0);
  const marginAmount = subtotal - baseSubtotal;

  const pickLogo = async () => { const d = await window.api.pickImage(); if (d) { setLogo(d); const b = await loadKey("sp2-brand", {}); await saveKey("sp2-brand", { ...b, logo: d }); flash("로고 저장됨"); } };
  const pickStamp = async () => { const d = await window.api.pickImage(); if (d) { setStamp(d); const b = await loadKey("sp2-brand", {}); await saveKey("sp2-brand", { ...b, stamp: d }); flash("도장 저장됨"); } };
  const clearLogo = async () => { setLogo(null); const b = await loadKey("sp2-brand", {}); delete b.logo; await saveKey("sp2-brand", b); };
  const clearStamp = async () => { setStamp(null); const b = await loadKey("sp2-brand", {}); delete b.stamp; await saveKey("sp2-brand", b); };

  const handleSave = async () => {
    const rec = { id: editingId || uid(), quoteNo, client, projectName, quoteDate, validity, note, items, marginRate, subtotal, vat, total, baseSubtotal, marginAmount, status: quoteStatus, vendorId: selectedVendor, savedAt: new Date().toISOString() };
    const next = editingId ? saved.map((r) => (r.id === editingId ? rec : r)) : [rec, ...saved].slice(0, 200);
    await saveKey("sp2-quotes", next); setSaved(next); flash("견적 저장 완료");
    if (!editingId) { setEditingId(rec.id); setQuoteNo(genQuoteNo(next)); }
  };
  const handleLoad = (r) => {
    setClient(r.client || { name: r.clientName || "", manager: "", tel: "" });
    setProjectName(r.projectName); setQuoteNo(r.quoteNo || genQuoteNo(saved)); setQuoteDate(r.quoteDate || todayISO());
    setValidity(r.validity || ""); setNote(r.note || ""); setItems(r.items); setMarginRate(Number(r.marginRate) || 0);
    setQuoteStatus(r.status || "작성중"); setSelectedVendor(r.vendorId || "jeil"); setEditingId(r.id); flash("불러왔습니다");
  };
  const handleDelete = async (id) => { const next = saved.filter((r) => r.id !== id); await saveKey("sp2-quotes", next); setSaved(next); if (editingId === id) setEditingId(null); };

  // 견적서(PDF·엑셀)에는 원가가 아닌 마진 반영된 판매단가로 출력
  const exportItems = () => items.map((i) => ({ ...i, unitPrice: sellPrice(i) }));
  const handleExcel = async () => {
    const quote = { company, client, quoteNo, quoteDate, validity, items: exportItems(), subtotal, vat, total, notes: note, theme: pdfTheme };
    try {
      const res = await window.api.exportExcel(quote, (client.name || projectName || "견적서") + "_" + quoteNo);
      if (res && res.ok) flash("엑셀 저장 완료");
      else if (res && res.canceled) { /* 사용자 취소 - 알림 없음 */ }
      else flash("엑셀 저장 실패: " + ((res && res.error) || "알 수 없는 오류"));
    } catch (err) {
      flash("엑셀 저장 실패: " + (err && err.message ? err.message : String(err)));
    }
  };
  const handlePdf = async () => {
    const html = buildQuoteHTML({ company, client, quoteNo, quoteDate, validity, items: exportItems(), subtotal, vat, total, logo, stamp, notes: note, theme: pdfTheme });
    try {
      const res = await window.api.exportPdf(html, (client.name || projectName || "견적서") + "_" + quoteNo);
      if (res && res.ok) flash("PDF 저장 완료");
      else if (res && res.canceled) { /* 사용자 취소 - 알림 없음 */ }
      else flash("PDF 저장 실패: " + ((res && res.error) || "알 수 없는 오류"));
    } catch (err) {
      flash("PDF 저장 실패: " + (err && err.message ? err.message : String(err)));
    }
  };

  const th = (label, w, align) => h("th", { key: label, style: { padding: "6px 8px", width: w, textAlign: align || "left", color: t.muted, fontSize: 12, fontWeight: 600 } }, label);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, [
    SectionTitle(t, "견적 계산기", "수신처·품목을 입력하면 정식 견적서 PDF(로고·도장 포함)로 출력됩니다.",
      h("div", { style: { display: "flex", gap: 8 } }, [
        Btn(t, { key: 1, variant: "ghost", onClick: () => setPresetOpen((o) => !o) }, [Ico.book({ size: 14 }), " 단가 불러오기"]),
      ])
    ),
    // 프리셋 패널 — 제일에코 단가표에서 골라 담기 (카테고리 → 중분류 아코디언)
    presetOpen && Card(t, { key: "preset", style: { padding: 14 } }, (() => {
      const cats = PRESET_CATS;
      const isSearching = !!pSearch;
      const q = pSearch.toLowerCase();
      const matchesSearch = (pr) => !isSearching || ((pr.name || "") + (pr.sub || "") + (pr.spec || "") + (pr.memo || "")).toLowerCase().includes(q);

      const toggleSub = (key) => setExpandedSubs((p) => ({ ...p, [key]: !p[key] }));

      const itemBtn = (pr) => h("button", { key: pr.id, onClick: () => { addPreset(pr); flash(`'${pr.name}' 추가됨`); }, style: { textAlign: "left", background: t.surface, border: `1px solid ${t.divider}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: t.ink, width: "100%" } }, [
        h("div", { key: 1, style: { fontSize: 12, fontWeight: 600, marginBottom: 2, lineHeight: 1.3 } }, pr.name),
        h("div", { key: 2, style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" } }, [
          h("span", { key: 1, style: { fontSize: 11.5, color: t.accent, fontWeight: 700, fontFamily: MONO } }, `${won(pr.price)}/${pr.unit}`),
          pr.spec && h("span", { key: 2, style: { fontSize: 10.5, color: t.muted, fontFamily: MONO } }, pr.spec),
        ]),
        pr.memo && h("div", { key: 3, style: { fontSize: 10, color: t.muted, marginTop: 2 } }, pr.memo),
      ]);

      let body;
      if (isSearching) {
        // 검색 중엔 아코디언 무시하고 평면 결과
        const list = vendorPresets.filter(matchesSearch);
        body = h("div", { key: "flat", style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, maxHeight: 400, overflowY: "auto", paddingRight: 4 } },
          list.length === 0
            ? [h("div", { key: "e", style: { color: t.muted, fontSize: 13, padding: "20px 0", gridColumn: "1/-1", textAlign: "center" } }, "검색 결과가 없습니다.")]
            : list.map(itemBtn)
        );
      } else {
        // 아코디언: 카테고리 → 중분류 → 품목
        const activeCats = pCat === "전체" ? cats : [pCat];
        body = h("div", { key: "acc", style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 440, overflowY: "auto", paddingRight: 4 } },
          activeCats.map((cat) => {
            const catItems = vendorPresets.filter((p) => (p.cat || "") === cat);
            if (catItems.length === 0) return null;
            const subs = [...new Set(catItems.map((p) => p.sub || "기타"))];
            return h("div", { key: cat, style: { border: `1px solid ${t.divider}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 } }, [
              h("div", { key: 0, style: { padding: "9px 12px", background: t.surface2, fontSize: 12.5, fontWeight: 700, color: t.ink, display: "flex", justifyContent: "space-between" } }, [
                h("span", { key: 1 }, cat),
                h("span", { key: 2, style: { color: t.muted, fontWeight: 500 } }, `${catItems.length}개 품목 · ${subs.length}개 중분류`),
              ]),
              h("div", { key: 1, style: { padding: 8, display: "flex", flexDirection: "column", gap: 6 } },
                subs.map((sub) => {
                  const subItems = catItems.filter((p) => (p.sub || "기타") === sub);
                  const key = cat + "|" + sub;
                  const open = !!expandedSubs[key];
                  return h("div", { key: sub, style: { flexShrink: 0 } }, [
                    h("button", { key: 0, onClick: () => toggleSub(key), style: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: open ? t.accentSoft : "transparent", border: `1px solid ${open ? t.accent : t.divider}`, borderRadius: 8, cursor: "pointer", fontFamily: FONT } }, [
                      h("span", { key: 1, style: { fontSize: 12, fontWeight: 600, color: t.ink } }, `${open ? "▾" : "▸"} ${sub}`),
                      h("span", { key: 2, style: { fontSize: 11, color: t.muted } }, `${subItems.length}개`),
                    ]),
                    open && h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 6, marginTop: 6, paddingLeft: 4 } }, subItems.map(itemBtn)),
                  ]);
                })
              ),
            ]);
          })
        );
      }

      return [
        h("div", { key: 0, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 } }, [
          h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } }, [
            h("span", { key: 1, style: { fontSize: 12, fontWeight: 700, color: t.muted } }, "거래처"),
            Sel(t, { value: selectedVendor, onChange: async (e) => { const vid = e.target.value; setSelectedVendor(vid); const vp = await props.loadVendorPresets(vid); setVendorPresets(vp); }, style: { minWidth: 130, padding: "6px 10px", fontSize: 12 } }, (props.vendors || []).map((v) => ({ value: v.id, label: v.name + (v.isDefault ? " (기본)" : "") }))),
            h("span", { key: 2, style: { fontSize: 11, color: t.muted } }, `— ${vendorPresets.length}개 품목`),
          ]),
          h("div", { key: 2, style: { fontSize: 11, color: t.muted } }, "카테고리를 펼쳐 품목을 클릭하면 견적에 추가됩니다"),
        ]),
        h("div", { key: 2, style: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" } }, [
          h("div", { key: "c", style: { display: "flex", gap: 4, flexWrap: "wrap" } },
            ["전체", ...cats].map((c) => h("button", { key: c, onClick: () => setPCat(c), style: { padding: "5px 11px", borderRadius: 8, border: `1px solid ${pCat === c ? t.accent : t.divider}`, background: pCat === c ? t.accent : "transparent", color: pCat === c ? "#fff" : t.ink, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT } }, c))
          ),
          h("div", { key: "s", style: { flex: 1, minWidth: 160 } }, TextInput(t, { value: pSearch, onChange: (e) => setPSearch(e.target.value), placeholder: "전체 품목·규격 검색... (검색 시 카테고리 무시하고 바로 표시)" })),
        ]),
        body,
      ];
    })()),
    // 헤더 입력 — 견적정보 + 수신처
    Card(t, { key: "hdr" }, [
      h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } }, [
        // 좌: 견적 정보
        h("div", { key: 1 }, [
          h("div", { key: 0, style: { fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 10, letterSpacing: 1 } }, "견적 정보"),
          h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, [
            Field(t, "견적번호 (자동)", TextInput(t, { value: quoteNo, onChange: (e) => setQuoteNo(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "프로젝트명", TextInput(t, { value: projectName, onChange: (e) => setProjectName(e.target.value), placeholder: "춘천점 채널간판" })),
            Field(t, "견적일자", TextInput(t, { type: "date", value: quoteDate, onChange: (e) => setQuoteDate(e.target.value) })),
            Field(t, "유효기간", TextInput(t, { value: validity, onChange: (e) => setValidity(e.target.value) })),
            Field(t, "상태", Sel(t, { value: quoteStatus, onChange: (e) => setQuoteStatus(e.target.value), style: { fontWeight: 700, color: quoteStatus === "완료" ? t.green : quoteStatus === "진행중" ? t.accent : quoteStatus === "발주" ? t.blue : t.muted } }, [{ value: "작성중", label: "📝 작성중" }, { value: "발주", label: "📋 발주" }, { value: "진행중", label: "🔨 진행중" }, { value: "완료", label: "✅ 완료" }])),
          ]),
        ]),
        // 우: 수신처
        h("div", { key: 2 }, [
          h("div", { key: 0, style: { fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 10, letterSpacing: 1 } }, "수신처 (고객)"),
          h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr", gap: 12 } }, [
            Field(t, "상호 / 수신처", TextInput(t, { value: client.name, onChange: setC("name"), placeholder: "㈜○○기업" })),
            h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, [
              Field(t, "담당자", TextInput(t, { value: client.manager, onChange: setC("manager"), placeholder: "홍길동 대리" })),
              Field(t, "연락처", TextInput(t, { value: client.tel, onChange: setC("tel"), placeholder: "010-1234-5678" })),
            ]),
          ]),
        ]),
      ]),
    ]),
    // 마진율 조절
    Card(t, { key: "margin", style: { background: marginRate > 0 ? t.accentSoft : t.surface, border: `1px solid ${marginRate > 0 ? t.accent : t.divider}` } }, [
      h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 } }, [
        h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 } }, [
          h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.ink, whiteSpace: "nowrap" } }, "마진율"),
          h("input", { key: 2, type: "range", min: 0, max: 1000, step: 1, value: marginRate, onChange: (e) => setMarginRate(Number(e.target.value)), style: { flex: 1, accentColor: t.accent } }),
          h("div", { key: 3, style: { display: "flex", alignItems: "center", gap: 4 } }, [
            TextInput(t, { type: "number", value: marginRate, onChange: (e) => setMarginRate(Math.max(0, Math.min(1000, Number(e.target.value) || 0))), style: { width: 70, fontFamily: MONO, textAlign: "right" } }),
            h("span", { key: 2, style: { fontSize: 13, fontWeight: 700, color: t.muted } }, "%"),
          ]),
        ]),
        h("div", { key: 2, style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          [0, 10, 20, 30, 50, 100, 200].map((v) => Btn(t, { key: v, variant: marginRate === v ? "accent" : "ghost", onClick: () => setMarginRate(v), style: { padding: "6px 12px", fontSize: 12 } }, `${v}%`))
        ),
      ]),
      marginRate > 0 && h("div", { key: 2, style: { display: "flex", gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.divider}`, flexWrap: "wrap", fontSize: 12.5 } }, [
        h("div", { key: 1 }, [h("span", { key: 1, style: { color: t.muted } }, "원가 합계 "), h("span", { key: 2, style: { fontFamily: MONO, fontWeight: 700, color: t.ink } }, won(baseSubtotal))]),
        h("div", { key: 2 }, [h("span", { key: 1, style: { color: t.muted } }, "마진 금액 "), h("span", { key: 2, style: { fontFamily: MONO, fontWeight: 700, color: t.accent } }, "+" + won(marginAmount))]),
        h("div", { key: 3 }, [h("span", { key: 1, style: { color: t.muted } }, "판매 공급가 "), h("span", { key: 2, style: { fontFamily: MONO, fontWeight: 700, color: t.ink } }, won(subtotal))]),
      ]),
    ]),
    // 품목 테이블
    Card(t, { key: "tbl" }, [
      h("div", { key: 1, style: { overflowX: "auto" } }, [
        h("table", { key: 1, style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, [
          h("thead", { key: 1 }, h("tr", {}, [th("품목명"), th("규격 / 사양", 140), th("수량", 60), th("단위", 60), th("원가(단가)", 100, "left"), th("개별마진%", 90, "center"), th("판매단가", 100, "right"), th("금액", 110, "right"), h("th", { key: "z", style: { width: 32 } })])),
          h("tbody", { key: 2 }, items.map((i) => {
            const overridden = !(i.marginOverride === null || i.marginOverride === undefined || i.marginOverride === "");
            return h("tr", { key: i.id, style: { borderTop: `1px solid ${t.divider}` } }, [
            h("td", { key: 1, style: { padding: 6 } }, TextInput(t, { value: i.name, onChange: (e) => updateItem(i.id, "name", e.target.value), placeholder: "채널 간판" })),
            h("td", { key: 2, style: { padding: 6 } }, TextInput(t, { value: i.spec, onChange: (e) => updateItem(i.id, "spec", e.target.value), placeholder: "LED 채널 / W3000×H600" })),
            h("td", { key: 3, style: { padding: 6 } }, TextInput(t, { type: "number", value: i.qty, onChange: (e) => updateItem(i.id, "qty", e.target.value), style: { fontFamily: MONO } })),
            h("td", { key: 4, style: { padding: 6 } }, TextInput(t, { value: i.unit, onChange: (e) => updateItem(i.id, "unit", e.target.value), placeholder: "식" })),
            h("td", { key: 5, style: { padding: 6 } }, TextInput(t, { type: "number", value: i.unitPrice, onChange: (e) => updateItem(i.id, "unitPrice", e.target.value), style: { fontFamily: MONO } })),
            h("td", { key: 6, style: { padding: 6 } }, h("div", { style: { display: "flex", alignItems: "center", gap: 3 } }, [
              TextInput(t, { type: "number", value: i.marginOverride === null || i.marginOverride === undefined ? "" : i.marginOverride, onChange: (e) => updateItem(i.id, "marginOverride", e.target.value === "" ? null : e.target.value), placeholder: `${marginRate}`, style: { fontFamily: MONO, textAlign: "center", width: "100%", background: overridden ? t.accentSoft : undefined, borderColor: overridden ? t.accent : undefined } }),
              overridden && h("button", { key: "x", title: "전체 마진율 따르기", onClick: () => updateItem(i.id, "marginOverride", null), style: { background: "none", border: "none", cursor: "pointer", color: t.muted, fontSize: 13, padding: 0, lineHeight: 1 } }, "×"),
            ])),
            h("td", { key: 7, style: { padding: 6, textAlign: "right", fontFamily: MONO, color: overridden ? t.blue : (marginRate > 0 ? t.accent : t.muted), fontWeight: 600 } }, won(sellPrice(i))),
            h("td", { key: 8, style: { padding: 6, textAlign: "right", fontFamily: MONO, color: t.ink, fontWeight: 700 } }, won(lineTotal(i))),
            h("td", { key: 9, style: { padding: 6, textAlign: "center" } }, IconBtn(t, Ico.trash, () => removeItem(i.id))),
          ]);
          })),
        ]),
      ]),
      h("div", { key: 2, style: { marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 } }, [
        Btn(t, { variant: "ghost", onClick: addItem }, [Ico.plus({ size: 14 }), " 항목 추가"]),
        h("div", { style: { fontSize: 11.5, color: t.muted } }, "※ '개별마진%'을 비워두면 위 전체 마진율을 따르고, 값을 입력하면 그 품목만 별도 마진율이 적용됩니다."),
      ]),
    ]),
    // 채널 LED 자동계산 도우미
    Card(t, { key: "led-helper", style: { background: t.surface2, border: `1px dashed ${t.divider}` } }, (() => {
      const LED_PER_SIZE = { 300: 3, 400: 5, 500: 7, 600: 9, 700: 12, 800: 15, 900: 18, 1000: 22 }; // 각수별 3구 모듈 개수 (근사치)
      const [chSize, setChSize] = useState("700");
      const [chQty, setChQty] = useState("3");
      const [withAssembly, setWithAssembly] = useState(true);
      const ledModulePrice = 180; // 3구 2835 1W 기본 단가
      const assemblyPricePerModule = 350; // 조립비 (개당)
      const sizeNum = Number(chSize) || 700;
      // 입력 각수에 가장 가까운 프로필 찾기, 없으면 보간
      const sizes = Object.keys(LED_PER_SIZE).map(Number).sort((a, b) => a - b);
      let modulesPerChar;
      if (LED_PER_SIZE[sizeNum]) {
        modulesPerChar = LED_PER_SIZE[sizeNum];
      } else {
        const lo = sizes.filter((s) => s <= sizeNum).pop() || sizes[0];
        const hi = sizes.find((s) => s >= sizeNum) || sizes[sizes.length - 1];
        if (lo === hi) modulesPerChar = LED_PER_SIZE[lo];
        else modulesPerChar = Math.round(LED_PER_SIZE[lo] + (LED_PER_SIZE[hi] - LED_PER_SIZE[lo]) * ((sizeNum - lo) / (hi - lo)));
      }
      const totalModules = modulesPerChar * (Number(chQty) || 0);
      const totalModuleCost = totalModules * ledModulePrice;
      const totalAssemblyCost = withAssembly ? totalModules * assemblyPricePerModule : 0;
      const addLedItems = () => {
        const newItems = [
          { id: uid(), name: `LED 3구 모듈 (${sizeNum}각×${chQty}자)`, spec: `3구 2835 1W · ${modulesPerChar}개/자×${chQty}자`, unit: "개", unitPrice: ledModulePrice, qty: totalModules, marginOverride: null },
        ];
        if (withAssembly) {
          newItems.push({ id: uid(), name: `LED 조립비 (${sizeNum}각×${chQty}자)`, spec: `개당 ${assemblyPricePerModule}원`, unit: "개", unitPrice: assemblyPricePerModule, qty: totalModules, marginOverride: null });
        }
        setItems((p) => [...p.filter((i) => i.name || i.unitPrice), ...newItems]);
        flash(`LED 모듈 ${totalModules}개${withAssembly ? " + 조립비" : ""} 추가됨`);
      };

      return [
        h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } }, [
          h("div", { key: 0, style: { fontSize: 12.5, fontWeight: 700, color: t.accent } }, "채널 LED 자동계산"),
          Field(t, "글자 각수 (mm)", TextInput(t, { type: "number", value: chSize, onChange: (e) => setChSize(e.target.value), placeholder: "700", style: { width: 90, fontFamily: MONO } })),
          Field(t, "글자 수량", TextInput(t, { type: "number", value: chQty, onChange: (e) => setChQty(e.target.value), placeholder: "3", style: { width: 70, fontFamily: MONO } })),
          h("label", { key: "asm", style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" } }, [
            h("input", { type: "checkbox", checked: withAssembly, onChange: (e) => setWithAssembly(e.target.checked) }),
            "LED 조립 포함 (350원/개)",
          ]),
          h("div", { key: "info", style: { fontFamily: MONO, fontSize: 12, color: t.ink } }, `모듈 ${totalModules}개 · ${won(totalModuleCost)}${withAssembly ? " + 조립 " + won(totalAssemblyCost) : ""} = ${won(totalModuleCost + totalAssemblyCost)}`),
          Btn(t, { key: "add", variant: "accent", onClick: addLedItems, style: { padding: "8px 14px" } }, "견적에 추가"),
        ]),
      ];
    })()),
    // 합계 + 비고 + 로고/도장
    h("div", { key: "sum", style: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 } }, [
      Card(t, { key: 1 }, [
        Field(t, "기타 안내사항 (PDF 하단에 번호로 표시됩니다 · 줄바꿈으로 구분)", TextArea(t, { value: note, onChange: (e) => setNote(e.target.value), rows: 4 })),
        h("div", { key: 2, style: { display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" } }, [
          Btn(t, { key: 1, variant: "ghost", onClick: pickLogo }, [Ico.image({ size: 14 }), logo ? " 로고 변경" : " 로고 등록"]),
          logo && h("span", { key: "lc", onClick: clearLogo, style: { fontSize: 11, color: t.green, alignSelf: "center", cursor: "pointer" } }, "✓ 로고 (삭제)"),
          Btn(t, { key: 2, variant: "ghost", onClick: pickStamp }, [Ico.image({ size: 14 }), stamp ? " 도장 변경" : " 도장 등록"]),
          stamp && h("span", { key: "sc", onClick: clearStamp, style: { fontSize: 11, color: t.green, alignSelf: "center", cursor: "pointer" } }, "✓ 도장 (삭제)"),
        ]),
        h("div", { key: 3, style: { fontSize: 11, color: t.muted, marginTop: 8 } }, "※ 공급자(회사) 정보는 좌측 하단 '회사 정보 설정'에서 관리합니다."),
      ]),
      Card(t, { key: 2, style: { background: t.inkPanel } }, [
        h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", fontSize: 13, color: t.inkPanelMuted, padding: "3px 0" } }, [h("span", { key: 1 }, "공급가액 (VAT 별도)"), h("span", { key: 2, style: { fontFamily: MONO } }, won(subtotal))]),
        h("div", { key: 2, style: { display: "flex", justifyContent: "space-between", fontSize: 13, color: t.inkPanelMuted, padding: "3px 0" } }, [h("span", { key: 1 }, "부가세 (10%)"), h("span", { key: 2, style: { fontFamily: MONO } }, won(vat))]),
        h("div", { key: 3, style: { display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 700, color: t.inkPanelText, paddingTop: 10, marginTop: 6, borderTop: `1px solid ${t.inkPanelBorder}` } }, [h("span", { key: 1 }, "합계 (VAT 포함)"), h("span", { key: 2, style: { fontFamily: MONO, color: t.accent } }, won(total))]),
      ]),
    ]),
    // 액션
    h("div", { key: "act", style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } }, [
      Btn(t, { key: 1, variant: "accent", onClick: handleSave }, [Ico.save({ size: 14 }), " 견적 저장"]),
      h("div", { key: "theme", style: { display: "flex", alignItems: "center", gap: 6 } }, [
        h("span", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 600 } }, "견적서 테마 (PDF·엑셀 공통)"),
        Sel(t, { value: pdfTheme, onChange: (e) => changePdfTheme(e.target.value), style: { width: 140, padding: "8px 10px", fontSize: 12.5 } }, Object.keys(QUOTE_THEMES).map((k) => ({ value: k, label: QUOTE_THEMES[k].name }))),
      ]),
      Btn(t, { key: 2, variant: "blue", onClick: handlePdf }, [Ico.pdf({ size: 14 }), " PDF 내보내기"]),
      Btn(t, { key: 3, variant: "ghost", onClick: handleExcel }, [Ico.download({ size: 14 }), " 엑셀 내보내기"]),
      toast && h("span", { key: 4, style: { fontSize: 13, color: toast.includes("실패") ? t.red : t.green, alignSelf: "center", fontWeight: toast.includes("실패") ? 600 : 400 } }, toast),
    ]),
    // 저장 목록
    loaded && saved.length > 0 && Card(t, { key: "saved" }, (() => {
      const list = savedSearch
        ? saved.filter((r) => {
            const q = savedSearch.toLowerCase();
            const hay = `${r.quoteNo || ""} ${r.projectName || ""} ${(r.client && r.client.name) || r.clientName || ""}`.toLowerCase();
            return hay.includes(q);
          })
        : saved;
      return [
        h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" } }, [
          h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.muted } }, `저장된 견적 (${list.length})`),
          h("div", { key: 2, style: { width: 220 } }, TextInput(t, { value: savedSearch, onChange: (e) => setSavedSearch(e.target.value), placeholder: "상호·견적번호·프로젝트 검색..." })),
        ]),
        h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" } }, list.length === 0
          ? [h("div", { key: "e", style: { color: t.muted, fontSize: 13, padding: "16px 0", textAlign: "center" } }, "검색 결과가 없습니다.")]
          : list.map((r) => {
            const statusColor = { "작성중": t.muted, "발주": t.blue, "진행중": t.accent, "완료": t.green };
            return h("div", { key: r.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: editingId === r.id ? t.accentSoft : t.surface2, borderRadius: 10, border: editingId === r.id ? `1px solid ${t.accent}` : "1px solid transparent" } }, [
            h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 10 } }, [
              h("span", { key: 0, style: { display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: (statusColor[r.status] || t.muted) + "22", color: statusColor[r.status] || t.muted } }, r.status || "작성중"),
              h("div", { key: 1 }, [
                h("div", { key: 1, style: { fontWeight: 600, color: t.ink, fontSize: 13 } }, `${r.quoteNo ? r.quoteNo + " · " : ""}${r.projectName || (r.client && r.client.name) || r.clientName || "(제목 없음)"}`),
                h("div", { key: 2, style: { color: t.muted, fontSize: 12 } }, `${(r.client && r.client.name) || r.clientName || "-"} · ${(r.savedAt || "").slice(0, 10)} · 원가 ${won(r.baseSubtotal || 0)} · 판매 ${won(r.subtotal || r.total || 0)}${r.marginRate ? " · 마진" + r.marginRate + "%" : ""}`),
              ]),
            ]),
            h("div", { key: 2, style: { display: "flex", gap: 10, alignItems: "center" } }, [
              h("span", { key: 0, style: { fontFamily: MONO, fontSize: 13, fontWeight: 700, color: t.ink } }, won(r.total || 0)),
              h("button", { key: 1, onClick: () => handleLoad(r), style: { background: "none", border: "none", cursor: "pointer", color: t.blue, fontSize: 12, fontWeight: 600 } }, "불러오기"),
              h("button", { key: 2, onClick: () => handleDelete(r.id), style: { background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 } }, "삭제"),
            ]),
          ]);
          })),
      ];
    })()),
  ]);
}

/* ==================================================================== */
/*  2. 시안 의뢰서 생성기                                                  */
/* ==================================================================== */
const SIGN_TYPES = ["채널간판 (전면발광)", "채널간판 (후면발광)", "플렉스 간판", "갈바 레이저 타공 간판", "아크릴 간판", "스테인리스 입체 간판", "LED 미디어월", "현수막 / 배너"];
const FONT_MOODS = ["모던 산세리프", "클래식 세리프", "캘리그라피 / 손글씨", "고딕 볼드", "미니멀 라이트"];

function DesignBrief(props) {
  const t = props.theme;
  const emptyForm = { client: "", industry: "", location: "", brandColor: "#1D1D1F", fontMood: FONT_MOODS[0], installNote: "" };
  const emptySignItem = () => ({ id: uid(), signType: SIGN_TYPES[0], width: "", height: "", location: "", dayEffect: "", nightEffect: "" });
  const [f, setF] = useState(emptyForm);
  const [signItems, setSignItems] = useState([emptySignItem()]);
  const [images, setImages] = useState([]); // [{id, data}]
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), m && m.includes("실패") ? 6000 : 2200); };

  useEffect(() => { loadKey("sp2-briefs", []).then((v) => { setSaved(v); setLoaded(true); }); }, []);

  // 이전 버전(단일 간판종류) 저장 기록을 signItems 배열로 변환
  const migrateSignItems = (r) => {
    if (r.signItems && r.signItems.length) return r.signItems;
    if (r.form && r.form.signType) return [{ id: uid(), signType: r.form.signType, width: r.form.width || "", height: r.form.height || "", location: r.form.location || "", dayEffect: r.form.dayEffect || "", nightEffect: r.form.nightEffect || "" }];
    return [emptySignItem()];
  };

  // 이미지 붙여넣기 (Ctrl+V)
  useEffect(() => {
    const onPaste = (e) => {
      const items = (e.clipboardData || {}).items || [];
      for (const it of items) {
        if (it.type && it.type.indexOf("image") === 0) {
          const blob = it.getAsFile();
          const reader = new FileReader();
          reader.onload = () => setImages((p) => [...p, { id: uid(), data: reader.result }]);
          reader.readAsDataURL(blob);
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const addImage = async () => {
    if (window.api && window.api.pickImage) {
      const d = await window.api.pickImage();
      if (d) setImages((p) => [...p, { id: uid(), data: d }]);
    }
  };
  const removeImage = (id) => setImages((p) => p.filter((i) => i.id !== id));

  const addSignItem = () => setSignItems((p) => [...p, emptySignItem()]);
  const removeSignItem = (id) => setSignItems((p) => (p.length > 1 ? p.filter((s) => s.id !== id) : p));
  const updateSignItem = (id, k, v) => setSignItems((p) => p.map((s) => (s.id === id ? { ...s, [k]: v } : s)));

  const briefText = `[Signplus+ 시안 제작 의뢰서]

■ 거래처 : ${f.client || "-"}
■ 업종 : ${f.industry || "-"}
■ 건물/설치 위치 : ${f.location || "-"}

[디자인 방향]
- 브랜드 컬러 : ${f.brandColor}
- 폰트 느낌 : ${f.fontMood}

[간판 제작 항목] (총 ${signItems.length}건)
${signItems.map((s, idx) => `${idx + 1}. ${s.signType} — ${s.width || "-"}×${s.height || "-"}mm / 위치: ${s.location || "-"}
   주간: ${s.dayEffect || "특이사항 없음"} / 야간: ${s.nightEffect || "특이사항 없음"}`).join("\n")}

[시공 참고사항]
${f.installNote || "- 여백 및 고정 방식은 현장 실측 후 확정\n- 소재 두께 및 마감은 표준 사양 기준"}
${images.length ? `\n[첨부 이미지] ${images.length}장 (앱에 저장됨)` : ""}`;
  const copy = async () => { try { await navigator.clipboard.writeText(briefText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  const persist = async (next) => { setSaved(next); await saveKey("sp2-briefs", next); };
  const handleSave = async () => {
    if (!f.client && !f.location) { flash("거래처나 설치 위치를 입력해주세요"); return; }
    const rec = { id: editingId || uid(), form: f, signItems, images, savedAt: new Date().toISOString() };
    const next = editingId ? saved.map((r) => (r.id === editingId ? rec : r)) : [rec, ...saved];
    await persist(next);
    setEditingId(rec.id);
    flash(editingId ? "수정 저장됨" : "의뢰서 저장됨");
  };
  const handleLoad = (r) => { setF({ ...emptyForm, ...r.form }); setSignItems(migrateSignItems(r)); setImages(r.images || []); setEditingId(r.id); flash("불러왔습니다"); };
  const handleNew = () => { setF(emptyForm); setSignItems([emptySignItem()]); setImages([]); setEditingId(null); flash("새 의뢰서"); };
  const handleDelete = async (id) => { await persist(saved.filter((r) => r.id !== id)); if (editingId === id) handleNew(); };
  const handlePdf = async () => {
    const html = buildBriefHTML({ form: f, signItems, images, createdAt: todayISO() });
    try {
      const res = await window.api.exportPdf(html, (f.client || "시안의뢰서") + "_" + todayISO());
      if (res && res.ok) flash("PDF 저장 완료");
      else if (res && res.canceled) { /* 취소 */ }
      else flash("PDF 저장 실패: " + ((res && res.error) || "알 수 없는 오류"));
    } catch (err) {
      flash("PDF 저장 실패: " + (err && err.message ? err.message : String(err)));
    }
  };

  const list = search ? saved.filter((r) => `${r.form.client || ""} ${r.form.location || ""} ${r.form.industry || ""}`.toLowerCase().includes(search.toLowerCase())) : saved;

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, [
    SectionTitle(t, "시안 제작 의뢰서", "상담 내용을 입력하면 디자이너가 바로 작업할 수 있는 의뢰서로 정리됩니다. 간판이 여러 종류면 항목을 추가하세요.",
      h("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, [
        toast && h("span", { key: 0, style: { fontSize: 13, color: toast.includes("실패") ? t.red : t.green, fontWeight: toast.includes("실패") ? 600 : 400 } }, toast),
        editingId && Btn(t, { key: 1, variant: "ghost", onClick: handleNew }, "새 의뢰서"),
        Btn(t, { key: 2, variant: "blue", onClick: handlePdf }, [Ico.pdf({ size: 14 }), " PDF 저장"]),
        Btn(t, { key: 3, variant: "accent", onClick: handleSave }, [Ico.save({ size: 14 }), editingId ? " 수정 저장" : " 저장"]),
      ])
    ),
    h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, [
      Card(t, { key: 1 }, h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, [
        h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, [
          Field(t, "거래처", TextInput(t, { value: f.client, onChange: set("client"), placeholder: "예: 서민막국수" })),
          Field(t, "업종", TextInput(t, { value: f.industry, onChange: set("industry"), placeholder: "예: 음식점" })),
        ]),
        Field(t, "건물 / 설치 위치", TextInput(t, { value: f.location, onChange: set("location"), placeholder: "예: 건물 정면 파사드 전체" })),
        h("div", { key: 5, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, [
          Field(t, "브랜드 컬러", h("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, [
            h("input", { key: 1, type: "color", value: f.brandColor, onChange: set("brandColor"), style: { width: 40, height: 36, border: `1px solid ${t.divider}`, borderRadius: 8, padding: 0, background: "none" } }),
            TextInput(t, { value: f.brandColor, onChange: set("brandColor"), style: { flex: 1, fontFamily: MONO } }),
          ])),
          Field(t, "폰트 느낌", Sel(t, { value: f.fontMood, onChange: set("fontMood") }, FONT_MOODS)),
        ]),
        Field(t, "시공 참고사항", TextArea(t, { value: f.installNote, onChange: set("installNote"), rows: 3, placeholder: "여백, 고정 방식, 하지 작업 등" })),
        // 이미지 첨부
        Field(t, "현장 사진 · 참고 이미지", h("div", {}, [
          h("div", { key: 1, style: { display: "flex", gap: 8, alignItems: "center", marginBottom: images.length ? 10 : 0 } }, [
            Btn(t, { key: 1, variant: "ghost", onClick: addImage }, [Ico.plus({ size: 14 }), " 이미지 추가"]),
            h("span", { key: 2, style: { fontSize: 11.5, color: t.muted } }, "또는 Ctrl+V로 붙여넣기"),
          ]),
          images.length > 0 && h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 } },
            images.map((im) => h("div", { key: im.id, style: { position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${t.divider}`, aspectRatio: "1", background: t.surface2 } }, [
              h("img", { key: 1, src: im.data, style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }),
              h("button", { key: 2, onClick: () => removeImage(im.id), style: { position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 6, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" } }, "×"),
            ]))
          ),
        ])),
      ])),
      // 우측: 미리보기 + 이미지
      Card(t, { key: 2, style: { background: t.inkPanel, position: "relative" } }, [
        h("div", { key: 1, style: { position: "absolute", top: 16, right: 16 } }, Btn(t, { variant: copied ? "accent" : "ghost", onClick: copy, style: { borderColor: t.inkPanelBorder, color: "#fff" } }, [copied ? Ico.check({ size: 14 }) : Ico.copy({ size: 14 }), copied ? " 복사됨" : " 복사하기"])),
        h("pre", { key: 2, style: { whiteSpace: "pre-wrap", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7, color: t.inkPanelText, marginTop: 44, maxHeight: 480, overflowY: "auto" } }, briefText),
        images.length > 0 && h("div", { key: 3, style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 12 } },
          images.map((im) => h("img", { key: im.id, src: im.data, style: { width: "100%", borderRadius: 8, display: "block", border: `1px solid ${t.inkPanelBorder}` } }))
        ),
      ]),
    ]),
    // 간판 제작 항목 목록 (여러 종류 추가 가능)
    Card(t, { key: "signItems" }, [
      h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, [
        h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.accent } }, `간판 제작 항목 (${signItems.length}건)`),
        Btn(t, { key: 2, variant: "ghost", onClick: addSignItem }, [Ico.plus({ size: 14 }), " 간판 항목 추가"]),
      ]),
      h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 12 } },
        signItems.map((s, idx) => h("div", { key: s.id, style: { border: `1px solid ${t.divider}`, borderRadius: 12, padding: 14, background: t.surface2 } }, [
          h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, [
            h("div", { key: 1, style: { fontSize: 12, fontWeight: 700, color: t.muted } }, `#${idx + 1}`),
            signItems.length > 1 && h("button", { key: 2, onClick: () => removeSignItem(s.id), style: { background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 } }, "삭제"),
          ]),
          h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 1.2fr", gap: 10, marginBottom: 10 } }, [
            Field(t, "간판 종류", Sel(t, { value: s.signType, onChange: (e) => updateSignItem(s.id, "signType", e.target.value) }, SIGN_TYPES)),
            Field(t, "가로 (mm)", TextInput(t, { value: s.width, onChange: (e) => updateSignItem(s.id, "width", e.target.value), placeholder: "3000" })),
            Field(t, "높이 (mm)", TextInput(t, { value: s.height, onChange: (e) => updateSignItem(s.id, "height", e.target.value), placeholder: "800" })),
            Field(t, "설치 위치", TextInput(t, { value: s.location, onChange: (e) => updateSignItem(s.id, "location", e.target.value), placeholder: "예: 정면 상단" })),
          ]),
          h("div", { key: 3, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, [
            Field(t, "주간 시각 효과", TextInput(t, { value: s.dayEffect, onChange: (e) => updateSignItem(s.id, "dayEffect", e.target.value), placeholder: "예: 무광 화이트 아크릴" })),
            Field(t, "야간 시각 효과", TextInput(t, { value: s.nightEffect, onChange: (e) => updateSignItem(s.id, "nightEffect", e.target.value), placeholder: "예: 백색 LED 후면 간접조명" })),
          ]),
        ]))
      ),
    ]),
    // 저장된 의뢰서 목록
    loaded && saved.length > 0 && Card(t, { key: "saved" }, [
      h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" } }, [
        h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.muted } }, `저장된 의뢰서 (${list.length})`),
        h("div", { key: 2, style: { width: 220 } }, TextInput(t, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "거래처·위치·업종 검색..." })),
      ]),
      h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" } }, list.length === 0
        ? [h("div", { key: "e", style: { color: t.muted, fontSize: 13, padding: "16px 0", textAlign: "center" } }, "검색 결과가 없습니다.")]
        : list.map((r) => h("div", { key: r.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: editingId === r.id ? t.accentSoft : t.surface2, borderRadius: 10, border: editingId === r.id ? `1px solid ${t.accent}` : "1px solid transparent" } }, [
          h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 10 } }, [
            (r.images && r.images.length) ? h("img", { key: 0, src: r.images[0].data, style: { width: 34, height: 34, borderRadius: 6, objectFit: "cover" } }) : null,
            h("div", { key: 1 }, [
              h("div", { key: 1, style: { fontWeight: 600, color: t.ink, fontSize: 13 } }, `${r.form.client || "(거래처 없음)"} · ${(r.signItems && r.signItems.length) || 1}건`),
              h("div", { key: 2, style: { color: t.muted, fontSize: 12 } }, `${r.form.location || "-"} · ${(r.savedAt || "").slice(0, 10)}${r.images && r.images.length ? " · 사진 " + r.images.length + "장" : ""}`),
            ]),
          ]),
          h("div", { key: 2, style: { display: "flex", gap: 10 } }, [
            h("button", { key: 1, onClick: () => handleLoad(r), style: { background: "none", border: "none", cursor: "pointer", color: t.blue, fontSize: 12, fontWeight: 600 } }, "열기"),
            h("button", { key: 2, onClick: () => handleDelete(r.id), style: { background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 } }, "삭제"),
          ]),
        ]))),
    ]),
  ]);
}


/* ==================================================================== */
/*  3. LED 스펙 계산기                                                    */
/* ==================================================================== */
const PITCH_PROFILES = { 2.5: { peak: 900, avg: 340, weight: 28 }, 4: { peak: 800, avg: 300, weight: 25 }, 6: { peak: 650, avg: 250, weight: 20 }, 8: { peak: 550, avg: 200, weight: 17 }, 10: { peak: 450, avg: 160, weight: 15 }, 16: { peak: 350, avg: 120, weight: 13 } };

/* SMPS 용량 라인업 (모듈 개수 기준) */
const SMPS_LINEUP = [30, 60, 100, 150, 200, 300, 400, 500, 600];
function recommendSmps(moduleCount) {
  // 안전율 감안: 정격의 80%까지만 사용
  const need = Math.ceil(moduleCount / 0.8);
  for (const cap of SMPS_LINEUP) if (cap >= need) return cap;
  // 600 초과 시 600 여러 개
  return SMPS_LINEUP[SMPS_LINEUP.length - 1];
}

function LedCalculator(props) {
  const t = props.theme;
  const [sub, setSub] = useState("channel"); // channel | tube | board

  const subTab = (id, label) => Btn(t, {
    key: id, variant: sub === id ? "primary" : "ghost",
    onClick: () => setSub(id),
    style: { flex: 1, justifyContent: "center" },
  }, label);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, [
    SectionTitle(t, "LED 계산기", "채널 간판 LED 모듈 · LED 형광등 · 전광판 스펙을 계산합니다."),
    h("div", { key: "tabs", style: { display: "flex", gap: 8 } }, [
      subTab("channel", "채널 LED 모듈"),
      subTab("tube", "LED 형광등"),
      subTab("board", "전광판 스펙"),
    ]),
    sub === "channel" ? h(ChannelLedCalc, { key: "c", theme: t })
      : sub === "tube" ? h(TubeLedCalc, { key: "t2", theme: t })
        : h(BoardCalc, { key: "b", theme: t }),
  ]);
}

/* ---- 채널 간판 LED 모듈 계산 (3구 모듈 · 1W 기준) ---- */
function ChannelLedCalc(props) {
  const t = props.theme;
  const [mode, setMode] = useState("area"); // area(면적) | count(글자수)
  // 면적 기준
  const [areaVal, setAreaVal] = useState("1");
  // 글자 기준
  const [charW, setCharW] = useState("600");
  const [charH, setCharH] = useState("600");
  const [charN, setCharN] = useState("5");
  // 공통
  const [density, setDensity] = useState("75"); // 개/㎡
  const [modPrice, setModPrice] = useState("180"); // 모듈 단가
  const [smpsPrice, setSmpsPrice] = useState("15000");
  const [assemblyPrice, setAssemblyPrice] = useState("350"); // LED 조립비 (개당)

  const area = mode === "area"
    ? (Number(areaVal) || 0)
    : ((Number(charW) || 0) / 1000) * ((Number(charH) || 0) / 1000) * (Number(charN) || 0);

  const dens = Number(density) || 0;
  const moduleCount = Math.ceil(area * dens);
  const watt = moduleCount * 1; // 3구 모듈 = 1W
  const smpsCap = recommendSmps(moduleCount);
  const smpsQty = Math.max(1, Math.ceil(moduleCount / (smpsCap * 0.8)));
  const modCost = moduleCount * (Number(modPrice) || 0);
  const smpsCost = smpsQty * (Number(smpsPrice) || 0);
  const assemblyCost = moduleCount * (Number(assemblyPrice) || 0);

  const Stat = (label, value, unit, accent) => Card(t, { key: label, style: { padding: 14, background: t.surface2 } }, [
    h("div", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 600, marginBottom: 4 } }, label),
    h("div", { key: 2, style: { fontSize: 20, fontFamily: MONO, fontWeight: 700, color: accent ? t.accent : t.ink } }, [value, " ", h("span", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 500 } }, unit)]),
  ]);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, [
    Card(t, { key: 1 }, [
      h("div", { key: "m", style: { display: "flex", gap: 8, marginBottom: 14 } }, [
        Btn(t, { key: 1, variant: mode === "area" ? "primary" : "ghost", onClick: () => setMode("area"), style: { flex: 1, justifyContent: "center" } }, "면적으로 계산"),
        Btn(t, { key: 2, variant: mode === "count" ? "primary" : "ghost", onClick: () => setMode("count"), style: { flex: 1, justifyContent: "center" } }, "글자 크기로 계산"),
      ]),
      mode === "area"
        ? h("div", { key: "a", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
            Field(t, "채널 총 면적 (㎡)", TextInput(t, { type: "number", value: areaVal, onChange: (e) => setAreaVal(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "모듈 밀도 (개/㎡)", TextInput(t, { type: "number", value: density, onChange: (e) => setDensity(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "모듈 단가 (원)", TextInput(t, { type: "number", value: modPrice, onChange: (e) => setModPrice(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "LED 조립비 (원/개)", TextInput(t, { type: "number", value: assemblyPrice, onChange: (e) => setAssemblyPrice(e.target.value), style: { fontFamily: MONO } })),
          ])
        : h("div", { key: "c", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
            Field(t, "글자 가로 (mm)", TextInput(t, { type: "number", value: charW, onChange: (e) => setCharW(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "글자 세로 (mm)", TextInput(t, { type: "number", value: charH, onChange: (e) => setCharH(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "글자 수 (개)", TextInput(t, { type: "number", value: charN, onChange: (e) => setCharN(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "모듈 밀도 (개/㎡)", TextInput(t, { type: "number", value: density, onChange: (e) => setDensity(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "모듈 단가 (원)", TextInput(t, { type: "number", value: modPrice, onChange: (e) => setModPrice(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "SMPS 단가 (원)", TextInput(t, { type: "number", value: smpsPrice, onChange: (e) => setSmpsPrice(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "LED 조립비 (원/개)", TextInput(t, { type: "number", value: assemblyPrice, onChange: (e) => setAssemblyPrice(e.target.value), style: { fontFamily: MONO } })),
          ]),
    ]),
    h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 } }, [
      Stat("채널 면적", area.toFixed(2), "㎡"),
      Stat("필요 모듈 수", num(moduleCount), "개(3구·1W)", true),
      Stat("소비 전력", num(watt), "W"),
      Stat("권장 SMPS", `${smpsCap}개용 × ${smpsQty}`, "", true),
      Stat("모듈 자재비", num(modCost), "원"),
      Stat("SMPS 자재비", num(smpsCost), "원"),
      Stat("LED 조립비", num(assemblyCost), "원", true),
    ]),
    Card(t, { key: 3, style: { background: t.surface2 } }, [
      h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: t.accent } }, `LED 자재+조립비 합계: ${won(modCost + smpsCost + assemblyCost)}`),
      h("div", { key: 2, style: { fontSize: 12, color: t.muted, lineHeight: 1.6 } }, `3구 2835 모듈 1개 = 1W 기준. 모듈 밀도는 글자 채움 정도에 따라 조정하세요 (촘촘한 채널 90개/㎡, 보통 75개/㎡, 성긴 채널 60개/㎡). SMPS는 정격의 80%까지만 사용하도록 안전율을 적용해 추천합니다. 조립비는 모듈 1개 부착 기준 개당 단가입니다.`),
    ]),
  ]);
}

/* ---- LED 형광등 계산 (20W 기준) ---- */
function TubeLedCalc(props) {
  const t = props.theme;
  const [mode, setMode] = useState("area"); // area | box
  const [areaVal, setAreaVal] = useState("3");
  const [boxW, setBoxW] = useState("3000");
  const [boxH, setBoxH] = useState("1000");
  const [boxN, setBoxN] = useState("1");
  const [spacing, setSpacing] = useState("200"); // 형광등 간격 mm
  const [tubePrice, setTubePrice] = useState("1800");
  const [assembly, setAssembly] = useState("4000"); // 등 조립비

  // 면판 면적
  const area = mode === "area"
    ? (Number(areaVal) || 0)
    : ((Number(boxW) || 0) / 1000) * ((Number(boxH) || 0) / 1000) * (Number(boxN) || 0);

  // 20W 형광등(길이1200mm=1.2m)이 간판 내부에 줄줄이 배열된다고 가정
  // 세로로 몇 줄 = 높이 / 간격, 각 줄 길이 = 가로. 총 형광등 길이 / 1.2m = 개수
  // 간이 계산: 배열밀도 = 1000/간격(줄/m) × 가로길이 환산 → 면적 기반 근사
  const rows = mode === "box" ? Math.max(1, Math.round((Number(boxH) || 0) / (Number(spacing) || 200))) : null;
  // 면적 기반 근사: 1㎡당 형광등 개수 ≈ (1000/간격) 줄 × (1m/1.2m 튜브) ≈ 1000/간격/1.2
  const perSqm = (1000 / (Number(spacing) || 200)) / 1.2;
  const tubeCount = Math.ceil(area * perSqm) || 0;
  const watt = tubeCount * 20; // 20W 기준
  const tubeCost = tubeCount * (Number(tubePrice) || 0);
  const asmCost = tubeCount * (Number(assembly) || 0);

  const Stat = (label, value, unit, accent) => Card(t, { key: label, style: { padding: 14, background: t.surface2 } }, [
    h("div", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 600, marginBottom: 4 } }, label),
    h("div", { key: 2, style: { fontSize: 20, fontFamily: MONO, fontWeight: 700, color: accent ? t.accent : t.ink } }, [value, " ", h("span", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 500 } }, unit)]),
  ]);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, [
    Card(t, { key: 1 }, [
      h("div", { key: "m", style: { display: "flex", gap: 8, marginBottom: 14 } }, [
        Btn(t, { key: 1, variant: mode === "area" ? "primary" : "ghost", onClick: () => setMode("area"), style: { flex: 1, justifyContent: "center" } }, "면적으로 계산"),
        Btn(t, { key: 2, variant: mode === "box" ? "primary" : "ghost", onClick: () => setMode("box"), style: { flex: 1, justifyContent: "center" } }, "간판 크기로 계산"),
      ]),
      mode === "area"
        ? h("div", { key: "a", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
            Field(t, "면판 총 면적 (㎡)", TextInput(t, { type: "number", value: areaVal, onChange: (e) => setAreaVal(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "형광등 간격 (mm)", TextInput(t, { type: "number", value: spacing, onChange: (e) => setSpacing(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "형광등 단가 (원)", TextInput(t, { type: "number", value: tubePrice, onChange: (e) => setTubePrice(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "등 조립비 (원/개)", TextInput(t, { type: "number", value: assembly, onChange: (e) => setAssembly(e.target.value), style: { fontFamily: MONO } })),
          ])
        : h("div", { key: "b", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
            Field(t, "간판 가로 (mm)", TextInput(t, { type: "number", value: boxW, onChange: (e) => setBoxW(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "간판 세로 (mm)", TextInput(t, { type: "number", value: boxH, onChange: (e) => setBoxH(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "간판 개수", TextInput(t, { type: "number", value: boxN, onChange: (e) => setBoxN(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "형광등 간격 (mm)", TextInput(t, { type: "number", value: spacing, onChange: (e) => setSpacing(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "형광등 단가 (원)", TextInput(t, { type: "number", value: tubePrice, onChange: (e) => setTubePrice(e.target.value), style: { fontFamily: MONO } })),
            Field(t, "등 조립비 (원/개)", TextInput(t, { type: "number", value: assembly, onChange: (e) => setAssembly(e.target.value), style: { fontFamily: MONO } })),
          ]),
    ]),
    h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 } }, [
      Stat("면판 면적", area.toFixed(2), "㎡"),
      Stat("필요 형광등 수", num(tubeCount), "개(20W)", true),
      Stat("소비 전력", num(watt), "W"),
      Stat("형광등 자재비", num(tubeCost), "원"),
      Stat("등 조립비", num(asmCost), "원"),
      Stat("합계", won(tubeCost + asmCost), "", true),
    ]),
    h("div", { key: 3, style: { fontSize: 12, color: t.muted, padding: "0 4px", lineHeight: 1.6 } }, `* 넘버원 LED 형광등 20W(길이 1200mm) 기준. 형광등 간격 ${spacing}mm로 배열한다고 가정한 근사치입니다. 간판 구조·배열 방식에 따라 달라질 수 있습니다.`),
  ]);
}

/* ---- 전광판 스펙 (기존 계산) ---- */
function BoardCalc(props) {
  const t = props.theme;
  const [w, setW] = useState("23");
  const [hh, setHh] = useState("8");
  const [pitch, setPitch] = useState("8");
  const [envType, setEnvType] = useState("실외");
  const [kwh, setKwh] = useState("120");
  const [hours, setHours] = useState("12");

  const width = Number(w) || 0, height = Number(hh) || 0, p = Number(pitch);
  const profile = PITCH_PROFILES[p] || PITCH_PROFILES[8];
  const area = width * height;
  const resW = Math.round((width * 1000) / p), resH = Math.round((height * 1000) / p);
  const totalPixels = resW * resH;
  const peakPower = area * profile.peak, avgPower = area * profile.avg;
  const weight = area * profile.weight;
  const dailyKwh = (avgPower / 1000) * (Number(hours) || 0);
  const monthlyCost = dailyKwh * 30 * (Number(kwh) || 0);

  const Stat = (label, value, unit, accent) => Card(t, { key: label, style: { padding: 14, background: t.surface2 } }, [
    h("div", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 600, marginBottom: 4 } }, label),
    h("div", { key: 2, style: { fontSize: 20, fontFamily: MONO, fontWeight: 700, color: accent ? t.accent : t.ink } }, [value, " ", h("span", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 500 } }, unit)]),
  ]);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, [
    Card(t, { key: 1 }, h("div", { style: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 } }, [
      Field(t, "가로 (m)", TextInput(t, { type: "number", value: w, onChange: (e) => setW(e.target.value), style: { fontFamily: MONO } })),
      Field(t, "세로 (m)", TextInput(t, { type: "number", value: hh, onChange: (e) => setHh(e.target.value), style: { fontFamily: MONO } })),
      Field(t, "픽셀피치", Sel(t, { value: pitch, onChange: (e) => setPitch(e.target.value) }, Object.keys(PITCH_PROFILES).map((k) => ({ value: k, label: "P" + k })))),
      Field(t, "환경", Sel(t, { value: envType, onChange: (e) => setEnvType(e.target.value) }, ["실외", "실내"])),
      Field(t, "전기요금 (원/kWh)", TextInput(t, { type: "number", value: kwh, onChange: (e) => setKwh(e.target.value), style: { fontFamily: MONO } })),
      Field(t, "일 가동시간 (h)", TextInput(t, { type: "number", value: hours, onChange: (e) => setHours(e.target.value), style: { fontFamily: MONO } })),
    ])),
    h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 } }, [
      Stat("총 면적", area.toFixed(1), "m²"),
      Stat("해상도", `${resW} × ${resH}`, "px", true),
      Stat("총 픽셀 수", num(totalPixels), "px"),
      Stat("피크 전력", num(peakPower), "W"),
      Stat("평균 전력", num(avgPower), "W"),
      Stat("추정 총 무게", num(weight), "kg"),
      Stat("월 전기료(추정)", num(monthlyCost), "원", true),
      Stat("최소 시청거리", (p * 1).toFixed(1), "m"),
      Stat("권장 시청거리", (p * 3).toFixed(1), "m 이상", true),
    ]),
    h("div", { key: 3, style: { fontSize: 12, color: t.muted, padding: "0 4px" } }, `* P${pitch} ${envType} 모듈 일반 범위 기준 추정치. 전기료는 평균 전력 × 일 ${hours}시간 × 30일 × 단가로 계산했습니다. SMD/COB 타입, 방열 구조에 따라 달라질 수 있습니다.`),
  ]);
}

/* ==================================================================== */
/*  5. 거래처 · 단가 DB 관리                                              */
/* ==================================================================== */
function DatabaseManager(props) {
  const t = props.theme;
  const [tab, setTab] = useState("presets");
  const [clients, setClients] = useState([]);
  const [presets, setPresets] = useState(props.presets);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [catFilter, setCatFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const presetLabel = props.presetLabel || "제일에코";
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(presetLabel);
  const [activeVendor, setActiveVendor] = useState("jeil"); // 현재 편집 중인 거래처
  const [newVendorName, setNewVendorName] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  useEffect(() => { loadKey("sp2-clients", []).then((v) => { setClients(v); setLoaded(true); }); }, []);
  useEffect(() => { setPresets(props.presets); }, [props.presets]);

  // 거래처별 단가 전환
  const switchVendor = async (vid) => {
    setActiveVendor(vid);
    const vp = await props.loadVendorPresets(vid);
    setPresets(vp);
  };
  const handleAddVendor = async () => {
    const name = (newVendorName || "").trim();
    if (!name) return;
    const vid = await props.onAddVendor(name);
    setNewVendorName("");
    await switchVendor(vid);
    flash(`거래처 '${name}' 추가됨`);
  };
  const handleRemoveVendor = async (vid) => {
    const v = (props.vendors || []).find((v) => v.id === vid);
    if (!v || v.isDefault) { flash("기본 거래처는 삭제할 수 없습니다."); return; }
    if (!confirm(`'${v.name}' 거래처와 단가 데이터를 삭제합니다. 계속할까요?`)) return;
    await props.onRemoveVendor(vid);
    await switchVendor("jeil");
    flash("삭제됨");
  };

  const saveClients = async (next) => { setClients(next); await saveKey("sp2-clients", next); };
  const savePresets = async (next) => {
    setPresets(next);
    if (props.saveVendorPresets) await props.saveVendorPresets(activeVendor, next);
    if (activeVendor === "jeil" && props.onPresetsChange) props.onPresetsChange(next);
  };

  const addClient = () => saveClients([{ id: uid(), name: "", biznum: "", ceo: "", tel: "", addr: "", memo: "" }, ...clients]);
  const updClient = (id, f, v) => saveClients(clients.map((c) => (c.id === id ? { ...c, [f]: v } : c)));
  const delClient = (id) => saveClients(clients.filter((c) => c.id !== id));

  const addPreset = () => {
    const cat = catFilter === "전체" ? "채널" : catFilter;
    savePresets([{ id: uid(), cat, sub: "", name: "", spec: "", unit: "개", price: 0, memo: "" }, ...presets]);
  };
  const updPreset = (id, f, v) => savePresets(presets.map((c) => (c.id === id ? { ...c, [f]: v } : c)));
  const delPreset = (id) => savePresets(presets.filter((c) => c.id !== id));
  const resetPresets = async () => { if (!confirm(`${presetLabel} 기본 단가표로 초기화합니다. 직접 수정한 내용은 사라집니다. 계속할까요?`)) return; await saveKey("sp2-presets", MATERIAL_PRESETS); setPresets(MATERIAL_PRESETS); props.onPresetsChange(MATERIAL_PRESETS); flash("기본 단가로 초기화됨"); };

  // 필터링
  const cats = ["전체", ...PRESET_CATS];
  const filtered = presets.filter((p) => {
    if (catFilter !== "전체" && (p.cat || "") !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!((p.name || "") + (p.sub || "") + (p.spec || "") + (p.memo || "")).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tabBtn = (id, label) => h("button", { key: id, onClick: () => setTab(id), style: { padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === id ? t.accent : "transparent", color: tab === id ? "#fff" : t.muted, fontFamily: FONT } }, label);
  const th = (label, w) => h("th", { key: label, style: { padding: "6px 8px", width: w, textAlign: "left", color: t.muted, fontSize: 12, fontWeight: 600 } }, label);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, [
    SectionTitle(t, "거래처 · 단가 관리", "거래처 정보와 자재/노무 단가를 관리합니다. 단가는 견적서에서 바로 불러올 수 있습니다.",
      h("div", { style: { display: "flex", gap: 4, background: t.surface2, padding: 4, borderRadius: 12 } }, [tabBtn("clients", "거래처"), tabBtn("presets", "단가표")])
    ),
    tab === "clients"
      ? Card(t, { key: "c" }, [
          h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } }, [
            Btn(t, { key: 1, variant: "accent", onClick: addClient }, [Ico.plus({ size: 14 }), " 거래처 추가"]),
            toast && h("span", { key: 2, style: { fontSize: 13, color: t.green, alignSelf: "center" } }, toast),
          ]),
          loaded && clients.length === 0 && h("div", { key: 2, style: { textAlign: "center", color: t.muted, fontSize: 13, padding: "30px 0" } }, "등록된 거래처가 없습니다. '거래처 추가'를 눌러 시작하세요."),
          h("div", { key: 3, style: { overflowX: "auto" } }, clients.length > 0 && h("table", { style: { width: "100%", borderCollapse: "collapse" } }, [
            h("thead", { key: 1 }, h("tr", {}, [th("상호", 140), th("사업자번호", 120), th("대표", 80), th("연락처", 120), th("주소"), th("메모", 140), h("th", { key: "z", style: { width: 32 } })])),
            h("tbody", { key: 2 }, clients.map((c) => h("tr", { key: c.id, style: { borderTop: `1px solid ${t.divider}` } }, [
              h("td", { key: 1, style: { padding: 5 } }, TextInput(t, { value: c.name, onChange: (e) => updClient(c.id, "name", e.target.value), placeholder: "상호" })),
              h("td", { key: 2, style: { padding: 5 } }, TextInput(t, { value: c.biznum, onChange: (e) => updClient(c.id, "biznum", e.target.value), placeholder: "000-00-00000" })),
              h("td", { key: 3, style: { padding: 5 } }, TextInput(t, { value: c.ceo, onChange: (e) => updClient(c.id, "ceo", e.target.value) })),
              h("td", { key: 4, style: { padding: 5 } }, TextInput(t, { value: c.tel, onChange: (e) => updClient(c.id, "tel", e.target.value) })),
              h("td", { key: 5, style: { padding: 5 } }, TextInput(t, { value: c.addr, onChange: (e) => updClient(c.id, "addr", e.target.value) })),
              h("td", { key: 6, style: { padding: 5 } }, TextInput(t, { value: c.memo, onChange: (e) => updClient(c.id, "memo", e.target.value) })),
              h("td", { key: 7, style: { padding: 5, textAlign: "center" } }, IconBtn(t, Ico.trash, () => delClient(c.id))),
            ]))),
          ])),
        ])
      : Card(t, { key: "p" }, [
          h("div", { key: 0, style: { display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 } }, [
            h("div", { key: "a", style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, [
              Btn(t, { key: 1, variant: "accent", onClick: addPreset }, [Ico.plus({ size: 14 }), " 단가 추가"]),
              editingLabel
                ? h("div", { key: 2, style: { display: "flex", gap: 6, alignItems: "center" } }, [
                    TextInput(t, { value: labelDraft, onChange: (e) => setLabelDraft(e.target.value), placeholder: "공급처 이름", style: { width: 140 }, autoFocus: true }),
                    Btn(t, { key: 1, variant: "ghost", onClick: () => { props.onPresetLabelChange(labelDraft); setEditingLabel(false); } }, "저장"),
                  ])
                : h("button", { key: 2, onClick: () => { setLabelDraft(presetLabel); setEditingLabel(true); }, style: { display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: t.muted, fontSize: 12, fontFamily: FONT } }, [`공급처: ${presetLabel}`, Ico.edit({ size: 12 })]),
            ]),
            h("div", { key: 2, style: { display: "flex", gap: 8, alignItems: "center" } }, [
              toast && h("span", { key: 0, style: { fontSize: 13, color: t.green } }, toast),
              h("span", { key: 1, style: { fontSize: 12, color: t.muted } }, `${filtered.length}개 품목`),
              Btn(t, { key: 2, variant: "ghost", onClick: resetPresets }, `${presetLabel} 기본값 복원`),
            ]),
          ]),
          // 거래처 선택
          h("div", { key: "vendor", style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap", padding: "10px 0", borderBottom: `1px solid ${t.divider}` } }, [
            h("span", { key: 1, style: { fontSize: 12, fontWeight: 700, color: t.muted } }, "거래처"),
            ...(props.vendors || []).map((v) => h("button", { key: v.id, onClick: () => switchVendor(v.id), style: { padding: "6px 14px", borderRadius: 8, border: `1px solid ${activeVendor === v.id ? t.accent : t.divider}`, background: activeVendor === v.id ? t.accent : "transparent", color: activeVendor === v.id ? "#fff" : t.ink, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT } }, v.name + (v.isDefault ? " (기본)" : ""))),
            h("div", { key: "add", style: { display: "flex", gap: 4, alignItems: "center" } }, [
              TextInput(t, { value: newVendorName, onChange: (e) => setNewVendorName(e.target.value), placeholder: "새 거래처명", style: { width: 120, padding: "6px 8px" }, onKeyDown: (e) => { if (e.key === "Enter") handleAddVendor(); } }),
              Btn(t, { key: 1, variant: "ghost", onClick: handleAddVendor, style: { padding: "6px 10px" } }, [Ico.plus({ size: 12 }), " 추가"]),
            ]),
            activeVendor !== "jeil" && h("button", { key: "del", onClick: () => handleRemoveVendor(activeVendor), style: { background: "none", border: "none", cursor: "pointer", color: t.red, fontSize: 12, fontWeight: 600 } }, "현재 거래처 삭제"),
          ]),
          // 카테고리 필터 + 검색
          h("div", { key: 1, style: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" } }, [
            h("div", { key: "cats", style: { display: "flex", gap: 4, flexWrap: "wrap" } },
              cats.map((c) => h("button", { key: c, onClick: () => setCatFilter(c), style: { padding: "6px 12px", borderRadius: 8, border: `1px solid ${catFilter === c ? t.accent : t.divider}`, background: catFilter === c ? t.accent : "transparent", color: catFilter === c ? "#fff" : t.ink, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT } }, c))
            ),
            h("div", { key: "search", style: { flex: 1, minWidth: 160 } }, TextInput(t, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "품목·규격·비고 검색..." })),
          ]),
          h("div", { key: 2, style: { overflowX: "auto", maxHeight: "calc(100vh - 320px)", overflowY: "auto" } }, h("table", { style: { width: "100%", borderCollapse: "collapse" } }, [
            h("thead", { key: 1, style: { position: "sticky", top: 0, background: t.surface, zIndex: 1 } }, h("tr", {}, [th("구분", 90), th("중분류", 130), th("품목명"), th("규격", 100), th("단위", 60), th("단가", 100), th("비고", 150), h("th", { key: "z", style: { width: 32 } })])),
            h("tbody", { key: 2 }, (() => {
              if (filtered.length === 0) return [h("tr", { key: "empty" }, h("td", { colSpan: 8, style: { textAlign: "center", color: t.muted, fontSize: 13, padding: "30px 0" } }, "해당하는 단가가 없습니다."))];
              const rows = [];
              let lastGroup = null;
              filtered.forEach((c) => {
                const groupKey = (c.cat || "") + "|" + (c.sub || "");
                if (groupKey !== lastGroup) {
                  lastGroup = groupKey;
                  rows.push(h("tr", { key: "g-" + groupKey }, h("td", { colSpan: 8, style: { padding: "8px 8px 4px", fontSize: 11, fontWeight: 700, color: t.accent, borderTop: `2px solid ${t.divider}` } }, `${c.cat || ""}${c.sub ? " / " + c.sub : ""}`)));
                }
                rows.push(h("tr", { key: c.id, style: { borderTop: `1px solid ${t.divider}` } }, [
                  h("td", { key: 1, style: { padding: 4 } }, Sel(t, { value: c.cat || "채널", onChange: (e) => updPreset(c.id, "cat", e.target.value) }, PRESET_CATS)),
                  h("td", { key: 2, style: { padding: 4 } }, TextInput(t, { value: c.sub || "", onChange: (e) => updPreset(c.id, "sub", e.target.value), placeholder: "중분류" })),
                  h("td", { key: 3, style: { padding: 4 } }, TextInput(t, { value: c.name || "", onChange: (e) => updPreset(c.id, "name", e.target.value), placeholder: "품목명" })),
                  h("td", { key: 4, style: { padding: 4 } }, TextInput(t, { value: c.spec || "", onChange: (e) => updPreset(c.id, "spec", e.target.value), placeholder: "규격", style: { fontFamily: MONO } })),
                  h("td", { key: 5, style: { padding: 4 } }, TextInput(t, { value: c.unit || "", onChange: (e) => updPreset(c.id, "unit", e.target.value) })),
                  h("td", { key: 6, style: { padding: 4 } }, TextInput(t, { type: "number", value: c.price, onChange: (e) => updPreset(c.id, "price", Number(e.target.value) || 0), style: { fontFamily: MONO } })),
                  h("td", { key: 7, style: { padding: 4 } }, TextInput(t, { value: c.memo || "", onChange: (e) => updPreset(c.id, "memo", e.target.value) })),
                  h("td", { key: 8, style: { padding: 4, textAlign: "center" } }, IconBtn(t, Ico.trash, () => delPreset(c.id))),
                ]));
              });
              return rows;
            })()),
          ])),
          h("div", { key: 3, style: { fontSize: 11.5, color: t.muted, marginTop: 10, lineHeight: 1.6 } }, `※ ${presetLabel} 자재 단가표(VAT 별도·공급가) 기준. 단가는 시세에 따라 변동되므로 직접 수정해서 쓰세요. 수정 내용은 자동 저장되며 견적 계산기에서 바로 불러올 수 있습니다.`),
        ]),
  ]);
}

/* ==================================================================== */
/*  4. 프로젝트 대시보드 + 매출 통계/차트                                   */
/* ==================================================================== */
const STATUSES = ["상담중", "견적발송", "계약", "시공중", "완료"];

function BarChart(t, data) {
  // data: [{label, value}]
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 520, H = 180, pad = 28, bw = (W - pad * 2) / data.length;
  return h("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", height: "auto" } }, [
    ...[0.25, 0.5, 0.75, 1].map((r, i) => h("line", { key: "g" + i, x1: pad, y1: H - pad - (H - pad * 2) * r, x2: W - pad, y2: H - pad - (H - pad * 2) * r, stroke: t.divider, strokeWidth: 1 })),
    ...data.map((d, i) => {
      const bh = (d.value / max) * (H - pad * 2);
      const x = pad + i * bw + bw * 0.2, y = H - pad - bh, w = bw * 0.6;
      return h("g", { key: "b" + i }, [
        h("rect", { key: 1, x, y, width: w, height: bh, rx: 4, fill: t.accent, opacity: 0.9 }),
        h("text", { key: 2, x: x + w / 2, y: H - pad + 14, textAnchor: "middle", fontSize: 10, fill: t.muted }, d.label),
        d.value > 0 && h("text", { key: 3, x: x + w / 2, y: y - 5, textAnchor: "middle", fontSize: 9, fill: t.ink, fontWeight: 600 }, d.value >= 10000 ? (d.value / 10000).toFixed(0) + "만" : num(d.value)),
      ]);
    }),
  ]);
}

function ProjectDashboard(props) {
  const t = props.theme;
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [form, setForm] = useState({ client: "", name: "", amount: "", deadline: "" });

  useEffect(() => {
    loadKey("sp2-projects", []).then((v) => { setProjects(v); setLoaded(true); });
    loadKey("sp2-quotes", []).then(setQuotes);
    const onStorageChanged = async (e) => {
      try {
        const k = e && e.detail && e.detail.key;
        if (!k) return;
        if (k === "sp2-quotes") {
          const q = await loadKey("sp2-quotes", []);
          setQuotes(q || []);
        }
      } catch (err) { }
    };
    window.addEventListener("sp-storage-changed", onStorageChanged);
    return () => window.removeEventListener("sp-storage-changed", onStorageChanged);
  }, []);
  const persist = async (next) => { setProjects(next); await saveKey("sp2-projects", next); };

  const addProject = () => {
    if (!form.client && !form.name) return;
    const proj = { id: uid(), ...form, amount: Number(form.amount) || 0, status: "상담중", createdAt: todayISO(), quoteId: selectedQuoteId || null };
    persist([proj, ...projects]);
    setForm({ client: "", name: "", amount: "", deadline: "" });
    setSelectedQuoteId("");
  };
  const move = (id, dir) => persist(projects.map((p) => { if (p.id !== id) return p; const idx = STATUSES.indexOf(p.status); return { ...p, status: STATUSES[Math.min(Math.max(idx + dir, 0), STATUSES.length - 1)], ...(STATUSES[Math.min(Math.max(idx + dir, 0), STATUSES.length - 1)] === "완료" ? { completedAt: todayISO() } : {}) }; }));
  const remove = (id) => persist(projects.filter((p) => p.id !== id));

  // 견적 데이터 자동 분석 (발주/진행중/완료 상태 기준)
  const activeQuotes = quotes.filter((q) => q && q.status && q.status !== "작성중");
  const nowMonth = todayISO().slice(0, 7);
  let thisMonthQuotes = 0;
  let thisMonthBase = 0;
  let thisMonthSell = 0;
  let thisMonthMargin = 0;
  activeQuotes.forEach((q) => {
    if (q && q.savedAt) {
      const qMonth = q.savedAt.slice(0, 7);
      if (qMonth === nowMonth) {
        thisMonthQuotes++;
        thisMonthBase += q.baseSubtotal || 0;
        thisMonthSell += q.subtotal || 0;
        thisMonthMargin += q.marginAmount || (q.subtotal - q.baseSubtotal) || 0;
      }
    }
  });
  const totalBaseCost = activeQuotes.reduce((s, q) => s + (q.baseSubtotal || 0), 0);
  const totalSellAmount = activeQuotes.reduce((s, q) => s + (q.subtotal || 0), 0);
  const totalMargin = totalSellAmount - totalBaseCost;
  const avgMarginRate = totalBaseCost > 0 ? Math.round((totalMargin / totalBaseCost) * 100) : 0;

  // 견적 상태별 집계: 상담중, 견적발송, 계약, 시공중, 완료
  const quoteStatusCounts = { 상담중: 0, 견적발송: 0, 계약: 0, 시공중: 0, 완료: 0 };
  const mapQuoteStatus = (s) => {
    if (!s) return "상담중";
    const st = String(s).trim();
    if (st === "작성중" || /draft/i.test(st)) return "상담중";
    if (st === "발주" || st === "견적발송") return "견적발송";
    if (st === "계약") return "계약";
    if (st === "진행중" || st === "시공중") return "시공중";
    if (st === "완료") return "완료";
    return "상담중";
  };
  (quotes || []).forEach((q) => { try { const k = mapQuoteStatus(q && q.status); quoteStatusCounts[k] = (quoteStatusCounts[k] || 0) + 1; } catch (e) { } });

  // 기존 프로젝트 통계
  const contracted = projects.filter((p) => ["계약", "시공중", "완료"].includes(p.status));
  const totalPipeline = projects.reduce((s, p) => s + (p.amount || 0), 0);
  const contractedSum = contracted.reduce((s, p) => s + (p.amount || 0), 0);
  const doneSum = projects.filter((p) => p.status === "완료").reduce((s, p) => s + (p.amount || 0), 0);
  const winRate = projects.length ? Math.round((contracted.length / projects.length) * 100) : 0;

  // 월별 견적 매출 (최근 6개월, 견적 데이터 기준)
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getMonth() + 1}월` }); }
  const monthData = months.map((m) => ({ label: m.label, value: activeQuotes.filter((q) => (q.savedAt || "").slice(0, 7) === m.key).reduce((s, q) => s + (q.subtotal || q.total || 0), 0) }));
  const monthCostData = months.map((m) => ({ label: m.label, value: activeQuotes.filter((q) => (q.savedAt || "").slice(0, 7) === m.key).reduce((s, q) => s + (q.baseSubtotal || 0), 0) }));

  // Log quotes and status counts for debugging (no UI changes)
  useEffect(() => {
    try {
      const qList = quotes || [];
      console.log('sp2-quotes total:', qList.length);
      const counts = {};
      (qList || []).forEach((qq) => {
        const st = (qq && qq.status) ? qq.status : '상담중';
        counts[st] = (counts[st] || 0) + 1;
      });
      STATUSES.forEach((s) => console.log(s + ' ' + (counts[s] || 0)));
    } catch (e) { console.error('quote log error', e); }
  }, [quotes]);

  const STATUS_COLOR = { 상담중: t.muted, 견적발송: t.blue, 계약: t.accent, 시공중: t.purple, 완료: t.green };
  const KPI = (label, value, color) => Card(t, { key: label, style: { padding: 16 } }, [
    h("div", { key: 1, style: { fontSize: 12, color: t.muted, fontWeight: 600 } }, label),
    h("div", { key: 2, style: { fontSize: 22, fontWeight: 700, fontFamily: MONO, color: color || t.ink, marginTop: 6 } }, value),
  ]);

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, [
    SectionTitle(t, "프로젝트 대시보드", "견적 데이터와 프로젝트 파이프라인이 자동으로 연동됩니다."),
    h("div", { key: "debug", style: { whiteSpace: "pre-line", fontSize: 13, color: t.muted, marginTop: 4 } }, [
      h("div", { key: "dbg-title", style: { fontWeight: 700, color: t.ink } }, "DEBUG"),
      h("div", { key: "dbg-total" }, `quotes: ${ (quotes || []).length }`),
      h("div", { key: "dbg-1" }, `상담중: ${ quoteStatusCounts['상담중'] || 0 }`),
      h("div", { key: "dbg-2" }, `견적발송: ${ quoteStatusCounts['견적발송'] || 0 }`),
      h("div", { key: "dbg-3" }, `계약: ${ quoteStatusCounts['계약'] || 0 }`),
      h("div", { key: "dbg-4" }, `시공중: ${ quoteStatusCounts['시공중'] || 0 }`),
      h("div", { key: "dbg-5" }, `완료: ${ quoteStatusCounts['완료'] || 0 }`),
      h("div", { key: "dbg-json", style: { marginTop: 12, whiteSpace: "pre-wrap", fontFamily: MONO, fontSize: 11, color: t.accent } }, quotes && quotes[0] ? JSON.stringify(quotes[0], null, 2) : "No quotes"),
    ]),
    // 견적 기반 원가/마진 요약
    activeQuotes.length > 0 && h("div", { key: "q-kpi", style: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 } }, [
      KPI("발주·진행 건수", activeQuotes.length + "건"),
      KPI("총 원가 지출", won(totalBaseCost)),
      KPI("총 판매 금액", won(totalSellAmount), t.blue),
      KPI("총 마진 이익", won(totalMargin), totalMargin > 0 ? t.green : t.red),
      KPI("평균 마진율", (totalBaseCost > 0 ? avgMarginRate : 0) + "%", t.accent),
    ]),
    // 이번 달 요약
    h("div", { key: "month-kpi", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
      KPI("이번 달 견적", thisMonthQuotes + "건"),
      KPI("이번 달 원가", won(thisMonthBase)),
      KPI("이번 달 판매", won(thisMonthSell), t.blue),
      KPI("이번 달 마진", won(thisMonthMargin), thisMonthMargin > 0 ? t.green : t.red),
    ]),
    // 기존 파이프라인 KPI
    h("div", { key: "kpi", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 } }, [
      KPI("전체 파이프라인", won(totalPipeline)),
      KPI("계약 금액", won(contractedSum), t.accent),
      KPI("완료 매출", won(doneSum), t.green),
      KPI("수주 전환율", winRate + "%", t.blue),
    ]),
    // 차트 + 입력
    h("div", { key: "chart", style: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 } }, [
      Card(t, { key: 1 }, [h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 12 } }, "최근 6개월 견적 매출 (발주/진행/완료)"), BarChart(t, monthData), h("div", { key: 2, style: { fontSize: 11, color: t.muted, marginTop: 8 } }, "※ 견적계산기에서 '발주' 이상 상태로 저장된 견적이 자동으로 집계됩니다.")]),
      Card(t, { key: 2 }, [
        h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 12 } }, "프로젝트 추가"),
        h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 10 } }, [
          Field(t, "거래처", TextInput(t, { value: form.client, onChange: (e) => setForm({ ...form, client: e.target.value }) })),
          Field(t, "프로젝트명", TextInput(t, { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) })),
          h("div", { key: 3, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, [
            Field(t, "금액", TextInput(t, { type: "number", value: form.amount, onChange: (e) => setForm({ ...form, amount: e.target.value }), style: { fontFamily: MONO } })),
            Field(t, "마감일", TextInput(t, { type: "date", value: form.deadline, onChange: (e) => setForm({ ...form, deadline: e.target.value }) })),
          ]),
          Btn(t, { variant: "accent", onClick: addProject }, [Ico.plus({ size: 14 }), " 추가"]),
        ]),
      ]),
    ]),
    // 칸반
    loaded && h("div", { key: "kanban", style: { display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`, gap: 12 } },
      STATUSES.map((status) => h("div", { key: status, style: { display: "flex", flexDirection: "column", gap: 8 } }, [
        h("div", { key: 1, style: { display: "flex", alignItems: "center", gap: 6, padding: "0 4px" } }, [
          h("span", { key: 1, style: { width: 8, height: 8, borderRadius: 99, background: STATUS_COLOR[status] } }),
          h("span", { key: 2, style: { fontSize: 13, fontWeight: 700, color: t.ink } }, status),
          h("span", { key: 3, style: { fontSize: 12, color: t.muted } }, projects.filter((p) => p.status === status).length),
        ]),
        h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 8, minHeight: 60 } },
          projects.filter((p) => p.status === status).map((p) => Card(t, { key: p.id, style: { padding: 12 } }, [
            h("div", { key: 1, style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, [
              h("div", { key: 1 }, [h("div", { key: 1, style: { fontSize: 13, fontWeight: 700, color: t.ink } }, p.name || "(제목 없음)"), h("div", { key: 2, style: { fontSize: 12, color: t.muted, marginTop: 2 } }, p.client || "-")]),
              IconBtn(t, Ico.x, () => remove(p.id)),
            ]),
            h("div", { key: 2, style: { marginTop: 8, fontSize: 13, fontFamily: MONO, fontWeight: 700, color: t.accent } }, won(p.amount)),
            p.deadline && h("div", { key: 3, style: { fontSize: 11, color: t.muted, marginTop: 2 } }, "마감 " + p.deadline),
            h("div", { key: 4, style: { display: "flex", justifyContent: "space-between", marginTop: 10 } }, [
              h("button", { key: 1, disabled: status === STATUSES[0], onClick: () => move(p.id, -1), style: { background: "none", border: "none", cursor: "pointer", color: t.muted, opacity: status === STATUSES[0] ? 0.3 : 1 } }, Ico.left({ size: 16 })),
              h("button", { key: 2, disabled: status === STATUSES[STATUSES.length - 1], onClick: () => move(p.id, 1), style: { background: "none", border: "none", cursor: "pointer", color: t.muted, opacity: status === STATUSES[STATUSES.length - 1] ? 0.3 : 1 } }, Ico.right({ size: 16 })),
            ]),
          ]))
        ),
      ]))
    ),
  ]);
}

/* ==================================================================== */
/*  회사 정보 설정 (견적서 PDF에 들어감)                                    */
/* ==================================================================== */
const DEFAULT_COMPANY = { name: "싸인플러스 (SIGNPLUS)", biznum: "000-00-00000", ceo: "대표자명", addr: "강원특별자치도 춘천시 ○○로 123", tel: "033-000-0000", fax: "033-000-0001", email: "signplus@naver.com" };

/* ==================================================================== */
/*  루트                                                                 */
/* ==================================================================== */
const NAV = [
  { id: "quote", label: "견적 계산기", icon: Ico.calc },
  { id: "brief", label: "시안 의뢰서", icon: Ico.file },
  { id: "led", label: "LED 계산기", icon: Ico.zap },
  { id: "dashboard", label: "프로젝트 대시보드", icon: Ico.grid },
  { id: "db", label: "거래처 · 단가", icon: Ico.book },
];

/* ==================================================================== */
/*  라이선스(시리얼) 인증 화면                                              */
/* ==================================================================== */
function LicenseGate(props) {
  const t = props.theme;
  const [prefix, setPrefix] = useState("SPX");
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const wasExpired = props.expiredInfo && props.expiredInfo.expired;

  const formatSerial = (v) => {
    let clean = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let detectedPrefix = "SPX";
    if (clean.startsWith("SPXA")) { detectedPrefix = "SPXA"; clean = clean.slice(4); }
    else if (clean.startsWith("SPX")) { clean = clean.slice(3); }
    setPrefix(detectedPrefix);
    clean = clean.slice(0, 16);
    const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12), clean.slice(12, 16)].filter(Boolean);
    return parts.join("-");
  };

  const activate = async () => {
    setError(""); setChecking(true);
    try {
      const full = `${prefix}-${serial}`;
      const res = await window.license.activate(full);
      if (res && res.ok) { props.onActivated(); }
      else setError((res && res.error) || "인증에 실패했습니다.");
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  return h("div", { style: { height: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT } },
    h("div", { style: { width: 420, background: t.surface, border: `1px solid ${t.divider}`, borderRadius: 20, padding: 36, textAlign: "center" } }, [
      h("div", { key: 1, style: { fontSize: 20, fontWeight: 800, color: t.ink, marginBottom: 4 } }, ["Signplus", h("span", { key: 1, style: { color: t.accent } }, "+")]),
      h("div", { key: 2, style: { fontSize: 13, color: t.muted, marginBottom: wasExpired ? 8 : 28 } }, "정품 인증이 필요합니다"),
      wasExpired && h("div", { key: "exp", style: { fontSize: 12, color: t.red, background: t.red + "18", borderRadius: 8, padding: "8px 10px", marginBottom: 20, fontWeight: 600 } }, "사용 기간(30일)이 만료되었습니다. 새 시리얼을 입력해주세요."),
      h("div", { key: 3, style: { textAlign: "left", marginBottom: 8 } }, [
        h("label", { key: 1, style: { fontSize: 12, fontWeight: 600, color: t.muted } }, "시리얼 번호"),
      ]),
      h("input", {
        key: 4, value: serial, onChange: (e) => setSerial(formatSerial(e.target.value)),
        placeholder: "SPX-XXXX-XXXX-XXXX-XXXX",
        onKeyDown: (e) => { if (e.key === "Enter" && serial.length >= 16) activate(); },
        style: { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${error ? t.red : t.divider}`, fontFamily: MONO, fontSize: 15, letterSpacing: 1, textAlign: "center", outline: "none", boxSizing: "border-box", background: t.bg, color: t.ink, marginBottom: 14 },
      }),
      error && h("div", { key: 5, style: { fontSize: 12.5, color: t.red, marginBottom: 14, fontWeight: 600 } }, error),
      Btn(t, { key: 6, variant: "accent", onClick: activate, disabled: checking || serial.replace(/-/g, "").length < 16, style: { width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 14 } }, checking ? "확인 중..." : "인증하기"),
      h("div", { key: 7, style: { fontSize: 11, color: t.muted, marginTop: 20, lineHeight: 1.6 } }, "일반 시리얼은 발급일로부터 30일간 사용 가능합니다.\n기간 만료 시 새 시리얼을 발급받아 다시 입력해주세요.\n문의사항은 공급처에 연락해주세요."),
    ])
  );
}


function App() {
  const [mode, setMode] = useState("light");
  const [tab, setTab] = useState("quote");
  const [presets, setPresets] = useState(MATERIAL_PRESETS);
  const [presetLabel, setPresetLabel] = useState("제일에코");
  const [vendors, setVendors] = useState([{ id: "jeil", name: "제일에코", isDefault: true }]);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [ready, setReady] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [license, setLicense] = useState(null); // null=확인중, {activated:bool}

  const checkLicense = async () => {
    if (window.license && window.license.status) {
      const st = await window.license.status();
      setLicense(st);
    } else {
      setLicense({ activated: true }); // license API가 없는 개발/테스트 환경은 통과
    }
  };

  useEffect(() => {
    (async () => {
      const m = await loadKey("sp2-theme", "light");
      const pr = await loadKey("sp2-presets", MATERIAL_PRESETS);
      const co = await loadKey("sp2-company", DEFAULT_COMPANY);
      const pl = await loadKey("sp2-preset-label", "제일에코");
      const vd = await loadKey("sp2-vendors", [{ id: "jeil", name: "제일에코", isDefault: true }]);
      setMode(m); setPresets(pr && pr.length ? pr : MATERIAL_PRESETS); setCompany(co); setPresetLabel(pl);
      setVendors(vd && vd.length ? vd : [{ id: "jeil", name: "제일에코", isDefault: true }]);
      setReady(true);
      await checkLicense();
    })();
  }, []);

  const t = THEMES[mode];
  const toggleMode = async () => { const nm = mode === "light" ? "dark" : "light"; setMode(nm); await saveKey("sp2-theme", nm); };
  const changePresets = (next) => setPresets(next);
  const changePresetLabel = async (v) => { const val = (v || "").trim() || "제일에코"; setPresetLabel(val); await saveKey("sp2-preset-label", val); };
  const saveCompany = async (c) => { setCompany(c); await saveKey("sp2-company", c); };

  // 거래처 관리
  const saveVendors = async (next) => { setVendors(next); await saveKey("sp2-vendors", next); };
  const addVendor = async (name) => {
    const id = "v-" + uid();
    const next = [...vendors, { id, name, isDefault: false }];
    await saveVendors(next);
    await saveKey("sp2-presets-" + id, []); // 빈 단가로 시작
    return id;
  };
  const removeVendor = async (id) => {
    const v = vendors.find((v) => v.id === id);
    if (!v || v.isDefault) return;
    await saveVendors(vendors.filter((v) => v.id !== id));
  };
  const loadVendorPresets = async (vendorId) => {
    if (vendorId === "jeil") {
      const pr = await loadKey("sp2-presets", MATERIAL_PRESETS);
      return pr && pr.length ? pr : MATERIAL_PRESETS;
    }
    return await loadKey("sp2-presets-" + vendorId, []);
  };
  const saveVendorPresets = async (vendorId, next) => {
    if (vendorId === "jeil") {
      setPresets(next);
      await saveKey("sp2-presets", next);
    } else {
      await saveKey("sp2-presets-" + vendorId, next);
    }
  };
  const showBackupMsg = (m) => { setBackupMsg(m); setTimeout(() => setBackupMsg(""), m.includes("실패") ? 6000 : 3000); };
  const handleBackupExport = async () => {
    if (!window.backup || !window.backup.export) { showBackupMsg("백업 기능을 사용할 수 없습니다."); return; }
    try {
      const res = await window.backup.export();
      if (res && res.ok) showBackupMsg(`백업 완료 (${res.count}개 항목)`);
      else if (res && res.canceled) { /* 취소 */ }
      else showBackupMsg("백업 실패: " + ((res && res.error) || "알 수 없는 오류"));
    } catch (err) {
      showBackupMsg("백업 실패: " + (err && err.message ? err.message : String(err)));
    }
  };
  const handleBackupImport = async () => {
    if (!window.backup || !window.backup.import) { showBackupMsg("복원 기능을 사용할 수 없습니다."); return; }
    if (!confirm("백업 파일의 내용으로 현재 데이터를 덮어씁니다. 계속할까요?\n(복원 후 앱이 자동으로 새로고침됩니다)")) return;
    try {
      const res = await window.backup.import();
      if (res && res.ok) {
        showBackupMsg(`복원 완료 (${res.count}개 항목) — 새로고침 중...`);
        setTimeout(() => window.location.reload(), 900);
      } else if (res && res.canceled) { /* 취소 */ }
      else showBackupMsg("복원 실패: " + ((res && res.error) || "알 수 없는 오류"));
    } catch (err) {
      showBackupMsg("복원 실패: " + (err && err.message ? err.message : String(err)));
    }
  };

  if (!ready || license === null) return h("div", { style: { height: "100vh", background: THEMES.light.bg } });
  if (!license.activated) return h(LicenseGate, { theme: THEMES.light, onActivated: checkLicense, expiredInfo: license });

  return h("div", { style: { display: "flex", height: "100vh", background: t.bg, fontFamily: FONT } }, [
    // 사이드바
    h("div", { key: "side", style: { width: 224, background: t.surface, borderRight: `1px solid ${t.divider}`, padding: "20px 12px", display: "flex", flexDirection: "column" } }, [
      h("div", { key: 1, style: { padding: "4px 10px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, [
        h("div", { key: 1 }, [
          h("div", { key: 1, style: { fontSize: 16, fontWeight: 800, color: t.ink, letterSpacing: -0.3 } }, ["Signplus", h("span", { key: 1, style: { color: t.accent } }, "+")]),
          h("div", { key: 2, style: { fontSize: 11.5, color: t.muted, marginTop: 2 } }, `통합 업무 툴 v${APP_VERSION}`),
        ]),
        h("button", { key: 2, onClick: toggleMode, title: "테마 전환", style: { background: t.surface2, border: `1px solid ${t.divider}`, borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: t.ink, display: "flex", alignItems: "center", justifyContent: "center" } }, mode === "light" ? Ico.moon({ size: 15 }) : Ico.sun({ size: 15 })),
      ]),
      h("div", { key: 2, style: { display: "flex", flexDirection: "column", gap: 2, flex: 1 } }, NAV.map((n) => {
        const active = tab === n.id;
        return h("button", { key: n.id, onClick: () => setTab(n.id), style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? t.accentSoft : "transparent", color: active ? t.accent : t.ink, fontSize: 13.5, fontWeight: active ? 700 : 500, fontFamily: FONT, textAlign: "left" } }, [
          n.icon({ size: 16 }),
          h("span", { key: 2, style: { flex: 1 } }, n.label),
          active && h("span", { key: 3, style: { width: 6, height: 6, borderRadius: 99, background: t.accent, boxShadow: `0 0 6px ${t.accent}` } }),
        ]);
      })),
      // 회사정보 설정 버튼
      h("button", { key: 3, onClick: () => setCompanyOpen(true), style: { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 10, border: `1px solid ${t.divider}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: 12.5, fontWeight: 600, fontFamily: FONT, marginBottom: 6 } }, [h("span", { key: 1, style: { display: "inline-flex" } }, Ico.edit({ size: 14 })), h("span", { key: 2 }, " 회사 정보 설정")]),
      // 데이터 백업/복원 버튼
      h("div", { key: 4, style: { display: "flex", gap: 6 } }, [
        h("button", { key: 1, onClick: handleBackupExport, title: "지금까지 저장된 견적·시안의뢰서·거래처·단가 전부를 파일 하나로 내보냅니다.", style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", borderRadius: 10, border: `1px solid ${t.divider}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: 11.5, fontWeight: 600, fontFamily: FONT } }, [Ico.download({ size: 13 }), "백업"]),
        h("button", { key: 2, onClick: handleBackupImport, title: "백업 파일을 불러와 데이터를 복원합니다. (재설치·새 컴퓨터 이전 시 사용)", style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", borderRadius: 10, border: `1px solid ${t.divider}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: 11.5, fontWeight: 600, fontFamily: FONT } }, [Ico.book({ size: 13 }), "복원"]),
      ]),
      backupMsg && h("div", { key: 5, style: { fontSize: 11, color: backupMsg.includes("실패") ? t.red : t.green, marginTop: 6, textAlign: "center", fontWeight: 600 } }, backupMsg),
      license && license.activated && license.type === "customer" && typeof license.daysLeft === "number" && h("div", { key: 6, style: { marginTop: 8, padding: "8px 10px", borderRadius: 10, background: license.daysLeft <= 7 ? t.red + "18" : t.surface2, border: `1px solid ${license.daysLeft <= 7 ? t.red + "44" : t.divider}`, textAlign: "center" } }, [
        h("div", { key: 1, style: { fontSize: 16, fontWeight: 800, color: license.daysLeft <= 7 ? t.red : t.accent, fontFamily: MONO } }, license.daysLeft <= 0 ? "만료됨" : `${license.daysLeft}일`),
        h("div", { key: 2, style: { fontSize: 10.5, color: license.daysLeft <= 7 ? t.red : t.muted, marginTop: 2, fontWeight: 600 } }, license.daysLeft <= 0 ? "사용기간 만료 · 갱신 필요" : `사용기간 남음${license.daysLeft <= 7 ? " · 곧 갱신 필요" : ""}`),
        license.expiresAt && h("div", { key: 3, style: { fontSize: 10, color: t.muted, marginTop: 4, fontFamily: MONO } }, `만료: ${String(license.expiresAt).slice(0, 10)}`),
      ]),
      license && license.activated && license.type === "admin" && h("div", { key: 6, style: { marginTop: 8, padding: "6px 10px", borderRadius: 10, background: t.surface2, textAlign: "center", fontSize: 10.5, color: t.muted } }, "관리자 라이선스 (무제한)"),
    ]),
    // 콘텐츠
    h("div", { key: "main", style: { flex: 1, padding: 28, overflowY: "auto" } }, [
      tab === "quote" && h(QuoteCalculator, { key: "q", theme: t, presets, company, presetLabel, vendors, loadVendorPresets }),
      tab === "brief" && h(DesignBrief, { key: "b", theme: t }),
      tab === "led" && h(LedCalculator, { key: "l", theme: t }),
      tab === "dashboard" && h(ProjectDashboard, { key: "d", theme: t }),
      tab === "db" && h(DatabaseManager, { key: "db", theme: t, presets, onPresetsChange: changePresets, presetLabel, onPresetLabelChange: changePresetLabel, vendors, onAddVendor: addVendor, onRemoveVendor: removeVendor, loadVendorPresets, saveVendorPresets }),
    ]),
    // 회사정보 모달
    companyOpen && CompanyModal(t, company, saveCompany, () => setCompanyOpen(false)),
  ]);
}

function CompanyModal(t, company, onSave, onClose) {
  return h(CompanyModalInner, { theme: t, company, onSave, onClose });
}
function CompanyModalInner(props) {
  const t = props.theme;
  const [c, setC] = useState(props.company);
  const set = (k) => (e) => setC((p) => ({ ...p, [k]: e.target.value }));
  return h("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }, onClick: props.onClose }, [
    h("div", { key: 1, onClick: (e) => e.stopPropagation(), style: { background: t.surface, borderRadius: 16, padding: 24, width: 500, maxHeight: "88vh", overflowY: "auto", border: `1px solid ${t.divider}` } }, [
      h("div", { key: 1, style: { fontSize: 17, fontWeight: 700, color: t.ink, marginBottom: 4 } }, "공급자 (회사) 정보"),
      h("div", { key: 2, style: { fontSize: 12.5, color: t.muted, marginBottom: 16 } }, "견적서 PDF 우측 상단·하단·작성자란에 표시됩니다."),
      h("div", { key: 3, style: { display: "flex", flexDirection: "column", gap: 12 } }, [
        h("div", { key: 1, style: { display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 } }, [
          Field(t, "상호", TextInput(t, { value: c.name, onChange: set("name"), placeholder: "싸인플러스 (SIGNPLUS)" })),
          Field(t, "대표자", TextInput(t, { value: c.ceo, onChange: set("ceo"), placeholder: "홍길동" })),
        ]),
        Field(t, "사업자등록번호", TextInput(t, { value: c.biznum, onChange: set("biznum"), placeholder: "123-45-67890" })),
        Field(t, "주소", TextInput(t, { value: c.addr, onChange: set("addr"), placeholder: "강원특별자치도 춘천시 ○○로 123" })),
        h("div", { key: 2, style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, [
          Field(t, "TEL", TextInput(t, { value: c.tel, onChange: set("tel"), placeholder: "033-123-4567" })),
          Field(t, "FAX", TextInput(t, { value: c.fax, onChange: set("fax"), placeholder: "033-123-4568" })),
        ]),
        Field(t, "E-mail", TextInput(t, { value: c.email, onChange: set("email"), placeholder: "signplus@naver.com" })),
      ]),
      h("div", { key: 4, style: { fontSize: 11, color: t.muted, marginTop: 12, lineHeight: 1.6 } }, "※ 로고·도장 이미지는 견적 계산기 화면에서 등록합니다. 로고를 등록하지 않으면 'SIGNPLUS+' 텍스트 로고가 표시됩니다."),
      h("div", { key: 5, style: { display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" } }, [
        Btn(t, { key: 1, variant: "ghost", onClick: props.onClose }, "취소"),
        Btn(t, { key: 2, variant: "accent", onClick: () => { props.onSave(c); props.onClose(); } }, "저장"),
      ]),
    ]),
  ]);
}

/* ---- 마운트 ---- */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));
