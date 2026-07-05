/* ==================================================================== */
/*  SignRules — 채널간판 제작 실무 규칙 DB(Version 1 시드 데이터).          */
/*  글자 크기(각, mm) 구간별 "기본 LED 밀도 · 추천 채널 깊이 · 추천 LED 종류 */
/*  · 추천 획폭"을 보관한다. LedEngine이 이 표를 조회해 제작 기준 계산을     */
/*  수행한다.                                                             */
/*                                                                        */
/*  값은 실무 참고용 출발점(Version 1)이며, 추후 "환경설정 > 간판 제작      */
/*  규칙" 화면에서 사용자가 직접 추가/수정할 수 있도록 배열(레코드) 구조로   */
/*  설계했다 — 이번 작업 범위에는 그 UI를 포함하지 않는다.                  */
/* ==================================================================== */
(function (root) {
  "use strict";

  const SIGN_CHANNEL_RULES = [
    { sizeMm: 30, ledDensityPerM: 5.5, channelDepthMm: 40, ledType: "1구 0.5W", strokeWidthMm: 8 },
    { sizeMm: 40, ledDensityPerM: 5.0, channelDepthMm: 50, ledType: "1구 0.5W", strokeWidthMm: 10 },
    { sizeMm: 50, ledDensityPerM: 4.5, channelDepthMm: 60, ledType: "3구 1W", strokeWidthMm: 12 },
    { sizeMm: 60, ledDensityPerM: 4.0, channelDepthMm: 60, ledType: "3구 1W", strokeWidthMm: 14 },
    { sizeMm: 70, ledDensityPerM: 3.6, channelDepthMm: 70, ledType: "3구 1W", strokeWidthMm: 16 },
    { sizeMm: 80, ledDensityPerM: 3.3, channelDepthMm: 70, ledType: "3구 1W", strokeWidthMm: 18 },
    { sizeMm: 90, ledDensityPerM: 3.0, channelDepthMm: 80, ledType: "3구 1W", strokeWidthMm: 20 },
    { sizeMm: 100, ledDensityPerM: 2.8, channelDepthMm: 80, ledType: "3구 1W", strokeWidthMm: 22 },
    { sizeMm: 150, ledDensityPerM: 2.2, channelDepthMm: 100, ledType: "3구 1W", strokeWidthMm: 28 },
    { sizeMm: 200, ledDensityPerM: 1.8, channelDepthMm: 120, ledType: "3구 1W", strokeWidthMm: 35 },
    { sizeMm: 300, ledDensityPerM: 1.4, channelDepthMm: 150, ledType: "3구 1W", strokeWidthMm: 45 },
  ];

  // 글자 크기(각, mm)에 가장 가까운 규칙을 찾는다(표 범위를 벗어나면 가장 가까운 끝값으로 고정).
  function findRuleForSize(sizeMm) {
    const rules = SIGN_CHANNEL_RULES;
    let best = rules[0];
    for (const r of rules) {
      if (Math.abs(r.sizeMm - sizeMm) < Math.abs(best.sizeMm - sizeMm)) best = r;
    }
    return best;
  }

  const SignRules = { SIGN_CHANNEL_RULES, findRuleForSize };
  if (typeof module !== "undefined" && module.exports) module.exports = SignRules;
  if (typeof window !== "undefined") window.SignRules = SignRules;
})(typeof globalThis !== "undefined" ? globalThis : this);
