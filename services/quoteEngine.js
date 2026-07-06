/* ==================================================================== */
/*  QuoteEngine — 견적 계산기(QuoteCalculator)의 순수 계산 로직.            */
/*  원가(unitPrice)에 마진율을 적용한 판매단가·합계·부가세·견적번호 생성을   */
/*  UI 컴포넌트에서 분리했다. 공식/반올림 방식은 기존 QuoteCalculator와     */
/*  완전히 동일하며, 동작 변경 없이 위치만 옮긴 것이다.                     */
/* ==================================================================== */
(function (root) {
  "use strict";

  // 개별 마진율(marginOverride)이 설정된 품목은 전체 마진율 대신 그 값을 사용
  function effectiveMargin(item, marginRate) {
    const i = item || {};
    return (i.marginOverride === null || i.marginOverride === undefined || i.marginOverride === "")
      ? (Number(marginRate) || 0)
      : (Number(i.marginOverride) || 0);
  }

  function sellPrice(item, marginRate) {
    const i = item || {};
    return Math.round((Number(i.unitPrice) || 0) * (1 + effectiveMargin(i, marginRate) / 100));
  }

  function lineTotal(item, marginRate) {
    const i = item || {};
    return sellPrice(i, marginRate) * (Number(i.qty) || 0);
  }

  function baseLineTotal(item) {
    const i = item || {};
    return (Number(i.unitPrice) || 0) * (Number(i.qty) || 0);
  }

  // items 전체에 대한 원가 합계/판매 합계/부가세/마진액을 한 번에 계산
  function computeTotals(items, marginRate) {
    const list = items || [];
    const subtotal = list.reduce((s, i) => s + lineTotal(i, marginRate), 0);
    const vat = Math.round(subtotal * 0.1);
    const total = subtotal + vat;
    const baseSubtotal = list.reduce((s, i) => s + baseLineTotal(i), 0);
    const marginAmount = subtotal - baseSubtotal;
    return { subtotal, vat, total, baseSubtotal, marginAmount };
  }

  // 견적번호 자동 생성: SP-YYYY-NNNN (연도별 순번)
  function genQuoteNo(existing) {
    const year = new Date().getFullYear();
    const prefix = `SP-${year}-`;
    const nums = (existing || [])
      .map((r) => r.quoteNo)
      .filter((q) => q && q.startsWith(prefix))
      .map((q) => parseInt(q.slice(prefix.length), 10) || 0);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + String(next).padStart(4, "0");
  }

  const QuoteEngine = { effectiveMargin, sellPrice, lineTotal, baseLineTotal, computeTotals, genQuoteNo };
  if (typeof module !== "undefined" && module.exports) module.exports = QuoteEngine;
  if (typeof window !== "undefined") window.QuoteEngine = QuoteEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
