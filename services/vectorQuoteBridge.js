/* ==================================================================== */
/*  VectorQuoteBridge — AI 도면 분석 결과(집계 통계 + LedEngine 제작 기준   */
/*  계산)를 기존 견적 계산기가 쓰는 품목(item) 배열 형식({id,name,spec,     */
/*  unit,unitPrice,qty,marginOverride})으로 변환하는 순수 함수만 담당한다.  */
/*  실제 단가/모듈수 계산은 renderer(app.js)가 LedEngine·기존 LED 계산      */
/*  공식을 통해 넘겨준다 — 이 파일은 "숫자를 품목 모양으로 조립"하는        */
/*  책임만 진다.                                                          */
/* ==================================================================== */
(function (root) {
  "use strict";

  const genId = () => "va-" + Math.random().toString(36).slice(2, 10);

  function findPreset(presets, predicate) {
    return (presets || []).find(predicate) || null;
  }

  // spec/name에서 숫자를 뽑아 그 값이 target에 가장 가까운 preset을 찾는다(채널 각수·SMPS 모듈수
  // 브래킷처럼 "표에 있는 여러 규격 중 요청값에 가장 가까운 것"을 골라야 하는 경우 공용으로 사용).
  // extraFilter로 카테고리/서브카테고리를 더 좁힐 수 있다.
  function nearestBySpecNumber(presets, cat, numberRe, target, extraFilter) {
    const matches = (presets || []).filter((p) => p.cat === cat && numberRe.test(p.spec || "") && (!extraFilter || extraFilter(p)));
    if (!matches.length) return null;
    let best = null, bestDiff = Infinity;
    for (const p of matches) {
      const n = parseFloat(numberRe.exec(p.spec)[1]);
      const diff = Math.abs(n - target);
      if (diff < bestDiff) { bestDiff = diff; best = p; }
    }
    return best;
  }

  // "채널" 카테고리 단가표 항목만 뽑아 "제품 선택" 드롭다운 목록으로 쓴다 — 목록 자체가
  // 환경설정 > 단가표에서 자동 생성되므로, 표에 상품을 추가/수정하면 다음부터 그대로 반영된다.
  function listChannelPresets(presets) {
    return (presets || []).filter((p) => p.cat === "채널");
  }

  // 환경설정 > 단가표(presets)를 유일한 기준으로 삼아 AI 도면 분석 자동생성 품목의 단가를 찾는다.
  // 표에 해당 항목이 없으면 임의의 숫자를 지어내지 않고 0으로 둔다(사용자가 견적 화면에서 직접
  // 입력하거나, 단가표에 항목을 추가하면 다음부터 자동으로 반영된다).
  // ctx: { avgSizeMm, ledType, smpsCap, channelPresetId }
  // channelPresetId를 지정하면(사용자가 "제품 선택" 드롭다운에서 직접 고른 경우) 자동 추천
  // (평균 각수에 가장 가까운 항목) 대신 그 항목의 단가를 그대로 쓴다 — 나머지(LED/SMPS/조립/
  // 전선/실리콘)는 항상 단가표에서 다시 조회하므로, 어떤 채널 상품을 고르든 함께 자동 반영된다.
  function resolveUnitPrices(presets, ctx) {
    const list = presets || [];
    const c = ctx || {};

    const channelPreset = (c.channelPresetId ? findPreset(list, (p) => p.id === c.channelPresetId) : null)
      || nearestBySpecNumber(list, "채널", /^(\d+)\s*각$/, c.avgSizeMm || 0, (p) => (p.sub || "").includes("갈바후광"))
      || nearestBySpecNumber(list, "채널", /^(\d+)\s*각$/, c.avgSizeMm || 0);
    // "갈바"는 채널 카테고리(가공+원자재 이미 포함) 밖에서는 지주/프레임 등 무관한 품목 이름에도
    // 흔히 등장해 오검색 위험이 크다 — 신뢰할 수 있는 별도 "원자재" 카테고리가 생기기 전까지는
    // 0으로 두고 사용자가 직접 입력하게 한다(잘못된 단가를 지어내는 것보다 안전).
    const galvaPreset = null;
    const generalAssemblyPreset = findPreset(list, (p) => p.cat === "시공/경비" && /조립/.test(p.name || ""));
    const acrylicPreset = findPreset(list, (p) => /아크릴/.test((p.name || "") + (p.spec || "")));

    const wattToken = ((c.ledType || "").match(/[\d.]+W/i) || [])[0];
    const countToken = ((c.ledType || "").match(/\d+구/) || [])[0];
    const modulePreset = findPreset(list, (p) => p.cat === "LED" && p.sub === "LED모듈" && p.name !== "LED 조립비"
      && (!wattToken || (p.name + p.spec).includes(wattToken)) && (!countToken || (p.name + p.spec).includes(countToken)))
      || findPreset(list, (p) => p.cat === "LED" && p.sub === "LED모듈" && p.name !== "LED 조립비");
    const ledAssemblyPreset = findPreset(list, (p) => p.cat === "LED" && p.name === "LED 조립비");
    const smpsPreset = nearestBySpecNumber(list, "LED", /(\d+)\s*모듈/, c.smpsCap || 0, (p) => p.sub === "SMPS");
    const wirePreset = findPreset(list, (p) => /전선/.test((p.name || "") + (p.spec || "")));
    const siliconePreset = findPreset(list, (p) => /실리콘/.test((p.name || "") + (p.spec || "")) && !/조립/.test(p.name || ""));

    return {
      channelUnitPrice: channelPreset ? channelPreset.price : 0,
      galvaUnitPrice: galvaPreset ? galvaPreset.price : 0,
      generalAssemblyUnitPrice: generalAssemblyPreset ? generalAssemblyPreset.price : 0,
      acrylicUnitPricePerSqM: acrylicPreset ? acrylicPreset.price : 0,
      moduleUnitPrice: modulePreset ? modulePreset.price : 0,
      assemblyUnitPrice: ledAssemblyPreset ? ledAssemblyPreset.price : 0,
      smpsUnitPrice: smpsPreset ? smpsPreset.price : 0,
      wireUnitPrice: wirePreset ? wirePreset.price : 0,
      siliconeUnitPrice: siliconePreset ? siliconePreset.price : 0,
    };
  }

  // opts: {
  //   glyphCount, totalAreaSqM, channelAvgSizeMm, channelUnitPrice,
  //   galvaUnitPrice, acrylicUnitPricePerSqM,
  //   moduleCount, moduleUnitPrice, ledType, assemblyUnitPrice,
  //   smpsCap, smpsQty, smpsUnitPrice,
  //   wireLengthM, wireUnitPrice, siliconeQty, siliconeUnitPrice,
  //   generalAssemblyUnitPrice
  // }
  function buildQuoteItems(opts) {
    const o = opts || {};
    const items = [];

    if (o.glyphCount > 0) {
      items.push({
        id: genId(),
        name: "채널 가공비 (도면 분석 자동생성)",
        spec: `평균 ${Math.round(o.channelAvgSizeMm || 0)}각 · ${o.glyphCount}자`,
        unit: "개",
        unitPrice: Math.round(o.channelUnitPrice || 0),
        qty: o.glyphCount,
        marginOverride: null,
      });
      items.push({
        id: genId(),
        name: "갈바 원자재비 (도면 분석 자동생성)",
        spec: "채널 가공비에 포함되지 않은 별도 원자재 필요 시 단가 입력",
        unit: "개",
        unitPrice: Math.round(o.galvaUnitPrice || 0),
        qty: o.glyphCount,
        marginOverride: null,
      });
      items.push({
        id: genId(),
        name: "조립비 (도면 분석 자동생성)",
        spec: `채널·아크릴·LED 조립 · ${o.glyphCount}자`,
        unit: "개",
        unitPrice: Math.round(o.generalAssemblyUnitPrice || 0),
        qty: o.glyphCount,
        marginOverride: null,
      });
    }

    if (o.totalAreaSqM > 0) {
      items.push({
        id: genId(),
        name: "아크릴 판넬 (도면 분석 자동생성)",
        spec: `총 면적 ${o.totalAreaSqM.toFixed(2)}㎡`,
        unit: "㎡",
        unitPrice: Math.round(o.acrylicUnitPricePerSqM || 0),
        qty: Math.round(o.totalAreaSqM * 100) / 100,
        marginOverride: null,
      });
    }

    if (o.moduleCount > 0) {
      items.push({
        id: genId(),
        name: `LED 모듈 (도면 분석 · 제작 기준 자동계산)`,
        spec: `${o.ledType || "3구 1W"} · 외곽길이 기준`,
        unit: "개",
        unitPrice: Math.round(o.moduleUnitPrice || 0),
        qty: o.moduleCount,
        marginOverride: null,
      });
      items.push({
        id: genId(),
        name: "LED 조립비 (도면 분석 자동생성)",
        spec: "조립비 · 실리콘작업",
        unit: "개",
        unitPrice: Math.round(o.assemblyUnitPrice || 0),
        qty: o.moduleCount,
        marginOverride: null,
      });
    }

    if (o.smpsQty > 0) {
      items.push({
        id: genId(),
        name: "SMPS (도면 분석 자동생성)",
        spec: `${o.smpsCap}개용 × ${o.smpsQty}`,
        unit: "개",
        unitPrice: Math.round(o.smpsUnitPrice || 0),
        qty: o.smpsQty,
        marginOverride: null,
      });
    }

    if (o.wireLengthM > 0) {
      items.push({
        id: genId(),
        name: "전선 (도면 분석 자동생성)",
        spec: `LED 배선 · 예상 ${o.wireLengthM}m`,
        unit: "m",
        unitPrice: Math.round(o.wireUnitPrice || 0),
        qty: o.wireLengthM,
        marginOverride: null,
      });
    }

    if (o.siliconeQty > 0) {
      items.push({
        id: genId(),
        name: "실리콘 (도면 분석 자동생성)",
        spec: "LED 방수 포인팅",
        unit: "개",
        unitPrice: Math.round(o.siliconeUnitPrice || 0),
        qty: o.siliconeQty,
        marginOverride: null,
      });
    }

    return items;
  }

  const VectorQuoteBridge = { buildQuoteItems, resolveUnitPrices, listChannelPresets };
  if (typeof window !== "undefined") window.VectorQuoteBridge = VectorQuoteBridge;
})(typeof globalThis !== "undefined" ? globalThis : this);
