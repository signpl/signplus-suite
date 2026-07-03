# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Signplus Suite — Electron desktop app (Windows) for a Korean signage company: 견적(quote) 작성, 시안의뢰서(design brief), LED 계산기, 대시보드, 거래처·단가 DB. Distributed as a licensed NSIS installer, not a web app.

## Commands

```
npm start        # run the app (electron .)
npm run dist     # package Windows installer via electron-builder (NSIS)
```

There is no lint or test script configured in `package.json`, and no test framework is present in the repo. Don't assume `npm test` works.

`renderer/app.js` is one large hand-written file (1900+ lines) with no bundler/transpiler in front of it (no JSX, no webpack/vite step — `index.html` loads it as a plain `<script>`). If you break a paren/brace deep in this file, Electron will just show a blank window with a console syntax error. `scripts/check_brackets.py` and `scripts/map_pos.py` are throwaway helpers for bisecting bracket-matching errors in that file when this happens (edit the hardcoded path at the top before running: `python scripts/check_brackets.py`).

## Architecture

**Process split (standard Electron, contextIsolation on, nodeIntegration off):**
- `main.js` — all filesystem/OS work lives here as `ipcMain.handle` endpoints: license status/activate, `storage-get`/`storage-set`, `backup-export`/`backup-import`, `export-excel` (ExcelJS), `export-pdf` (renders HTML in a hidden `BrowserWindow` and calls `printToPDF`), `pick-image` (returns base64 data URL).
- `preload.js` — the only bridge to the renderer, via `contextBridge`. Exposes four globals: `window.storage`, `window.api`, `window.license`, `window.backup`. Any new main-process capability needs a matching handle in `main.js` + exposed method here — the renderer has no other way to reach Node/fs.
- `renderer/app.js` — the entire UI and business logic, built with **plain React (no JSX)** via a local hyperscript helper `h(type, props, children)` (`renderer/app.js:9`). React itself is not npm-installed for the renderer; it's loaded from prebuilt `vendor/react.production.min.js` / `vendor/react-dom.production.min.js` via `<script>` tags in `index.html`, so there is no import graph to trace — everything is a global.
- `renderer/jeil-presets.js` — seed data for material unit prices (`JEIL_PRESETS`), loaded as a global before `app.js`.
- `license-common.js` — shared by `main.js` only (not the renderer). Do not treat this as dead code just because nothing in `renderer/` requires it.

**Storage model:** every persisted key goes through `main.js`'s `getStorageDir()` → one JSON file per key under Electron's `userData/signplus-suite-data/`, named via `keyToFile(key)`. Renderer code reads/writes through `window.storage.get/set(key, value)` — there's no schema/DB, just string keys like `sp2-quotes`, `sp2-briefs`, `sp2-clients`, `sp2-presets` (or per-client `sp2-presets-<id>`), `sp2-company`, `sp2-projects`. Images (logos/stamps) are stored inline as base64 data URLs inside these JSON blobs, not as separate files.

Because `storage.set` in different components doesn't share React state, cross-component reactivity is done via a DOM event: `preload.js` dispatches `window.dispatchEvent(new CustomEvent("sp-storage-changed", { detail: { key } }))` after every successful `storage.set`, and listeners (e.g. `ProjectDashboard`) re-`loadKey` in response. If you add a component that needs to react to another component's saves, hook this event rather than inventing new state plumbing.

**Backup/restore:** `backup-export` bundles every stored JSON key (except `license.json`) into one file the user saves; `backup-import` writes them back individually. There is no schema versioning — a backup from an older version is trusted as-is.

**Licensing (`license-common.js`):** custom HMAC-based serial scheme, not a third-party library.
- Format `SPX-<dateCode>-XXXX-XXXX-CCCC` = customer serial, expires 30 days after the issue date *encoded inside the serial itself* (not the activation timestamp — this is deliberate, to prevent bypassing expiry by resetting local storage).
- Format `SPXA-XXXX-XXXX-XXXX-CCCC` = admin serial, never expires.
- `LICENSE_SECRET` in this file must exactly match the separate `signplus-license-generator` tool that issues serials to customers. Never bundle that generator into a customer-facing build, and treat this secret as sensitive (it's currently hardcoded in-repo, not in an env var — a known issue, see below).

**PDF/Excel export duality:** quotes can render to either PDF (renderer builds full HTML via `buildQuoteHTML`, sent to `export-pdf` in main) or Excel (raw quote data sent to `export-excel`, laid out cell-by-cell with ExcelJS). The two use separate theme palettes that must be kept visually in sync by hand: `QUOTE_THEMES` in `renderer/app.js` vs `EXCEL_THEMES` in `main.js:123`.

**index.html CSP:** `script-src 'self'` — no inline `<script>` blocks or external/CDN scripts will run. Any new dependency must be vendored into `vendor/` and loaded as a local `<script src>`, following the existing React pattern.

## Known rough edges (from prior self-review in REPORT.md)

- `LICENSE_SECRET` is hardcoded in `license-common.js`, checked into the repo.
- Main-process file I/O is synchronous (`fs.readFileSync`/`writeFileSync`) throughout — acceptable at current scale but can block the UI thread on large data.
- No automated tests exist for the calculation logic (quote totals, LED calculators) or IPC handlers.
