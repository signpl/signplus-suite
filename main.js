const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const Database = require("better-sqlite3");
const { createLicenseService } = require("./license-service.js");

/* ------------------------------------------------------------------ */
/*  라이선스(시리얼) 인증 — 일반(30일 만료) / 관리자(무제한)                  */
/*  검증/저장 로직은 LicenseService(license-service.js)에 모두 위임하고,     */
/*  여기서는 IPC 채널 배선만 담당한다 (UI ↔ 서비스 분리).                   */
/* ------------------------------------------------------------------ */
const licenseService = createLicenseService({ getStorageDir });

ipcMain.handle("license-status", async () => {
  try {
    return licenseService.getStatus();
  } catch {
    return { activated: false };
  }
});
ipcMain.handle("license-activate", async (_e, serial) => {
  try {
    return await licenseService.activate(serial);
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});
/* 관리자 라이선스 패널의 "라이선스 초기화/로그아웃"에서 사용 — 검증 로직은 그대로, 저장된 활성화 파일만 지운다 */
ipcMain.handle("license-reset", async () => {
  try {
    return licenseService.reset();
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

/* 설정 페이지 "저장 위치" 표시용 — 기존 getStorageDir()을 그대로 노출만 한다 */
ipcMain.handle("get-storage-dir", async () => {
  try {
    return getStorageDir();
  } catch {
    return null;
  }
});

/* ------------------------------------------------------------------ */
/*  로컬 저장소 — SQLite(key-value) 기반. 이전 버전의 키별 JSON 파일이         */
/*  남아있으면 최초 실행 시 kv 테이블로 1회 이전한다.                          */
/* ------------------------------------------------------------------ */
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

ipcMain.handle("storage-get", async (_e, key) => {
  try {
    const row = getDb().prepare("SELECT value FROM kv WHERE key = ?").get(String(key));
    return row ? row.value : null;
  } catch {
    return null;
  }
});

ipcMain.handle("storage-set", async (_e, key, value) => {
  try {
    getDb().prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(key), value);
    return true;
  } catch {
    return false;
  }
});

/* ------------------------------------------------------------------ */
/*  데이터 백업 / 복구 — 저장된 모든 자료(견적·시안의뢰서·거래처·단가·설정)를    */
/*  파일 하나로 내보내고, 새 컴퓨터/재설치 후 그대로 복구할 수 있게 함           */
/* ------------------------------------------------------------------ */
ipcMain.handle("backup-export", async () => {
  try {
    const rows = getDb().prepare("SELECT key, value FROM kv").all();
    const data = {};
    for (const row of rows) data[row.key] = row.value;
    const payload = { app: "signplus-suite", exportedAt: new Date().toISOString(), data };
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "데이터 백업 저장",
      defaultPath: `signplus-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "Signplus 백업 파일", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
    return { ok: true, path: filePath, count: rows.length };
  } catch (err) {
    console.error("[backup-export] 오류:", err);
    return { ok: false, error: String((err && err.message) || err) };
  }
});

ipcMain.handle("backup-import", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "백업 파일 불러오기",
      properties: ["openFile"],
      filters: [{ name: "Signplus 백업 파일", extensions: ["json"] }],
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true };
    const raw = fs.readFileSync(filePaths[0], "utf-8");
    const payload = JSON.parse(raw);
    if (!payload || typeof payload.data !== "object") return { ok: false, error: "올바른 백업 파일이 아닙니다." };
    const db = getDb();
    const insert = db.prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    const entries = Object.entries(payload.data);
    const tx = db.transaction((items) => {
      for (const [key, value] of items) insert.run(key, value);
    });
    tx(entries);
    return { ok: true, count: entries.length, exportedAt: payload.exportedAt };
  } catch (err) {
    console.error("[backup-import] 오류:", err);
    return { ok: false, error: String((err && err.message) || err) };
  }
});


/* 엑셀 견적서 테마 팔레트 (PDF의 QUOTE_THEMES와 동일한 3종) */
const EXCEL_THEMES = {
  classic: { title: "FF1D1D1F", headFill: "FFF3F3F3", headText: "FF1D1D1F", tableHeadFill: "FFF3F3F3", tableHeadText: "FF333333", grand: "FF1D1D1F", bar: "FF222222" },
  navy: { title: "FF0B1F3A", headFill: "FF0B1F3A", headText: "FFFFFFFF", tableHeadFill: "FFEEF1F6", tableHeadText: "FF0B1F3A", grand: "FF0B1F3A", bar: "FFC9A24B" },
  charcoal: { title: "FF1D1D1F", headFill: "FF1D1D1F", headText: "FFFFFFFF", tableHeadFill: "FFFFF1E8", tableHeadText: "FF1D1D1F", grand: "FF1D1D1F", bar: "FFFF6B35" },
};

ipcMain.handle("export-excel", async (_e, quote, filename) => {
  try {
    const { company, client, quoteNo, quoteDate, validity, items, subtotal, vat, total, notes } = quote;
    const ex = EXCEL_THEMES[quote.theme] || EXCEL_THEMES.classic;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("견적서", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    });

    // 열 너비 (A~G) — 라벨/한글 잘림 방지 위해 여유있게
    ws.columns = [
      { width: 11 }, { width: 25 }, { width: 20 }, { width: 9 }, { width: 14 }, { width: 16 }, { width: 13 },
    ];

    const thin = { style: "thin", color: { argb: "FFBFBFBF" } };
    const allBorder = { top: thin, left: thin, bottom: thin, right: thin };
    const F = (name, size, bold, color) => ({ name: name || "맑은 고딕", size: size || 10, bold: !!bold, color: color ? { argb: color } : undefined });
    const money = '#,##0';

    let r = 1;
    // 제목
    ws.mergeCells(`A${r}:C${r}`);
    ws.getCell(`A${r}`).value = "견 적 서";
    ws.getCell(`A${r}`).font = F("맑은 고딕", 26, true, ex.title);
    ws.getCell(`A${r}`).alignment = { vertical: "middle" };
    // 공급자 정보 (우측)
    ws.mergeCells(`E${r}:G${r}`);
    ws.getCell(`E${r}`).value = company.name;
    ws.getCell(`E${r}`).font = F("맑은 고딕", 14, true);
    ws.getCell(`E${r}`).alignment = { horizontal: "right" };
    ws.getRow(r).height = 34;
    r++;

    ws.getCell(`A${r}`).value = "QUOTATION";
    ws.getCell(`A${r}`).font = F("맑은 고딕", 10, false, "FF999999");
    const supLines = [
      company.addr,
      `TEL. ${company.tel}${company.fax ? "   FAX. " + company.fax : ""}`,
      company.email ? `E-mail. ${company.email}` : null,
      `사업자등록번호 ${company.biznum}`,
      `대표자 ${company.ceo}`,
    ].filter(Boolean);
    supLines.forEach((line, idx) => {
      const rr = r + idx;
      ws.mergeCells(`D${rr}:G${rr}`);
      ws.getCell(`D${rr}`).value = line;
      ws.getCell(`D${rr}`).font = F("맑은 고딕", 9.5);
      ws.getCell(`D${rr}`).alignment = { horizontal: "right" };
    });
    r += Math.max(supLines.length, 1);
    r++; // 여백

    // 견적 정보 (좌) + 합계 박스(우)
    const metaStart = r;
    const meta = [
      ["견적번호", quoteNo],
      ["견적일자", quoteDate],
      ["유효기간", validity],
      ["수 신 처", (client.name || "-") + (client.name ? " 귀하" : "")],
      ["담 당 자", client.manager || "-"],
      ["연 락 처", client.tel || "-"],
    ];
    meta.forEach((m, idx) => {
      const rr = metaStart + idx;
      ws.getCell(`A${rr}`).value = m[0];
      ws.getCell(`A${rr}`).font = F("맑은 고딕", 10, true, "FF444444");
      ws.getCell(`A${rr}`).alignment = { horizontal: "left" };
      ws.mergeCells(`B${rr}:C${rr}`);
      ws.getCell(`B${rr}`).value = m[1];
      ws.getCell(`B${rr}`).font = F("맑은 고딕", 10);
      ws.getCell(`B${rr}`).alignment = { horizontal: "left", indent: 1 };
      ws.getRow(rr).height = 18;
    });
    // 합계 박스 (E=라벨, F:G=금액 병합, 3행)
    const sumBox = [
      ["합계금액 (VAT 포함)", total, 14, true, ex.headFill, ex.headText],
      ["금액 (부가세 별도)", subtotal, 10, false, null, null],
      ["부 가 세 (10%)", vat, 10, false, null, null],
    ];
    sumBox.forEach((sb, i) => {
      const rr = metaStart + i;
      ws.getCell(`E${rr}`).value = sb[0];
      ws.getCell(`E${rr}`).font = F("맑은 고딕", 10.5, sb[3], sb[5]);
      ws.getCell(`E${rr}`).alignment = { vertical: "middle", shrinkToFit: true };
      ws.mergeCells(`F${rr}:G${rr}`);
      ws.getCell(`F${rr}`).value = sb[1];
      ws.getCell(`F${rr}`).numFmt = '₩#,##0';
      ws.getCell(`F${rr}`).font = F("맑은 고딕", sb[2], sb[3], sb[5]);
      ws.getCell(`F${rr}`).alignment = { horizontal: "right", vertical: "middle" };
      if (sb[4]) {
        ["E", "F", "G"].forEach((col) => { ws.getCell(`${col}${rr}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: sb[4] } }; });
      }
      ["E", "F", "G"].forEach((col) => { ws.getCell(`${col}${rr}`).border = allBorder; });
    });
    ws.getRow(metaStart).height = 30;
    r = metaStart + meta.length + 1;

    // 품목 헤더
    const headRow = r;
    const heads = ["No.", "품목명", "규격 / 사양", "수량", "단가", "금액", "비고"];
    heads.forEach((hh, i) => {
      const cell = ws.getCell(headRow, i + 1);
      cell.value = hh;
      cell.font = F("맑은 고딕", 10, true, ex.tableHeadText);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ex.tableHeadFill } };
      cell.border = { top: { style: "medium", color: { argb: ex.bar } }, bottom: thin, left: thin, right: thin };
    });
    ws.getRow(headRow).height = 22;
    r++;

    // 품목 행 — 개수에 따라 최소 행수와 행 높이를 조정해 A4 한 장을 항상 보기 좋게 채움
    const realItems = items.filter((i) => i.name || i.spec || (Number(i.unitPrice) || 0) * (Number(i.qty) || 0));
    const displayItems = realItems.length ? realItems : items;
    const minRows = displayItems.length <= 2 ? 10 : displayItems.length <= 4 ? 9 : displayItems.length <= 8 ? 7 : 6;
    const rowCount = Math.max(displayItems.length, minRows);
    const rowH = rowCount <= 7 ? 30 : rowCount <= 10 ? 24 : rowCount <= 15 ? 20 : rowCount <= 20 ? 17 : 15;
    for (let idx = 0; idx < rowCount; idx++) {
      const it = displayItems[idx];
      const rr = r + idx;
      const amt = it ? (Number(it.unitPrice) || 0) * (Number(it.qty) || 0) : 0;
      const cells = [
        it ? idx + 1 : "",
        it ? it.name : "",
        it ? it.spec : "",
        it ? `${it.qty}${it.unit ? " " + it.unit : ""}` : "",
        it && amt ? Number(it.unitPrice) : (it ? "-" : ""),
        it && amt ? amt : (it ? "-" : ""),
        "",
      ];
      cells.forEach((v, ci) => {
        const cell = ws.getCell(rr, ci + 1);
        cell.value = v;
        cell.font = F("맑은 고딕", 10);
        cell.border = allBorder;
        if (ci === 0 || ci === 3) cell.alignment = { horizontal: "center", vertical: "middle" };
        else if (ci === 4 || ci === 5) { cell.alignment = { horizontal: "right", vertical: "middle" }; if (typeof v === "number") cell.numFmt = money; }
        else cell.alignment = { horizontal: "left", vertical: "middle" };
        if (ci === 5) cell.font = F("맑은 고딕", 10, true);
      });
      ws.getRow(rr).height = rowH;
    }
    r += rowCount;

    // 합계 (우측 정렬, E=라벨 병합, F=금액)
    const sumRows = [["합 계 (VAT 별도)", subtotal, false], ["부 가 세 (10%)", vat, false], ["합 계 금 액 (VAT 포함)", total, true]];
    sumRows.forEach((sr, idx) => {
      const rr = r + idx;
      ws.mergeCells(`A${rr}:E${rr}`);
      ws.getCell(`A${rr}`).value = sr[0];
      ws.getCell(`A${rr}`).alignment = { horizontal: "right" };
      ws.getCell(`A${rr}`).font = F("맑은 고딕", sr[2] ? 12 : 10, sr[2], sr[2] ? ex.grand : null);
      ws.getCell(`F${rr}`).value = sr[1];
      ws.getCell(`F${rr}`).numFmt = money;
      ws.getCell(`F${rr}`).alignment = { horizontal: "right" };
      ws.getCell(`F${rr}`).font = F("맑은 고딕", sr[2] ? 13 : 10, sr[2], sr[2] ? ex.grand : null);
      if (sr[2]) {
        ws.getCell(`A${rr}`).border = { top: { style: "medium", color: { argb: ex.grand } } };
        ws.getCell(`F${rr}`).border = { top: { style: "medium", color: { argb: ex.grand } } };
        for (const c of ["B", "C", "D", "E"]) ws.getCell(`${c}${rr}`).border = { top: { style: "medium", color: { argb: ex.grand } } };
      }
    });
    r += sumRows.length + 1;

    // 기타 안내사항
    const noteArr = (notes || "").split("\n").map((s) => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
    ws.getCell(`A${r}`).value = "기타 안내사항";
    ws.getCell(`A${r}`).font = F("맑은 고딕", 10, true);
    r++;
    (noteArr.length ? noteArr : ["상기 견적은 부가세 포함 금액입니다."]).forEach((n, idx) => {
      ws.mergeCells(`A${r + idx}:E${r + idx}`);
      ws.getCell(`A${r + idx}`).value = `${idx + 1}. ${n}`;
      ws.getCell(`A${r + idx}`).font = F("맑은 고딕", 9.5, false, "FF555555");
    });

    const buf = await wb.xlsx.writeBuffer();

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "엑셀 저장",
      defaultPath: `${(filename || "견적서").replace(/[\\/:*?"<>|]/g, "_")}.xlsx`,
      filters: [{ name: "Excel 파일", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    fs.writeFileSync(filePath, Buffer.from(buf));
    return { ok: true, path: filePath };
  } catch (err) {
    console.error("[export-excel] 오류:", err);
    return { ok: false, error: String((err && err.message) || err) };
  }
});

/* ------------------------------------------------------------------ */
/*  PDF 내보내기 — 렌더러가 만든 HTML을 숨은 창에서 인쇄                     */
/* ------------------------------------------------------------------ */
ipcMain.handle("export-pdf", async (_e, html, filename) => {
  let pdfWin;
  let tmpFile;
  try {
    // 임시 HTML 파일로 저장 후 loadFile 사용 (data URL보다 안정적 · 큰 이미지 포함 시에도 안전)
    tmpFile = path.join(app.getPath("temp"), `signplus-pdf-${Date.now()}.html`);
    fs.writeFileSync(tmpFile, html, "utf-8");

    pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: false },
    });

    await pdfWin.loadFile(tmpFile);
    // 렌더링(폰트/이미지) 완료를 실제로 기다림 — 고정 지연시간 대신 이벤트 기반
    await new Promise((resolve) => {
      if (pdfWin.webContents.isLoadingMainFrame() === false) return resolve();
      pdfWin.webContents.once("did-finish-load", resolve);
      setTimeout(resolve, 3000); // 안전장치: 3초 넘으면 강제 진행
    });
    // 이미지 디코딩 등 마지막 페인트 여유
    await new Promise((r) => setTimeout(r, 300));

    const data = await pdfWin.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      margins: { marginType: "none" },
      pageRanges: "1-1",
    });

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "PDF 저장",
      defaultPath: `${(filename || "견적서").replace(/[\\/:*?"<>|]/g, "_")}.pdf`,
      filters: [{ name: "PDF 파일", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    fs.writeFileSync(filePath, data);
    return { ok: true, path: filePath };
  } catch (err) {
    console.error("[export-pdf] 오류:", err);
    return { ok: false, error: String((err && err.message) || err) };
  } finally {
    if (pdfWin && !pdfWin.isDestroyed()) pdfWin.close();
    if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch {} }
  }
});

/* 이미지(로고/도장) 파일 선택 → base64 data URL 반환 */
ipcMain.handle("pick-image", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "이미지 선택",
      properties: ["openFile"],
      filters: [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
    });
    if (canceled || !filePaths[0]) return null;
    const buf = fs.readFileSync(filePaths[0]);
    const ext = path.extname(filePaths[0]).slice(1).toLowerCase();
    const mime = ext === "jpg" ? "jpeg" : ext;
    return `data:image/${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
});

/* ------------------------------------------------------------------ */
/*  창 생성                                                             */
/* ------------------------------------------------------------------ */
function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: "#F5F5F7",
    title: "Signplus Suite",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("preload-error", (_e, preloadPath, error) => {
    console.error(`[preload-error] ${preloadPath}: ${(error && error.stack) || error}`);
  });
  win.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    console.error(`[did-fail-load] ${errorCode} ${errorDescription} ${validatedURL}`);
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error(`[render-process-gone] ${JSON.stringify(details)}`);
  });
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
