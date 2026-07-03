# CHANGELOG

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


