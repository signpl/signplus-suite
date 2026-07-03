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

## Goal

이 프로젝트는 간판 통합 관리 프로그램이다.

## Working Rules

- 필요한 파일만 읽는다.
- 전체 프로젝트를 다시 스캔하지 않는다.
- 사용자가 지정한 파일만 수정한다.
- 수정 범위는 최소화한다.
- 기존 UI/디자인은 변경하지 않는다.
- 기존 동작을 유지한다.
- 리팩토링은 요청받았을 때만 수행한다.
- 새 라이브러리는 허가 없이 추가하지 않는다.
- 새 파일은 필요한 경우에만 생성한다.

## Safety Rules

- 기존 기능을 절대 삭제하지 않는다.
- 동작 중인 기능은 리팩토링보다 유지한다.
- UI 변경 시 기존 기능이 그대로 동작해야 한다.
- 모든 작업은 QA 후 Commit한다.
- Commit 후 GitHub Push까지 완료한다.
- Release 빌드는 사용자가 요청할 때만 수행한다.
- 큰 구조 변경이나 데이터 삭제 가능성이 있는 작업은 사용자 승인을 받은 후 진행한다.

## Release Sprint Mode (현재 활성 모드 — 목표: 30일 내 프로덕션 품질 출시)

- **Feature Pack 단위로 작업한다** (예: Settings Pack, Estimate Pack, Project Pack, UI Polish Pack, Performance Pack) — 서로 밀접하게 관련된 작업을 여러 번에 나눠 구현하지 않는다. 하나의 팩을 완전히 끝낸 후 다음으로 넘어간다.
- **승인 프롬프트 최소화**: QA는 팩당 한 단계로 묶는다. Commit도 팩당 1개로 묶는다. Push도 팩당 1개로 묶는다. 불필요한 중간 단계를 만들지 않는다.
- **아키텍처 보존**: 항상 `Renderer → IPC → Service → Repository → Provider → Storage` 흐름을 따른다. 이 구조를 우회하지 않는다.
- **릴리스 우선 개발**: 구현 결정 시 우선순위는 1) 안정성 2) UX 3) 성능 4) 유지보수성 순. 명시적으로 요청받지 않은 미래 플랫폼 기능(Community, Chat, Marketplace, Advertisement, AI 등)은 추가하지 않는다 — Desktop ERP 출시 이후로 보류.
- **모든 화면상의 설정은 실제 효과가 있어야 한다** — 죽은 옵션·미구현 placeholder 기능을 남기지 않는다.
- **기본 가정**: 별도 지시가 없는 한 이전 결정을 그대로 따르고, 같은 구현 질문을 다시 묻지 않으며, 기존 프로젝트 관례를 따르고, 하위 호환성을 유지한다.
- **QA**: 각 Feature Pack 완료 후 QA를 한 번에 묶어서 실행한다.
- **Git**: Feature Pack 완료당 커밋 1개, 푸시 1개.
- **보고 형식** (아래 Response 섹션을 대체):
  - Completed Pack
  - Files Changed
  - QA Results
  - Commit Hash
- **Release는 명시적으로 요청받았을 때만 빌드한다** (기존 Safety Rules와 동일).

## Workflow

기본 워크플로우 (별도 지시 없는 한 유지):

```
1. 기능 개발
2. QA
3. Commit
4. GitHub Push
5. (필요할 때만) Release 빌드
6. 설치 후 실사용 테스트
```

- 1~4단계는 매 작업마다 기본으로 수행한다.
- Release(EXE 빌드, `npm run dist`, 5단계)는 자동으로 하지 않는다 — 사용자가 명시적으로 요청할 때만 실행한다.
- Release 빌드 후에는 설치 파일을 실제로 설치해 실사용 테스트(6단계)까지 거친다.
- 큰 구조 변경이나 데이터 삭제 가능성이 있는 작업은 이 워크플로우와 별개로 항상 먼저 사용자 승인을 받는다.

## Version Policy

- Sprint 완료 시 Patch 버전 증가 (예: 3.8.0 → 3.8.1)
- 기능 추가 완료 시 Minor 버전 증가 (예: 3.8.x → 3.9.0)
- 대규모 구조 변경 시 Major 버전 증가 (예: 3.x → 4.0.0)
- 버전 문자열은 두 곳에 동시에 반영한다: `package.json`의 `version`, `renderer/version.js`의 `window.__APP_VERSION__`.

## Bug Policy

- Critical: 즉시 수정
- Major: 현재 Sprint 종료 후 수정
- Minor: TODO에 등록 후 다음 Sprint에서 처리
- UX: TODO에 등록 후 우선순위에 따라 처리

## TODO Policy

- 새로운 기능 요청은 바로 구현하지 않는다.
- 반드시 `docs/03_TODO.md`에 등록한 후, 우선순위를 정해서 Sprint 단위로 개발한다.

## Documentation Files

- `README.md` — 프로젝트 소개
- `CLAUDE.md` — 개발 규칙 (Claude Code가 자동으로 읽는 파일이라 루트에 고정 — `docs/`로 옮기지 않음)
- `IDEAS.md` — 아이디어 저장소
- `docs/00_PROJECT_VISION.md` — 장기 비전/철학 (가장 중요)
- `docs/01_ARCHITECTURE.md` — 아키텍처(현재 구조 + Cloud-Ready 방향)
- `docs/02_ROADMAP.md` — 단계별 로드맵
- `docs/03_TODO.md` — 다음 Sprint 작업
- `docs/04_CHANGELOG.md` — 개발 변경 이력
- `docs/05_RELEASE_NOTES.md` — 사용자 업데이트 내역

문서는 실제로 채워진 것만 유지한다 — 내용 없는 placeholder 문서는 만들지 않는다.

## Investigation

- 먼저 필요한 함수만 조사한다.
- 조사 후 수정 계획을 3줄 이내로 설명한다.
- 수정 후 변경된 파일과 줄 번호만 보고한다.
- 긴 설명은 생략한다.

## Token Saving

- 같은 파일을 반복해서 다시 읽지 않는다.
- 이미 조사한 내용은 재사용한다.
- 필요한 코드 블록만 읽는다.
- 전체 app.js를 다시 분석하지 않는다.
- REPORT.md, REPORT_FIX.md는 요청 시에만 읽는다.

## Project

주요 UI는 renderer/app.js에 있다.

ProjectDashboard 수정 시 다른 컴포넌트는 건드리지 않는다.

QuoteCalculator 수정 시 다른 계산기는 건드리지 않는다.

DatabaseManager 수정 시 Dashboard는 건드리지 않는다.

## Response

Release Sprint Mode가 활성화된 동안은 위 "Release Sprint Mode" 섹션의 보고 형식(Completed Pack/Files Changed/QA Results/Commit Hash)을 따른다. 그 외에는 아래 형식을 사용한다.

- 수정 파일
- 수정 줄 번호
- 수정 내용
- 테스트 결과
