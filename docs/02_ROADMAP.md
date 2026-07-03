# Roadmap

Phased roadmap toward the long-term goals in `00_PROJECT_VISION.md`. Each phase lists its goal, the features it covers, and what "done" means before moving to the next phase. Phases are sequential in priority, not necessarily in strict start/end dates.

---

## Phase 1 — Desktop ERP

**Goal**: A complete, reliable, offline-first desktop tool covering the full signage business workflow for a single shop.

**Features**:
- 견적 계산기 (quote builder, PDF/Excel export)
- 시안 의뢰서 (design brief)
- LED 계산기 (channel/tube/board)
- 프로젝트 대시보드 (project ↔ quote linked status/KPI)
- 거래처 · 단가 관리 (vendors and price books)
- 설정 (회사정보/출력설정/프로그램설정/라이선스)
- Trial/Pro licensing

**Completion criteria**: Every core workflow above works fully offline, backed by SQLite, with no known data-loss or calculation bugs. *(Status: functionally complete and in beta testing.)*

---

## Phase 2 — Architecture / Cloud Ready

**Goal**: Restructure the codebase so a future NAS/Cloud backend can be added later without touching the UI or business logic — per `00_PROJECT_VISION.md`'s Development Principles.

**Features**:
- `repositories/` — backend-agnostic data-shape interfaces (e.g. `kvRepository`)
- `providers/` — backend connections, SQLite as the only active one (`sqliteProvider`)
- `services/` — business-capability orchestration (existing precedent: `license-service.js`)
- `cloud/` — reserved for future NAS/Cloud provider implementations (no active code yet)
- Documented extension points (see `01_ARCHITECTURE.md`)

**Completion criteria**: `main.js`'s storage IPC handlers delegate to `repositories/providers` instead of inline SQL, with zero behavior change; the architecture is documented; no server connection or schema change has been introduced.

---

## Phase 3 — Attachments / Calendar / Kanban

**Goal**: Round out the Desktop ERP with the remaining project-management features already anticipated by the existing project/quote data model.

**Features**:
- 첨부파일 (file attachments on projects/quotes)
- 일정 (calendar view for deadlines/installations)
- 칸반 보드 enhancements beyond the current status-driven kanban

**Completion criteria**: All three features work fully offline against the existing SQLite store, with no changes to the Phase 1 data already saved by users.

---

## Phase 4 — Supplier Network

**Goal**: Connect shops to material suppliers (starting with 제일에코-style vendors) beyond manually-entered price books.

**Features**:
- Supplier directory / listings
- Supplier-maintained price books synced into the app
- Premium supplier promotion (see Future Monetization in `00_PROJECT_VISION.md`)

**Completion criteria**: A shop can browse and adopt a supplier's price list without hand-entering it, while manually-entered vendors (Phase 1 behavior) keep working unchanged.

---

## Phase 5 — Community

**Goal**: Give shops a place to exchange knowledge, ask questions, and communicate — includes the Chat goal from the vision.

**Features**:
- Community boards/forums
- Chat (direct/group messaging between shops and suppliers)
- Notifications

**Completion criteria**: Community features are optional cloud enhancements; the desktop app continues to function fully with community features unavailable/offline.

---

## Phase 6 — Marketplace

**Goal**: Enable commerce between shops, suppliers, and customers — includes Joint Purchasing and Advertisement from the vision.

**Features**:
- Marketplace listings
- Joint purchasing (group buys across shops)
- Advertisement placements

**Completion criteria**: Marketplace transactions are additive cloud features; no desktop workflow depends on marketplace availability.

---

## Phase 7 — AI Platform

**Goal**: Layer an AI assistant across the platform for quoting, design, and business assistance.

**Features**:
- AI Assistant (quote drafting help, design suggestions)
- AI Subscription (Future Monetization)

**Completion criteria**: AI features are opt-in and degrade gracefully offline; core ERP workflows never require AI availability.

---

## Consistency with `00_PROJECT_VISION.md`

| Vision goal | Roadmap phase |
|---|---|
| Desktop ERP | Phase 1 |
| Cloud Platform (offline-first, cloud-ready) | Phase 2 |
| (ERP feature completion) | Phase 3 |
| Supplier Network | Phase 4 |
| Community, Chat | Phase 5 |
| Marketplace, Joint Purchasing, Advertisement Platform | Phase 6 |
| AI Assistant | Phase 7 |

Every phase after Phase 2 is an optional cloud enhancement per the Core Philosophy in `00_PROJECT_VISION.md`: the desktop application must always work fully offline.
