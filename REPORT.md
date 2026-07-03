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
