# cloud/

Reserved for future NAS/Cloud provider implementations and synchronization logic (Roadmap Phase 2+, see `docs/02_ROADMAP.md` and `docs/01_ARCHITECTURE.md`).

This folder intentionally contains no active code yet:

- No server connection.
- No authentication.
- No changes to the existing SQLite database or schema.

When a NAS or Cloud backend is implemented, it should live here as a provider implementing the same interface `providers/sqliteProvider.js` exposes today (`getStorageDir` / `getDb`, or an equivalent accessor), so `repositories/kvRepository.js` and everything above it require no changes.
