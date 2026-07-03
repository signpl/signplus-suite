# CHANGELOG

## v3.9.0

- USER/MASTER 구조
- 시리얼 생성기

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


