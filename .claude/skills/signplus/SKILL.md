---
name: signplus
description: Signplus Suite(간판 통합 관리 Electron 앱) 프로젝트 전체 오케스트레이터. 이 저장소에서 기능 개발, 버그 수정, UI 변경, Feature Pack 작업, 릴리즈 준비 등 어떤 작업 요청이든 이 스킬을 먼저 참조해서 (1) 어느 Feature Pack에 속하는지 (2) 어떤 QA 기준을 적용할지 (3) 어떤 보고 형식을 쓸지 (4) 사용자 승인이 먼저 필요한 작업인지를 판단한다. CLAUDE.md의 Release Sprint Mode, Lean QA Policy, 아키텍처 계층, 저장소 모델, Safety Rules를 매번 다시 찾아보지 않도록 압축해 둔 라우팅 체크리스트다. "스킬"이라는 단어가 없어도, main.js/preload.js/renderer/app.js/license-common.js 수정, 빌드/릴리즈, 버전업, 커밋/푸시와 관련된 모든 요청에서 사용한다.
---

# Signplus Master 라우팅 체크리스트

작업을 시작하기 전에 아래 순서로 판단한다. CLAUDE.md가 상위 규칙이며, 이 스킬은 그것을 빠르게 적용하기 위한 요약이다. 상세 내용이 필요하면 CLAUDE.md 원문을 확인한다.

## 0. 항상 적용되는 기본 규칙

사용자가 명시적으로 다른 지시를 하지 않는 한 모든 작업에 우선 적용한다.

1. 프로젝트 전체를 다시 분석하지 않는다 — 이미 조사한 내용을 재사용한다.
2. 사용자가 지정한 파일만 읽고 작업한다. 다른 파일은 필요할 때만 읽는다.
3. 새 파일은 꼭 필요한 경우에만 생성한다.
4. 기존 함수명과 구조를 유지한다.
5. 중복 함수·중복 계산 로직을 만들지 않는다 — 기존 서비스를 우선 재사용한다.
6. 코드 설명은 최소화한다.
7. **Commit과 Push는 사용자가 명시적으로 요청했을 때만 수행한다** — 아래 5번 섹션의 Feature Pack Automation은 구현→QA까지만 자동 진행하고, Commit/Push 직전에 멈춰 결과를 보고한다.
8. 프로젝트 전체 리팩토링은 사용자가 요청한 경우에만 수행한다.
9. 기존 기능을 깨는 변경은 하지 않는다. 변경 범위를 최소화하고, 작업 전 항상 변경 범위를 먼저 확인한다.
10. REPORT.md는 코드가 실제로 변경된 경우에만 업데이트한다(분석·설계만 한 작업은 기록하지 않음).
11. 결과 보고는 기본적으로 "변경 파일 + 변경 이유 + QA 결과"만 출력한다(아래 7번 섹션 참고, Release 빌드 등 별도 형식이 명시된 경우는 그 형식을 따른다).

## 0-1. Low Token Mode (기본 활성)

프로젝트 품질은 유지하면서 Context/Token 사용을 최소화한다. 명시적으로 다른 지시가 없는 한 항상 이 순서로 동작한다.

**읽기 범위 — 필요한 만큼만 단계적으로 확장**
1단계: 지금 작업 중인 파일만 읽는다.
2단계: 그 파일이 직접 호출/참조하는 파일만 추가로 읽는다.
3단계: 그래도 부족하면 관련 서비스(services/)만 확인한다.
4단계: 프로젝트 전체 스캔은 사용자가 "전체 분석" / "리팩토링" / "아키텍처 변경"이라고 명시했을 때만 수행한다 — 그 외에는 금지.

**작업 전 항상 확인**
- 새 구조·새 파일을 만들기 전에 기존 서비스에 같은 계산 함수·같은 기능이 이미 있는지 먼저 검색한다. 있으면 재사용하고 새로 만들지 않는다.
- 항상 "가장 작은 수정 범위"를 고른다 — Smallest Change First: 기존 코드 수정 → 기존 서비스 재사용 → (필요할 때만) 새 파일 생성 → (최후에만) 구조 변경.

**출력**
- 설명은 최소화한다. 결과는 "변경 파일 / 변경 이유 / QA"만 출력하고 그 외 불필요한 출력은 하지 않는다(Context 유지 목적).

## 1. Feature Pack 식별

관련 작업을 하나의 팩으로 묶는다 (Settings Pack, Estimate Pack, Project Pack, UI Polish Pack, Performance Pack 등). 이미 진행 중인 팩이 있으면 관련 없는 새 작업을 시작하기 전에 그 팩부터 끝낸다. 팩 하나 = QA 한 번, Commit 한 개, Push 한 번.

## 2. 아키텍처 게이트 (우회 금지)

`Renderer → IPC → Service → Repository → Provider → Storage`

| 파일 | 역할 |
|---|---|
| `main.js` | 모든 파일시스템/OS 작업. `ipcMain.handle` 엔드포인트 (license, storage-get/set, backup-export/import, export-excel, export-pdf, pick-image). `EXCEL_THEMES` (`main.js:123`) |
| `preload.js` | 유일한 브릿지. `window.storage / api / license / backup`. 새 main 기능은 반드시 여기에도 노출 추가 |
| `renderer/app.js` | 전체 UI/로직, hyperscript `h()`, JSX 없음, 1900+ 줄. `QUOTE_THEMES` |
| `renderer/jeil-presets.js` | `JEIL_PRESETS` 시드 데이터 |
| `license-common.js` | HMAC 라이선스 스킴, main 전용 (렌더러에서 미사용이어도 죽은 코드 아님) |

새 컴포넌트가 다른 컴포넌트의 저장을 감지해야 하면 `sp-storage-changed` DOM 이벤트를 쓴다 (새 상태 플러밍 만들지 않기). 저장은 `window.storage.get/set(key, ...)` → `userData/signplus-suite-data/`의 키별 JSON 파일 하나. 백업은 `license.json` 제외 전체 번들.

## 3. 우선순위 (Release Sprint Mode)

안정성 > UX > 성능 > 유지보수성. Community/Chat/Marketplace/Advertisement/AI 등 명시적으로 요청받지 않은 미래 기능은 추가하지 않는다 — ERP 출시 이후로 보류.

## 4. QA 게이트 (Lean QA Policy — 이것만 필수)

- Build 성공
- 앱 실행됨
- 핵심 기능 동작
- 데이터 save/load 동작
- PDF/Excel export (변경했을 때만)
- 크래시/블로킹 에러 없음

같은 것을 다른 방법으로 반복 검증하지 않는다 (스크린샷 반복, 중복 CDP/DOM 체크, CSS/HTML 문자열 비교 등 생략). 이전 검증이 실패했을 때만 다른 방법으로 재검증한다.

## 5. 승인이 먼저 필요한 경우 (진행 전 반드시 확인)

- 기존 기능 삭제
- 큰 구조 변경, 데이터 삭제 가능성 있는 작업
- Release 빌드 (`npm run dist`) — 요청받았을 때만
- Commit, Push — 요청받았을 때만 (0번 기본 규칙 7)
- 위에 해당하지 않으면: 구현 → QA까지는 멈추지 않고 진행한다(Feature Pack Automation). QA 완료 후에는 Commit/Push 없이 결과만 보고하고 멈춘다.

## 6. 버전 정책

`package.json`의 `version`과 `renderer/version.js`의 `window.__APP_VERSION__`을 항상 같이 올린다. 팩 완료 시 patch, 기능 추가 완료 시 minor, 대규모 구조 변경 시 major. (버전 파일 수정도 코드 변경이므로 실제로 커밋하지 않더라도 QA·보고 대상에는 포함한다.)

## 7. 보고 형식

**기본(대부분의 작업)**:
- 변경 파일
- 변경 이유
- QA 결과

**Release 빌드(`npm run dist`)** 작업만 예외:
- Build Status / Version / Build Time / Installer Path / Installer Size / Recovery Actions

Commit까지 사용자가 명시적으로 요청/승인한 경우에만 Completed Pack/Files Changed/QA Results/Commit Hash 형식을 쓴다.

## 8. 커뮤니케이션 규칙

한글로만 소통한다. 이미 CLAUDE.md의 Standing Decisions에서 결정된 사항(하위 호환성 유지, 기존 관례 따르기, 유지보수성/확장성 우선 등)은 다시 묻지 않고 그대로 적용한다. 정말로 사용자만 판단할 수 있는 지점(비즈니스 요구사항 충돌, 삭제/구조변경 승인)일 때만 질문한다.

## 9. 컴포넌트 격리 규칙

`ProjectDashboard` 수정 시 다른 컴포넌트 건드리지 않기. `QuoteCalculator` 수정 시 다른 계산기 건드리지 않기. `DatabaseManager` 수정 시 Dashboard 건드리지 않기.
