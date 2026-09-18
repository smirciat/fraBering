# Issue #43 — Archive pilots no longer employed

## Request

Archive pilots who no longer work at Bering Air, and optionally **view archived** pilots’ ROT records.

## Behavior

- **Archive** sets on the Firebase `pilots` doc:
  - `rotArchived: true`
  - `isActive: false` (consistent with pilot board / roster inactive handling)
- **Restore** sets `rotArchived: false`, `isActive: true`.
- Pilots with `isActive === false` (legacy) are treated as archived even without `rotArchived`.
- Archived pilots are **omitted** from the ROT pilot dropdown unless **Show archived pilots** is checked (shared via `RotPilotContext` on Records, SIC hours, etc.).
- **Archive pilot** / **Restore pilot** buttons and the show-archived checkbox are limited to approvers (`RotAccess.canArchiveRotPilots`).

## Files

- `client/app/rot/rotPilotContext.service.js` — `allPilots`, `showArchived`, `isPilotArchived`, `mergePilotDoc`
- `client/app/rot/rotPilotSelector/*` — UI + Firebase update
- `client/app/rot/rotAccess.service.js` — `canArchiveRotPilots`
- `client/app/rot/records/records.controller.js` — refresh `pilots` when list changes

## Deploy

Client only: **`grunt build`**.

## QA

1. Approver: select active pilot → **Archive pilot** → pilot disappears from list.
2. Check **Show archived pilots** → pilot reappears with “(archived)”.
3. Open their records → data loads; yellow archived notice shows.
4. **Restore pilot** → pilot returns to default list without checkbox.
