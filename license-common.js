/* ==================================================================== */
/*  Signplus+ 라이선스 시리얼 검증 공통 모듈                                 */
/*  ⚠️ 이 파일의 LICENSE_SECRET은 시리얼 생성기(signplus-license-generator)와 */
/*     반드시 동일해야 합니다. 절대 고객에게 배포되는 폴더에 생성기를 넣지 마세요. */
/*                                                                        */
/*  시리얼 두 종류:                                                        */
/*   - 일반(SPX-...)  : 발급일이 시리얼 안에 암호화되어 있고, 발급일로부터    */
/*                      30일이 지나면 자동 만료됩니다. 재사용 방지를 위해     */
/*                      "기기에 저장된 활성화 시각"이 아니라 "시리얼 자체에    */
/*                      새겨진 발급일"을 기준으로 계산합니다.                */
/*   - 관리자(SPXA-...): 기간 제한 없이 항상 유효합니다.                     */
/* ==================================================================== */
const crypto = require("crypto");

const LICENSE_SECRET = "Signplus-Suite-Chuncheon-2026-K7Qx9Zm3-Do-Not-Share";
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 혼동되는 0/O, 1/I 제외
const EPOCH_MS = Date.UTC(2026, 0, 1); // 날짜 인코딩 기준일
const VALID_DAYS = 30; // 일반 시리얼 유효기간
const BETA_VALID_DAYS = 30; // 베타 공용 시리얼 유효기간(발급일이 아니라 "최초 활성화 시각" 기준 — license-service.js에서 계산)

function checksum(body, secret) {
  const h = crypto.createHmac("sha256", secret || LICENSE_SECRET).update(body).digest("hex");
  let n = parseInt(h.slice(0, 8), 16);
  let out = "";
  for (let i = 0; i < 4; i++) {
    out = CHARSET[n % CHARSET.length] + out;
    n = Math.floor(n / CHARSET.length);
  }
  return out;
}

function randomGroup(len) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CHARSET[bytes[i] % CHARSET.length];
  return out;
}

/* 날짜 <-> 4자리 base32 코드 상호 변환 (기준일로부터 경과일수 인코딩) */
function encodeDate(date) {
  const days = Math.floor((date.getTime() - EPOCH_MS) / 86400000);
  let n = Math.max(0, days);
  let out = "";
  for (let i = 0; i < 4; i++) {
    out = CHARSET[n % CHARSET.length] + out;
    n = Math.floor(n / CHARSET.length);
  }
  return out;
}
function decodeDate(code) {
  let n = 0;
  for (const c of code) {
    const idx = CHARSET.indexOf(c);
    if (idx === -1) return null;
    n = n * CHARSET.length + idx;
  }
  return new Date(EPOCH_MS + n * 86400000);
}

/* 새 일반 시리얼 생성 (발급일 오늘 기준, 30일 후 만료) — 형식: SPX-DATE-XXXX-XXXX-CCCC */
function generateSerial() {
  const dateCode = encodeDate(new Date());
  const g2 = randomGroup(4);
  const g3 = randomGroup(4);
  const body = "SPX" + dateCode + g2 + g3;
  const ck = checksum(body);
  return `SPX-${dateCode}-${g2}-${g3}-${ck}`;
}

/* 관리자용 무제한 시리얼 생성 — 형식: SPXA-XXXX-XXXX-XXXX-CCCC */
function generateAdminSerial() {
  const g1 = randomGroup(4);
  const g2 = randomGroup(4);
  const g3 = randomGroup(4);
  const body = "SPXA" + g1 + g2 + g3;
  const ck = checksum(body);
  return `SPXA-${g1}-${g2}-${g3}-${ck}`;
}

/* 베타 테스터 전원에게 배포하는 공용 시리얼 생성 — 형식: SPS-BETA-XXXX-XXXX-CCCC
 * 일반/관리자 시리얼과 달리 발급일을 시리얼에 새기지 않는다(같은 값을 여러 기기에서 쓰므로
 * "발급일"이 의미가 없음). 대신 각 기기가 이 시리얼을 처음 입력한 시각(활성화 시각)을 기준으로
 * 30일을 계산한다 — 계산은 checkSerial이 아니라 활성화 기록을 가진 license-service.js가 담당한다. */
function generateBetaSerial() {
  const g1 = randomGroup(4);
  const g2 = randomGroup(4);
  const body = "SPSBETA" + g1 + g2;
  const ck = checksum(body);
  return `SPS-BETA-${g1}-${g2}-${ck}`;
}

/*
 * 시리얼 상세 검증. 반환값:
 *   { valid:false } — 형식이 잘못됐거나 위변조된 시리얼
 *   { valid:true, type:'admin' } — 관리자용, 무제한
 *   { valid:true, type:'customer', expired, daysLeft, issuedAt, expiresAt } — 일반용
 *   { valid:true, type:'beta' } — 베타 공용 시리얼. 체크섬까지 통과해야 valid:true이며(접두사만
 *     보고 통과시키지 않음), 발급일 개념이 없어 daysLeft/expired는 계산하지 않는다(license-service.js가
 *     활성화 기록으로 계산).
 */
function checkSerial(serial) {
  if (!serial) return { valid: false };
  const clean = String(serial).trim().toUpperCase();

  const admin = clean.match(/^SPXA-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
  if (admin) {
    const body = "SPXA" + admin[1] + admin[2] + admin[3];
    if (checksum(body) !== admin[4]) return { valid: false };
    return { valid: true, type: "admin", expired: false, daysLeft: Infinity };
  } else if (clean.startsWith("SPS-BETA-")) {
    const beta = clean.match(/^SPS-BETA-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (!beta) return { valid: false };
    const body = "SPSBETA" + beta[1] + beta[2];
    if (checksum(body) !== beta[3]) return { valid: false };
    return { valid: true, type: "beta" };
  } else if (clean.startsWith("SPX-")) {
    const cust = clean.match(/^SPX-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (!cust) return { valid: false };
    const body = "SPX" + cust[1] + cust[2] + cust[3];
    if (checksum(body) !== cust[4]) return { valid: false };
    const issuedAt = decodeDate(cust[1]);
    if (!issuedAt) return { valid: false };
    const expiresAt = new Date(issuedAt.getTime() + VALID_DAYS * 86400000);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
    return { valid: true, type: "customer", expired: now.getTime() > expiresAt.getTime(), daysLeft, issuedAt, expiresAt };
  }

  return { valid: false };
}

/* 하위호환: 형식+위변조 여부만 boolean으로 (만료 여부는 별도 checkSerial로 확인) */
function isValidSerial(serial) {
  return checkSerial(serial).valid;
}

module.exports = { generateSerial, generateAdminSerial, generateBetaSerial, checkSerial, isValidSerial, LICENSE_SECRET, VALID_DAYS, BETA_VALID_DAYS };
