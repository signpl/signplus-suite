# CHANGELOG

## v3.11.2 견적서 상호 미표시 수정

- 견적서 PDF/미리보기 상단 우측 공급자 정보 블록에 `company.name`(상호)을 출력하는 코드가 아예 없었던 결함을 수정 — 로고가 있으면 로고만, 없으면 하드코딩된 "SIGNPLUS+" 텍스트만 보이고 실제 회사명은 문서 맨 아래 서명란에만 나오던 문제.
- 로고 유무와 무관하게 상호를 항상 상단에 표시하도록 변경(로고가 있으면 로고 아래, 없으면 그 자리에 직접 출력), 값이 없을 때만 기존과 동일하게 "SIGNPLUS+"로 폴백.

## v3.11.1 회사정보 반영 안정화

- `app.setName("Signplus Suite")`를 명시적으로 고정 — 이름을 고정하지 않으면 개발 실행("electron .")과 패키징된 설치본이 서로 다른 userData 폴더(=서로 다른 signplus.db)를 바라볼 수 있어, 한쪽에서 저장한 회사정보가 다른 쪽에서는 비어 보이는 원인이 될 수 있었다.
- 회사정보 로드 시 `{ ...DEFAULT_COMPANY, ...저장값 }`으로 항상 병합해, 예전 버전에서 저장된(신규 필드 없는) 값이 남아있어도 항상 완전한 모양의 `company` 객체가 되도록 함.
- `saveCompany`가 항상 `DEFAULT_COMPANY` 기준으로 병합한 완전한 객체를 state와 저장소에 동시에 반영하도록 변경 — 로고/직인만 바꾸는 부분 업데이트가 다른 필드를 지우지 않고, 화면(state)과 저장소가 항상 같은 모양으로 동기화됨.

## v3.11.0 회사정보 통합

- 회사정보(`sp2-company`)를 단일 공통 설정으로 통합: 영문회사명(`nameEn`), 계좌정보(`bankInfo`)를 새 필드로 추가하고, 기존에 별도 키(`sp2-brand`)로 관리되던 로고/직인을 `sp2-company`로 이전(최초 실행 시 1회 자동 마이그레이션, `sp2-brand` 원본은 안전망으로 보존)
- 견적 계산기(QuoteCalculator)와 설정(SettingsCompanySection)이 각자 관리하던 로고/직인 상태를 제거하고 공통 `company` 객체를 그대로 참조하도록 변경 — 어느 화면에서 로고/직인을 등록하든 즉시 모든 문서에 반영됨
- 견적서 PDF/엑셀에 영문회사명·홈페이지·입금계좌 정보 표시 추가(값이 없으면 기존과 동일하게 표시 안 함, 레이아웃 변경 없음)
- 시안 의뢰서 PDF 하단 문구에 하드코딩돼 있던 "싸인플러스(Signplus+)" 텍스트를 회사정보의 회사명으로 자동 대체

## v3.9.0

- USER/MASTER 구조
- 시리얼 생성기

## v3.8.6 Beta Trial Serial

- 베타 테스터 전원에게 배포할 공용 시리얼 종류 추가: `SPS-BETA-XXXX-XXXX-XXXX` (`license-common.js`의 `generateBetaSerial`)
- 접두사만으로 통과되지 않고 기존과 동일한 HMAC 체크섬 검증을 거침(`checkSerial`에 `beta` 분기 추가, 하드코딩된 "항상 유효" 문자열 없음)
- 발급일이 아니라 "이 기기에서 최초 활성화한 시각"을 기준으로 30일 만료 계산(`license-service.js`, 공유 시리얼이라 발급일 개념이 의미 없음)
- 만료 시 기존 `LicenseGate`로 앱 진입 차단 — 기존 Trial/Pro 흐름과 동일
- 하위호환: 기존 Trial(customer)/Pro(admin) 시리얼과 `license.json` 포맷 변경 없음, tier 매핑에 `beta -> trial` 한 줄만 추가

## v3.8.5 Trial and Pro License System

- 베타 테스트를 위해 라이선스를 Trial/Pro 2종으로 정리 (기존 일반=Trial, 관리자=Pro로 매핑, 시리얼 형식·검증 로직은 변경 없음)
- `license-service.js`에 `tier`(pro/trial) 표시 필드 추가 — 기존 `type`(admin/customer)은 그대로 유지, `tier`는 추가 필드라 하위호환 영향 없음
- Trial: 30일 사용, 남은 일수 표시, 만료 시 앱 진입 차단(`LicenseGate`) — 기존 로직 그대로
- Pro: 무제한 사용, 만료 없음, 전체 기능 사용 가능 — 기존 관리자 로직 그대로
- 사이드바/관리자 대시보드에 "Trial Version"/"Pro Version" 표시 추가

## v3.8.3 Unified Project Status System

- 견적(Quote)·프로젝트(Project)·대시보드 KPI가 공유하는 단일 상태 정의(`STATUSES`: 상담중/견적발송/계약/시공중/완료) 도입
- 견적의 자체 상태 어휘(작성중/발주/진행중/완료)를 폐기하고 공용 상태를 직접 사용하도록 변경
- 상태 변환/색상 매핑을 `normalizeStatus`/`STATUS_COLOR_KEY` 단일 함수·맵으로 통합(중복 매핑 제거)
- 프로젝트 상세(펼치기)에 공용 상태 드롭다운 추가 — 변경 시 연결된 견적 상태와 KPI가 즉시 함께 갱신됨
- 하위호환: 구버전 견적 상태(작성중→상담중, 발주→견적발송, 진행중→시공중, 완료→완료)는 읽을 때 자동 매핑되며 기존 저장 데이터는 그대로 유지

## v3.8.0

- 관리자 라이선스 대시보드 추가
- 상태 연동 개선
- UI 개선

## v3.7.2 Sprint2.1 (Bug Fix)

- 프로젝트 상태/금액을 연결된 견적 기준(Source of Truth)으로 통일
  - `effectiveProjectStatus`/`effectiveProjectAmount` 추가 — 연결된 견적이 있으면 그 견적의 상태·판매금액(total)을 그대로 사용
  - 프로젝트 카드/목록/KPI 집계/정렬/필터가 모두 이 기준으로 동시에 갱신됨 (별도 동기화 없이 렌더 시점에 계산)
  - 견적이 연결된 프로젝트는 칸반 수동 이동 버튼을 비활성화(상태는 견적 계산기에서 변경)
- 프로젝트 카드 요약을 "견적 N건 / 총금액 ○○○원 / 상태 ○○" 형식으로 변경
- 기존 저장 데이터 호환: 연결된 견적이 없는 프로젝트는 기존처럼 자체 `amount`/`status` 사용

## v3.7.0 Sprint1

- Dashboard: 프로젝트 대시보드가 `sp2-quotes` 저장소의 상태 변경을 실시간으로 반영하도록 수정
  - `preload.js`의 `storage.set` 호출 후 `sp-storage-changed` CustomEvent를 디스패치하도록 추가
  - `ProjectDashboard` 컴포넌트에서 해당 이벤트를 수신해 견적 데이터를 재로딩하도록 추가
- 프로젝트 추가 폼과 견적 데이터 연동
  - 대시보드의 프로젝트 추가 화면에 "견적 선택" 드롭다운을 추가하여 저장된 견적을 선택하면 거래처·프로젝트명·금액을 자동으로 채움
  - 프로젝트 저장 시 선택된 견적의 `quoteId`를 함께 저장하여 연동 유지
- 기존 데이터와 호환되도록 변경: 선택된 `quoteId`는 선택적 필드이며, 기존 프로젝트 데이터는 영향 없음
- UI 디자인은 기존을 유지하도록 변경함

파일 변경 요약:
- 수정: `preload.js` (storage.set 이벤트 디스패치)
- 수정: `renderer/app.js` (ProjectDashboard 실시간 업데이트 및 견적 연동)
- 추가: `CHANGELOG.md`

테스트:
- 로컬 저장소의 `sp2-quotes` 키에 대한 쓰기(견적 저장) 시 `sp-storage-changed` 이벤트 발생으로 대시보드가 자동으로 최신 견적 데이터로 갱신됩니다.


