프로젝트 분석 보고서 — Signplus Suite
작성일: 2026-07-03

1) 전체 프로젝트 구조
- 최상위 파일들: [package.json](package.json), [package-lock.json](package-lock.json), [main.js](main.js), [preload.js](preload.js), [index.html](index.html), [README.md](README.md), [license-common.js](license-common.js)
- 폴더: [renderer/](renderer/) (UI · 앱 로직), [vendor/](vendor/) (React 배포본)
  - 주요 파일: [renderer/app.js](renderer/app.js#L1-L1836), [renderer/jeil-presets.js](renderer/jeil-presets.js), [renderer/version.js](renderer/version.js)

2) `renderer` 폴더 분석
- 단일 번들(순수 JS)로 작성된 React 기반 SPA (no build step 필요한 형태).
- 주요 역할
  - UI 컴포넌트 및 페이지 일괄 포함: 견적 계산기, 시안 의뢰서, LED 계산기, 거래처·단가 DB, 대시보드 등.
  - 클라이언트 측 로컬 저장은 `window.storage`(preload → ipc)로 main 프로세스에 위임.
  - 프리셋(단가) 기본값: [renderer/jeil-presets.js](renderer/jeil-presets.js).

3) `app.js`(또는 가장 큰 파일)의 줄 수와 역할
- 파일: [renderer/app.js](renderer/app.js#L1-L1836)
- 줄 수: 1,836줄
- 역할 요약: 앱의 루트 React 애플리케이션을 포함. 주요 컴포넌트:
  - `QuoteCalculator`: 견적 생성/편집/저장, PDF·엑셀 내보내기, 단가 프리셋 연동
  - `DesignBrief`: 시안 의뢰서 작성·PDF 생성
  - `LedCalculator` (채널/형광등/전광판 서브툴)
  - `DatabaseManager`: 거래처·단가 관리(거래처별 단가 스토어 지원)
  - `ProjectDashboard`: KPI·차트·칸반
  - 공용 UI 유틸(카드, 버튼, 입력 등), PDF/HTML 빌더, 아이콘 등

4) Electron 구조
- 메인 프로세스: [main.js](main.js)
  - 윈도우 생성, `ipcMain` 핸들러 제공: 라이선스 확인/활성화, 로컬 JSON 저장소(`storage-get`/`storage-set`), 백업/복원, PDF/Excel/이미지 처리 등.
  - 로컬 저장은 앱 데이터 경로 하위 `signplus-suite-data` 폴더에 JSON 파일(키 → 파일명)로 저장.
- 프리로드: [preload.js](preload.js) — contextBridge로 `storage`, `api`, `license`, `backup` 노출
- 렌더러 진입: [index.html](index.html)에서 React + [renderer/app.js](renderer/app.js) 로드

5) `package.json` 분석
- `name`: signplus-suite, `version`: 3.6.0, `main`: main.js
- 스크립트: `start`(electron .), `dist`(electron-builder)
- devDependencies: `electron`, `electron-builder`; dependencies: `exceljs`(엑셀 내보내기)
- 빌드 설정: `appId`, `asar: true`, 포함할 파일 목록과 Windows NSIS 설치자 설정
- 라이선스: `UNLICENSED`, `private: true`

6) 데이터 저장 방식 분석
- 메인에서 `getStorageDir()`로 앱 데이터 폴더(앱별 userData) 내 `signplus-suite-data` 디렉터리 생성
- 키별 JSON 파일 방식: `keyToFile(key)` → 안전한 파일명 생성 → `fs.writeFileSync(keyToFile(key), value)`로 저장
- 저장 대상: 견적(`sp2-quotes`), 의뢰서(`sp2-briefs`), 거래처(`sp2-clients`), 단가(`sp2-presets`·거래처별 `sp2-presets-<id>`), 회사정보(`sp2-company`) 등
- 이미지: 로고/도장 등은 base64 data URL로 JSON에 저장(용량 증가 가능)
- 백업/복원: 저장된 모든 JSON(license 제외)을 하나의 JSON 파일로 묶어 내보내기/불러오기

7) 견적 계산기 구조
- 컴포넌트: `QuoteCalculator` (items 배열 → 원가·마진 계산 → 판매단가/합계 계산)
- 마진 처리: 전체 `marginRate` + 품목별 `marginOverride` 적용
- 단가 불러오기: 거래처 프리셋(기본 `jeil`)에서 항목 추가 가능
- 출력: `buildQuoteHTML`로 PDF용 HTML 생성 → main의 `export-pdf` 호출, 또는 ExcelJS를 이용한 `export-excel`

8) 프로젝트 대시보드 구조
- `ProjectDashboard`에서 로컬 프로젝트 리스트(`sp2-projects`) 관리
- 견적(발주/진행/완료) 데이터를 자동 집계하여 KPI·월별 차트 생성
- 칸반(상태별 컬럼)으로 프로젝트 이동·관리

9) 라이선스 구조
- 공통 검증 모듈: [license-common.js](license-common.js)
  - 시리얼 종류: 관리자용(`SPXA-...`, 무제한), 일반 고객용(`SPX-...`, 발급일로부터 30일)
  - HMAC·인코딩 방식으로 시리얼 무결성 검증 및 발급일 추출
- main에서 `ipcMain` 핸들러(`license-status`, `license-activate`) 제공
- 렌더러에선 `LicenseGate` UI를 통해 입력/활성화

10) 기능별로 분리 가능한 구조 제안
- suggested 모듈화(폴더 구조)
  - src/ (TypeScript 권장)
    - main/ (main 프로세스 코드)
      - ipcHandlers.js
      - storage.js (async wrappers)
      - license.js (secret은 환경변수 또는 서명 서버로 이동)
    - preload/
    - renderer/
      - components/ (QuoteCalculator/, DesignBrief/, LedCalculator/, DatabaseManager/, Dashboard/ 등)
      - ui/ (Card, Btn, Field 등 재사용 컴포넌트)
      - services/ (storageService, backupService, vendorService)
      - utils/ (formatters, money, id)
      - presets/ (jeil-presets.js → JSON/DB)
  - assets/
  - tests/
- 이점: 유지보수성·테스트성 개선, 빌드·번들 최적화 가능

11) 발견한 문제점
- 민감정보: `LICENSE_SECRET`가 [license-common.js](license-common.js) 안에 하드코딩되어 있어 보안 위험(레포지토리 유출 시 시리얼 생성기/검증 위협).
- 동기 I/O 사용: main 프로세스에서 `fs.readFileSync`/`writeFileSync` 다수 사용 — 장시간 작업 시 UI 블로킹 위험.
- 이미지/대형 바이너리를 base64로 JSON에 저장 → 저장 파일 급증·메모리·퍼포먼스 문제 가능.
- 백업 복원 시 사용자 확인 외에 버전/스키마 검증 부족(마이그레이션 안전장치 없음).
- 일부 입력/파일 경로에 대한 엄격한 검증·크기 제한 미비.
- `asar: true` 패키징 시 동적 require 또는 외부 리소스 접근 패턴이 문제될 수 있음(현재 코드는 주로 정적 파일이라 영향 적음).

12) 개선 우선순위 TOP20 (권장 순서)
1. (보안 1) `LICENSE_SECRET` 제거 · 서명/검증을 서버로 이관 또는 환경변수 사용 (긴급)
2. (안정성) main 프로세스에서 동기 fs 호출을 비동기로 전환하여 UI 블로킹 제거
3. (저장) 이미지(로고/도장/붙여넣기 이미지)는 파일 시스템(또는 IndexedDB/Blob)으로 분리하고 JSON에는 참조만 저장
4. (백업) 백업 파일 검증·스키마 버전 추가 및 복원 전 시뮬레이션·충돌 처리 추가
5. (데이터) 키→파일 매핑 정형화 및 최대 파일 크기/개수 제한 도입
6. (보안 2) 백업·임시 파일 생성 경로와 권한 검토, 민감 데이터 암호화 고려
7. (신뢰성) PDF 생성 흐름에서 예외·타임아웃 처리 및 명확한 사용자 피드백 추가
8. (성능) 대용량 프리셋/거래처 로딩 시 가상화(virtualized list) 적용
9. (유지보수) `renderer/app.js`를 여러 파일로 분리(components/services/utils) — 기술부채 완화
10. (UX) 저장된 항목 페이징·정렬·필터링 개선(특히 단가표 검색 성능)
11. (테스트) 유닛/통합 테스트 도입 (ipc 핸들러, 데이터 마이그레이션, 핵심 계산 로직)
12. (배포) 자동 업데이트(예: electron-updater) 추가 검토
13. (안정성) 파일 쓰기 실패·디스크 부족 상황에 대한 롤백/재시도 로직
14. (데브) 코드베이스를 TypeScript로 점진 마이그레이션 권장
15. (보안 3) 사용자 입력(파일명, 시리얼 등) 검증 강화 — 경로 주입·형식검사
16. (데이터) 저장 구조(키 네임스페이스) 문서화 및 버전 관리 정책 수립
17. (성능) 렌더러 메모리 사용량 모니터링 및 큰 state 분리(이미지 등)
18. (도구) Lint/Prettier/CI 파이프라인 추가
19. (접근성) ARIA/키보드 네비게이션, 컬러 대비 개선
20. (신규) 옵션형 클라우드 백업(사용자 동의 하에)·동기화 기능 고려

v3.7 개발 계획
- 목표: 보안 보강, I/O 비동기화, 저장소 안정화 및 코드 모듈화
1) 보안(1주): `LICENSE_SECRET` 제거 및 서버 기반 시리얼 검증 또는 환경변수 방식으로 전환. 레포지토리에 민감정보 제거.
2) I/O 안정화(1주): main 프로세스의 동기 파일 I/O를 비동기로 전환하고 에러 처리 추가.
3) 저장소 개선(2주): 이미지·대형 바이너리 파일 분리(파일시스템 또는 IndexedDB), 백업 스키마 버전 추가 및 복원 안전화.
4) 코드 리팩토링(2~3주): `renderer/app.js`를 컴포넌트별 파일로 분할하고 `services/`로 비즈니스 로직 이동.
5) 품질·배포(1~2주): 간단한 유닛 테스트 추가, CI 구성, electron-builder 설정 검토 및 자동 업데이트 도입 검토.

요약: 현재 코드는 기능이 잘 정리되어 있고 즉시 사용 가능한 데스크탑 툴입니다. 우선적으로는 시리얼 비밀키와 동기 I/O 관련 보안·안정성 개선을 권장합니다. 이후 저장소(이미지 처리) 분리와 코드 모듈화를 통해 유지보수성과 성능을 높이는 것이 다음 단계입니다.

참고 파일
- `package.json`: [package.json](package.json)
- main 프로세스: [main.js](main.js)
- preload: [preload.js](preload.js)
- 렌더러(메인): [renderer/app.js](renderer/app.js#L1-L1836)
- 프리셋: [renderer/jeil-presets.js](renderer/jeil-presets.js)
- 라이선스 유틸: [license-common.js](license-common.js)

## QuoteEngine 리팩토링 QA (2026-07-06)

- 대상: `services/quoteEngine.js` 분리 이후 최종 QA (커밋 e0ad87e)
- 랜덤 테스트 100세트(마진율/원가/수량/개별 마진 오버라이드 랜덤 조합) 기준, 리팩토링 이전 원본 공식과 `QuoteEngine`의 `effectiveMargin`/`sellPrice`/`lineTotal`/`baseLineTotal`/`computeTotals`/`genQuoteNo` 결과를 전수 비교 → 전부 일치.
- `renderer/app.js`의 `QuoteCalculator`는 마진/합계 계산을 전부 `window.QuoteEngine.*` 호출로 위임하며, 자체 계산식은 남아있지 않음.
- 참고(수정하지 않음): `renderer/app.js`의 `buildQuoteHTML`(라인별 `amt` 계산)과 `main.js`의 Excel export 핸들러는 각각 `unitPrice * qty`를 직접 계산하는 코드가 남아있음. 다만 두 경로 모두 이미 마진이 반영된 판매단가(`exportItems()` 결과)를 입력받아 표시용으로 재계산하는 것이라 `QuoteEngine` 결과와 항상 일치하며, 이번 QA의 수치 비교에서도 불일치는 발견되지 않음.
- 결론: QuoteEngine 리팩토링 QA PASS

## QuoteEngine 중복 계산 정리 (2026-07-06)

- 대상: `renderer/app.js`의 `buildQuoteHTML()`, `main.js`의 `export-excel` 핸들러
- 두 위치 모두 `(Number(unitPrice) || 0) * (Number(qty) || 0)` 를 직접 계산하고 있었음 — `QuoteEngine.baseLineTotal()`과 완전히 동일한 공식이라 "중복 계산 로직"으로 오해될 수 있어 각 호출부를 `QuoteEngine.baseLineTotal()` 호출로 교체(렌더러는 `window.QuoteEngine`, main 프로세스는 `require("./services/quoteEngine.js")`).
- 두 값 모두 이미 마진이 반영된 판매단가(`exportItems()` 결과)를 입력받는 자리라 `baseLineTotal`은 마진을 재적용하지 않고 단순 `unitPrice×qty`만 수행 — 계산 결과·기능은 변경 없음. 해당 지점에 유지 이유를 주석으로 명시.
- QA: `node -c`로 두 파일 문법 검증 통과, `require("./services/quoteEngine.js")`로 main 프로세스에서의 호출 동작 확인, 앱 실행(정상 기동·크래시 없음) 확인.
- 결론: 최종 판정 PASS

## AI 자동견적 엔진 분석 (2026-07-06)

- 요청: 도면 분석 결과로 견적 품목을 자동 생성하는 "EstimateEngine" 신규 구현 검토
- 분석 결과: 요청된 기능은 이미 완전히 구현·배선되어 있음 (v3.12.0~v3.12.2에서 완성).
  - `renderer/app.js`의 `DrawingAnalyzer` 컴포넌트가 도면(AI/PDF/SVG)을 파싱해 `VectorGeometry.groupIntoGlyphs`/`aggregateShapes`로 글자(Character) 단위 분석을 수행
  - `LedEngine.recommendProduction()`이 분석 결과로 LED/SMPS/전선/실리콘 제작 기준값을 계산
  - `VectorQuoteBridge.resolveUnitPrices()`/`buildQuoteItems()`가 단가표(presets)를 조회해 QuoteEngine이 바로 소비할 수 있는 품목 배열(`{id,name,spec,unit,unitPrice,qty,marginOverride}`)로 조립
  - "견적으로 보내기" 버튼 → `onSendToQuote` → `pendingQuoteItems` → `QuoteCalculator`의 `pendingItems` → 기존 품목 배열에 병합 → `QuoteEngine.*`(오늘 분리한 서비스)가 마진/합계/VAT 계산 → 기존 저장(`sp2-quotes`)·PDF·Excel export 전부 그대로 재사용
- 결론: 별도의 "EstimateEngine" 서비스를 새로 만들면 `VectorQuoteBridge`/`LedEngine`과 책임이 겹치는 중복 서비스가 되므로 신규 구현하지 않음(제약사항: 중복 계산 함수 생성 금지). 코드 변경 없음.

## AI 도면 분석 — 한글 글자수 과다 인식 버그 수정 (2026-07-06)

- 증상: 실사용 테스트 중 5음절 단어("너를만난곳")가 10글자로 인식됨(정확히 2배) — 채널/조립/LED 개수 등 자동 견적 품목이 실제 필요량의 약 2배로 부풀려지는 실사용 버그.
- 원인 1: services/pdfVectorParser.js의 assignPdfGroupKeys()와 services/svgVectorParser.js의 characterGroupOf()가 도형의 그룹 판정 시 가장 안쪽(직계) 그룹/큐(q) 레벨만 확인하고 있었음. 도면 구조가 "글자 그룹 > 획(Stroke) 서브그룹"처럼 한 단계 더 중첩되어 있으면, 정작 "글자" 단위인 바깥쪽 그룹은 완전히 무시되고 획 단위로만 인식됨.
- 원인 2: services/vectorGeometry.js의 mergeDistance()에서 Height Similarity/Baseline Alignment 보너스가 실제 근접도와 무관하게 적용되어, 그룹 신호가 없는 도면에서는 같은 줄의 서로 다른 글자끼리도 병합 점수를 부당하게 받아 적응형 컷이 글자 경계가 아닌 엉뚱한 지점에서 끊길 수 있었음.
- 수정:
  - assignPdfGroupKeys()/characterGroupOf(): 직계 레벨만 보지 않고 그룹/큐 조상 체인을 전체 도면의 70% 미만인 동안 계속 타고 올라가 가장 바깥쪽(글자 단위) 그룹을 신호로 사용하도록 변경.
  - mergeDistance(): Height Similarity/Baseline Alignment 보너스에 실제 근접도(Bounding Box 겹침 또는 중심 거리) 게이팅 추가.
- QA: 3개 파일 node -c 문법 검증 통과. assignPdfGroupKeys 중첩 q 구조 단위 테스트(중첩된 획이 글자 단위로 올바르게 묶이고 전체 페이지 q는 제외됨) PASS. groupIntoGlyphs 정상 케이스(간격 차이가 뚜렷한 경우) 및 촘촘한 커닝(자소 간격이 글자 간격과 비슷한 경우, 리포트된 버그와 유사) 케이스, 실제 버그와 동일 규모(5음절 자소 2개씩 10조각) 시나리오 모두 정확히 5글자로 인식 - PASS. GUI 재실행 확인은 이번 세션 도구 오류로 완료하지 못함(코드 변경분은 main.js/preload/저장 로직 미변경, services 순수 함수만 수정).
