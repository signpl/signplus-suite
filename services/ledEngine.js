/* ==================================================================== */
/*  LedEngine — "제작 기준" LED/SMPS/전선 계산 엔진. 기존 LED 계산기(면적    */
/*  기반, renderer/app.js의 calcLedModuleCount/recommendSmps)와는 완전히   */
/*  별개의 서비스다 — AI 도면 분석 전용이며 기존 LED 계산기는 건드리지      */
/*  않는다.                                                               */
/*                                                                        */
/*  입력: 글자 평균 높이(각) · 총 외곽길이 · 글자수                         */
/*  처리: SignRules에서 그 각(size)에 맞는 LED 밀도(m당 개수)·채널깊이·     */
/*  획폭·LED 종류를 조회 → 외곽길이(=LED가 배치되는 실제 길이) 기준으로     */
/*  LED 개수/소비전력/SMPS/전선 길이/실리콘 소요량을 계산한다.              */
/* ==================================================================== */
(function (root) {
  "use strict";

  const SignRules = (typeof module !== "undefined" && module.exports)
    ? require("./signRules.js")
    : (typeof window !== "undefined" ? window.SignRules : null);

  const SMPS_LINEUP = [30, 60, 100, 150, 200, 300, 400, 500, 600];
  const LEAD_PER_MODULE_MM = 300; // 모듈 1개당 리드선(연결선) 여유 길이
  const MAIN_RUN_PER_SMPS_MM = 2000; // SMPS 1대당 본선(전원 인입) 여유 길이

  function recommendSmps(moduleCount) {
    if (moduleCount <= 0) return { cap: 0, qty: 0 };
    const need = Math.ceil(moduleCount / 0.8); // 정격의 80%까지만 사용(안전율)
    for (const cap of SMPS_LINEUP) if (cap >= need) return { cap, qty: 1 };
    const maxCap = SMPS_LINEUP[SMPS_LINEUP.length - 1];
    return { cap: maxCap, qty: Math.max(1, Math.ceil(moduleCount / (maxCap * 0.8))) };
  }

  function wattageOf(ledType) {
    const m = /([\d.]+)\s*W/i.exec(ledType || "");
    return m ? parseFloat(m[1]) : 1;
  }

  // opts: { avgHeightMm, totalPerimeterMm, glyphCount }
  function recommendProduction(opts) {
    const o = opts || {};
    const avgHeightMm = Number(o.avgHeightMm) || 0;
    const totalPerimeterM = (Number(o.totalPerimeterMm) || 0) / 1000;
    const glyphCount = Number(o.glyphCount) || 0;

    const rule = SignRules ? SignRules.findRuleForSize(avgHeightMm) : { sizeMm: avgHeightMm, ledDensityPerM: 3, channelDepthMm: 60, ledType: "3구 1W", strokeWidthMm: 12 };
    const wattagePerLed = wattageOf(rule.ledType);

    // LED는 획(채널 테두리)을 따라 일정 간격으로 배치 — 면적이 아니라 외곽길이 기준(제작 실무 방식)
    const moduleCount = Math.ceil(totalPerimeterM * rule.ledDensityPerM);
    const totalWatt = Math.round(moduleCount * wattagePerLed * 10) / 10;
    const smps = recommendSmps(moduleCount);
    const wireLengthM = Math.round(((moduleCount * LEAD_PER_MODULE_MM) + (smps.qty * MAIN_RUN_PER_SMPS_MM)) / 100) / 10;
    const siliconeQty = moduleCount; // LED 납땜 포인트 1개당 실리콘 포인팅 1회 기준(Version 1 추정)

    return {
      rule,
      sizeMm: rule.sizeMm,
      channelDepthMm: rule.channelDepthMm,
      strokeWidthMm: rule.strokeWidthMm,
      ledType: rule.ledType,
      wattagePerLed,
      moduleCount,
      totalWatt,
      smpsCap: smps.cap,
      smpsQty: smps.qty,
      wireLengthM,
      siliconeQty,
      glyphCount,
    };
  }

  const LedEngine = { recommendProduction, recommendSmps, wattageOf };
  if (typeof module !== "undefined" && module.exports) module.exports = LedEngine;
  if (typeof window !== "undefined") window.LedEngine = LedEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
