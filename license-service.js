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
const { checkSerial, generateSerial, generateAdminSerial } = require("./license-common.js");

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

  function getStatus() {
    const data = readLicenseFile();
    if (!data || !data.serial) return { activated: false };
    const check = checkSerial(data.serial);
    if (!check.valid || check.expired) return { activated: false, expired: !!check.expired, type: check.type };
    return { activated: true, serial: data.serial, type: check.type, daysLeft: check.daysLeft, expiresAt: check.expiresAt, issuedAt: check.issuedAt };
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
    if (check.expired) return { ok: false, error: "이 시리얼은 이미 만료되었습니다 (발급일로부터 30일 경과). 새 시리얼을 발급받아 입력해주세요." };
    fs.writeFileSync(
      licenseFile(),
      JSON.stringify({ serial: String(serial).trim().toUpperCase(), activatedAt: new Date().toISOString(), mode: "offline" }, null, 2),
      "utf-8"
    );
    return { ok: true, type: check.type, daysLeft: check.daysLeft };
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

  return { getStatus, activate, reset, generateSerial, generateAdminSerial };
}

module.exports = { createLicenseService };
