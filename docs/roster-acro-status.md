# Roster / AcroRoster integration — status (Aug 2026)

**Ready for primary-user feedback.** `/roster` provides Scheduling, Calendar, Team, and Minimums views inside fraBering login, with a **Live AcroRoster** vs **Local** data-source toggle.

**Goal:** AcroRoster-style scheduling in fraBering. Per-user privileges beyond the role matrix below are deferred.

Deploy and Postgres details: **`docs/roster-postgres.md`**.

## Key files

| Path | Role |
|------|------|
| `client/app/roster/roster.controller.js` | Main UI logic |
| `client/app/roster/roster.html` | Template (nav panel + views) |
| `client/app/roster/roster.css` | Styles |
| `client/app/roster/roster.js` | ui-router state `/roster` |
| `server/api/calendar/calendar.controller.js` | Roster HTTP handlers, AcroRoster API calls |
| `server/api/calendar/index.js` | Routes |
| `server/api/rosterDataStore/index.js` | Local data: Firebase **or** Postgres (`ROSTER_DATA_STORE`) |
| `server/api/rosterScheduleCell/` | Local schedule cells |
| `server/api/rosterEmployee/` | Local staff rows |
| `server/api/rosterCalendarRequest/` | Local calendar requests |
| `server/api/rosterStaffingMinimum/` | Staffing minimums |
| `server/api/rosterMonthMeta/` | Month lock state |
| `scripts/migrate-roster-to-postgres/index.js` | One-time Firebase → Postgres migration |

**Secrets:** `ROSTER_TOKEN` and Firebase credentials live in `local.env.js` / `server/firebase.json` — never commit. Server changes need `grunt babel:server` (+ process restart) when serving from `dist/server`.

## Data sources

| Data | **Live (AcroRoster)** | **Local** |
|------|------------------------|-----------|
| Schedule / duty codes | AcroRoster tenant API (`POST /api/calendar/rosterMonth`) | Postgres `RosterScheduleCells` (or Firebase `rosterschedules` if legacy mode) |
| Staff employees | Inferred from Acro events on the grid; Team CRUD is Local-only | Postgres `RosterEmployees` |
| Calendar requests | Read-only from Acro API | Postgres `RosterCalendarRequests` |
| Staffing minimums | N/A (Local Minimums view) | Postgres `RosterStaffingMinimums` |
| Month lock | N/A | Postgres `RosterMonthMetas` |
| **Pilots** | Firebase `pilots` (both modes) | Firebase `pilots` |

Toggle: `sessionStorage` key `rosterDataSource` → `acroroster` (default) or `local`.

**Production (Aug 2026):** `ROSTER_DATA_STORE: 'postgres'` in `local.env.js`. Live mode does **not** use Firebase for schedules — only `pilots`. Deleting Firebase `employees` and `rosterschedules` is safe once Postgres mode is verified.

## What we have

### Shell & layout
- Views: **Scheduling**, **Calendar**, **Team**, **Minimums** (left nav).
- **AcroRoster (live)** vs **Local** toggle.
- Month picker; navbar day changes within the same month do not reload the roster.
- Loading overlay during fetch / import.
- Use `roster-main` / `roster-navpanel` — not `<main>` (collides with FRA layout).

### Scheduling (grid)
- **Live:** month events from AcroRoster API; staff rows inferred from events.
- **Local:** editable cells; persisted via `rosterDataStore`; **Socket.io** pushes cell/bulk updates to other browsers.
- Duty-count summary rows (KA, C1, S1, 8, B1, OC, NM/ND, A, T) with red/orange/gray thresholds from **Minimums**.
- Multi-base sections: **OME**, **OTZ**, **UNK** (`{base}:{sectionId}` keys). OTZ has captains only.
- Nav label **All bases** — independent of navbar base filter.

### Imports (Local mode, superadmin)
- **Import month (all bases)** — AcroRoster → local schedule cells, staff upsert, calendar time-off requests.
- **Import staff (all bases)** — AcroRoster employee table → `RosterEmployees`.
- Cell save uses the **row’s** base, not the navbar.

### Team
- Pilots: read-only from Firebase `pilots`.
- Staff: CRUD in Local mode; grouped by base × job category.
- **Add employee** includes explicit **Base** picker (OME / OTZ / UNK).

### Minimums
- Superadmin edits per location, grouping, duty code; **Weekday** vs **Weekend** columns.
- Saved server-side (`rosterStaffingMinimums` API); shared for all users.
- Grid summary rows use these thresholds (defaults apply if nothing saved yet).

### Calendar
- Person picker (pilots + staff); month grid with duty badges and request markers.
- **Live:** read-only Acro person events.
- **Local:** schedule days + calendar requests; range select → request work/time off.
- Approve/deny (superadmin): work requests need a duty selected in the brush toolbar before approve.
- Pending local requests show dots; schedule duty codes take priority on the grid.
- Acro-imported work requests are filtered so they do not show as false pending overlays.

### Realtime (Local mode)
Socket.io events (other tabs/users see updates without refresh):

| Event | When |
|-------|------|
| `rosterScheduleCell:cell` / `:bulk` | Cell edit, import, clear |
| `rosterCalendarRequest:change` / `:bulk` | Request save, approve, import |
| `rosterEmployee:save` / `:remove` / `:bulk` | Team CRUD, staff import |

### Privileges

| Role | Roster access |
|------|----------------|
| `guest` | No access (route requires `user`) |
| `user` / `admin` | View schedule; calendar requests for **own name only**; no approve/lock/import; blocked when month locked |
| `superadmin` | All calendars; approve/deny; assign schedule; lock month; edit minimums; imports and staff CRUD |

Enforced server-side on save endpoints, not UI-only.

## Known gaps / feedback targets

These are intentional limits or areas where user feedback may drive next work:

- **Request approval polish** — pending vs approved display on the scheduling grid could be clearer.
- **AcroRoster event types** — non-shift types are inferred heuristically; odd tenant values may need tuning.
- **Live calendar** — read-only; creating requests requires Local mode.
- **Full AcroRoster parity** — announcements, Acro-side locks/approvals, etc. — out of scope.
- **Nav polish** — optional group headers by base in the Show tables stack.
- **Per-user privileges** — deferred (role matrix only today).

## Next steps (post user feedback)

1. Collect feedback from primary users on Scheduling, Calendar, Team, Minimums workflows.
2. Triage Issues in `/issues` (Developer approved → build queue).
3. Optional engineering follow-ups based on feedback:
   - Approval workflow polish on the grid
   - Tighten `inferAcrorosterRequestType` against real Acro samples
   - Nav panel group headers by base

## Quick commands

```bash
# Dev
grunt serve

# Prod static + server
grunt build
grunt babel:server
# restart fraBering process
```

Session context: agent transcript [Roster AcroRoster integration](90e1bb88-9c24-45f6-8378-7587d770362d).
