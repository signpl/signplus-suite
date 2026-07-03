/* ==================================================================== */
/*  SqliteProvider — 현재 유일하게 활성화된 저장소 백엔드(Provider).          */
/*  main.js에 인라인으로 있던 getStorageDir/getDb/migrateLegacyJsonFiles를   */
/*  동작 변경 없이 그대로 옮긴 것뿐이다(SQL·WAL 설정·마이그레이션 조건 동일).  */
/*                                                                        */
/*  Provider의 역할: "특정 백엔드에 실제로 연결해 원시 데이터를 주고받는"      */
/*  가장 아래 계층. 향후 NAS(SMB/네트워크 드라이브)나 클라우드(REST API)      */
/*  백엔드가 추가되면, 이 파일과 같은 형태로 nasProvider.js / cloudProvider.js */
/*  를 providers/ 아래에 추가하고 동일한 인터페이스(getStorageDir, getDb 또는  */
/*  그에 준하는 접근자)를 구현하면 된다. repositories/ 계층은 어떤 provider를  */
/*  쓰든 코드를 바꾸지 않는다 — CLOUD_ARCHITECTURE.md 참고.                  */
/* ==================================================================== */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

function createSqliteProvider({ app }) {
  function getStorageDir() {
    const dir = path.join(app.getPath("userData"), "signplus-suite-data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  let _db = null;
  function getDb() {
    if (_db) return _db;
    const dir = getStorageDir();
    _db = new Database(path.join(dir, "signplus.db"));
    _db.pragma("journal_mode = WAL");
    _db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    migrateLegacyJsonFiles(_db, dir);
    return _db;
  }

  function migrateLegacyJsonFiles(db, dir) {
    const { c } = db.prepare("SELECT COUNT(*) AS c FROM kv").get();
    if (c > 0) return;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "license.json");
    if (!files.length) return;
    const insert = db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)");
    const tx = db.transaction((entries) => {
      for (const [key, value] of entries) insert.run(key, value);
    });
    tx(files.map((f) => [f.slice(0, -5), fs.readFileSync(path.join(dir, f), "utf-8")]));
  }

  return { getStorageDir, getDb };
}

module.exports = { createSqliteProvider };
