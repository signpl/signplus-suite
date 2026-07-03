/* ==================================================================== */
/*  LicenseService — 라이선스 상태 조회/활성화/초기화를 하나의 서비스로       */
/*  캡슐화해 main.js(IPC 배선)와 분리한다. 시리얼 검증/만료 판정 로직         */
/*  자체는 license-common.js에 그대로 두고, 여기서는 저장 파일 입출력과      */
/*  "온라인 우선, 실패 시 오프라인 폴백" 흐름만 담당한다.                     */
/*                                                                        */
/*  온라인 인증 서버가 아직 없으므로 tryOnlineActivate()는 항상 null을        */
/*  반환해 오프라인 검증(checkSerial)으로 폴백한다. 추후 서버가 생기면       */
/*  이 함수 내부만 실제 API 호출로 교체하면 activate()의 나머지 로직/반환    */
/*  형식은 그대로 유지된다.                                                */
/* ==================================================================== */
const fs = require("fs");
const path = require("path");
const { checkSerial, generateSerial, generateAdminSerial, generateBetaSerial, BETA_VALID_DAYS } = require("./license-common.js");

/* ------------------------------------------------------------------ */
/*  베타 단계의 라이선스 티어(Trial/Pro) — license-common.js의 시리얼      */
/*  종류(admin/customer/beta, SPXA-/SPX-/SPS-BETA- 형식·검증 로직)는       */
/*  전혀 건드리지 않고, 기존 type 값에 UI/표시용 tier 라벨만 얹는다.        */
/*  새 종류가 생기면 이 테이블에 한 줄만 추가하면 되도록 열어둔다.          */
/* ------------------------------------------------------------------ */
const TIER_BY_TYPE = { admin: "pro", customer: "trial", beta: "trial" };
const TIER_INFO = {
  pro: { label: "Pro Version", unlimited: true },
  trial: { label: "Trial Version", unlimited: false },
};

function createLicenseService({ getStorageDir }) {
  const licenseFile = () => path.join(getStorageDir(), "license.json");

  function readLicenseFile() {
    const file = licenseFile();
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      return null;
    }
  }

  function tierOf(type) {
    return TIER_BY_TYPE[type] || "trial";
  }

  // 베타 공용 시리얼은 발급일을 시리얼에 담지 않으므로(같은 값을 여러 기기가 공유), 이 기기에서
  // "최초 활성화한 시각"(license.json의 activatedAt)을 기준으로 30일 만료를 직접 계산한다.
  function betaStatus(data) {
    const issuedAt = data.activatedAt ? new Date(data.activatedAt) : new Date();
    const expiresAt = new Date(issuedAt.getTime() + BETA_VALID_DAYS * 86400000);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
    const expired = now.getTime() > expiresAt.getTime();
    if (expired) return { activated: false, expired: true, type: "beta", tier: tierOf("beta") };
    return { activated: true, serial: data.serial, type: "beta", tier: tierOf("beta"), daysLeft, expiresAt, issuedAt };
  }

  function getStatus() {
    const data = readLicenseFile();
    if (!data || !data.serial) return { activated: false };
    const check = checkSerial(data.serial);
    if (!check.valid) return { activated: false };
    if (check.type === "beta") return betaStatus(data);
    if (check.expired) return { activated: false, expired: !!check.expired, type: check.type, tier: check.type ? tierOf(check.type) : undefined };
    return { activated: true, serial: data.serial, type: check.type, tier: tierOf(check.type), daysLeft: check.daysLeft, expiresAt: check.expiresAt, issuedAt: check.issuedAt };
  }

  // 온라인 활성화 서버 연동 지점(현재 미구현) — 향후 여기서 원격 검증을 시도하고,
  // 실패/미구현 시 null을 반환해 아래 오프라인 검증으로 자연스럽게 폴백한다.
  async function tryOnlineActivate(_serial) {
    return null;
  }

  async function activate(serial) {
    const online = await tryOnlineActivate(serial);
    if (online) return online;

    const check = checkSerial(serial);
    if (!check.valid) return { ok: false, error: "유효하지 않은 시리얼 번호입니다. 형식과 오탈자를 확인해주세요." };
    // 베타 공용 시리얼은 발급일 개념이 없어(check.expired가 계산되지 않음) 활성화 시점에는 만료를
    // 판단하지 않는다 — 지금이 바로 이 기기의 "최초 활성화 시각"이 되어 30일이 새로 시작된다.
    if (check.type !== "beta" && check.expired) return { ok: false, error: "이 시리얼은 이미 만료되었습니다 (발급일로부터 30일 경과). 새 시리얼을 발급받아 입력해주세요." };
    fs.writeFileSync(
      licenseFile(),
      JSON.stringify({ serial: String(serial).trim().toUpperCase(), activatedAt: new Date().toISOString(), mode: "offline" }, null, 2),
      "utf-8"
    );
    const daysLeft = check.type === "beta" ? BETA_VALID_DAYS : check.daysLeft;
    return { ok: true, type: check.type, tier: tierOf(check.type), daysLeft };
  }

  function reset() {
    try {
      const file = licenseFile();
      if (fs.existsSync(file)) fs.unlinkSync(file);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }

  return { getStatus, activate, reset, generateSerial, generateAdminSerial, generateBetaSerial, tierOf, TIER_INFO };
}

module.exports = { createLicenseService, TIER_BY_TYPE, TIER_INFO };
