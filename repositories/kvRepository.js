/* ==================================================================== */
/*  KvRepository — 앱의 모든 도메인 데이터(견적/프로젝트/거래처/단가/회사정보  */
/*  등)가 공용으로 쓰는 key-value 저장 인터페이스. main.js의 storage-get/    */
/*  storage-set/backup-export/backup-import 핸들러에 인라인으로 있던 SQL을   */
/*  동작 변경 없이 그대로 옮긴 것뿐이다(같은 쿼리, 같은 트랜잭션).            */
/*                                                                        */
/*  Repository의 역할: "이 앱의 데이터 개념(키-값 저장)"을 표현하는 계층으로,   */
/*  실제 접속/저장 방식(Provider)에 의존하지 않는다. 이 파일은 provider가     */
/*  넘겨주는 getDb()만 사용하므로, provider가 SqliteProvider에서             */
/*  NasProvider/CloudProvider로 바뀌어도(같은 인터페이스만 구현하면) 이       */
/*  파일은 전혀 수정할 필요가 없다 — CLOUD_ARCHITECTURE.md 참고.             */
/* ==================================================================== */
function createKvRepository(provider) {
  function get(key) {
    try {
      const row = provider.getDb().prepare("SELECT value FROM kv WHERE key = ?").get(String(key));
      return row ? row.value : null;
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      provider.getDb().prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(key), value);
      return true;
    } catch {
      return false;
    }
  }

  // 백업 내보내기(backup-export)에서 사용 — 저장된 전체 키·값을 그대로 반환한다.
  function getAll() {
    return provider.getDb().prepare("SELECT key, value FROM kv").all();
  }

  // 백업 복원(backup-import)에서 사용 — 여러 키를 한 트랜잭션으로 upsert한다(기존과 동일한 SQL).
  function setMany(entries) {
    const db = provider.getDb();
    const insert = db.prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    const tx = db.transaction((items) => {
      for (const [key, value] of items) insert.run(key, value);
    });
    tx(entries);
  }

  return { get, set, getAll, setMany };
}

module.exports = { createKvRepository };
