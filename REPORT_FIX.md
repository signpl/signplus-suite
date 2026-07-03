REPORT_FIX — Quick diagnostic
작성일: 2026-07-03

요약
- 최근 수정 파일: `preload.js`, `renderer/app.js`, 신규: `CHANGELOG.md`, `REPORT.md`.
- 목적: 대시보드 실시간 갱신을 위해 `sp-storage-changed` 이벤트를 디스패치하고, `ProjectDashboard`가 이를 수신하도록 변경.

수정 파일 목록
- preload.js (수정)
- renderer/app.js (수정)
- CHANGELOG.md (추가)
- REPORT.md (추가)

중요 변경 요약
- `preload.js`: `storage.set` 완료 후 `window.dispatchEvent(new CustomEvent('sp-storage-changed', { detail: { key } }))` 호출 추가.
- `renderer/app.js`:
  - `ProjectDashboard`에 `selectedQuoteId` 상태 추가.
  - `useEffect`로 `sp-storage-changed` 이벤트 수신기 추가하여 `sp2-quotes` 재로딩하도록 함.
  - 프로젝트 추가 폼에 `견적 선택` 드롭다운 추가 및 `addProject`가 `quoteId`를 저장하도록 변경.

가장 빠르게 검사할 항목 (우선순위)
1. `renderer/app.js`의 `Sel(...)` 호출 블록(프로젝트 추가 폼) — 복잡한 표현식으로 문법/런타임 예외 가능.
2. `ProjectDashboard` 내 `useEffect` 이벤트 핸들러 — `loadKey` 호출 중 예외 발생 가능.
3. `addProject` 변경부에서 사용하는 `uid()`/`todayISO()` — 정의 누락이나 예외 발생 가능성.
4. `preload.js`의 `window.dispatchEvent` 호출 — preload 환경에서 예외가 발생해 렌더러 로드 중단 가능성(방어로 감싸긴 했음).
5. 기타 렌더러 초기화 코드(이미 존재하던 큰 `renderer/app.js`) — 변경 위치 근처에서 발생한 작은 실수로 전체 렌더링이 실패할 수 있음.

권장 디버깅 절차
- 개발자 콘솔(DevTools) 열기: 렌더러에서 발생한 예외 메시지(스택트레이스)를 확인하세요.
- 위 5개 지점에 `console.log` 또는 `try/catch`를 임시로 추가하여 어디서 예외가 나는지 좁혀보세요.
- 빠른 테스트: `preload.js`에서 이벤트 디스패치 코드를 주석 처리한 상태로 앱 실행해 보고 증상이 사라지는지 확인.

참고: 변경사항은 자동으로 되돌리지 않았습니다. 되돌리길 원하시면 어떤 파일을 되돌릴지 알려주세요.
