# Roster local data — Postgres deploy guide

Local roster data (schedules, staff, calendar requests, minimums, month lock) is stored in the **metar Postgres database** when `ROSTER_DATA_STORE` is `postgres`. **Pilots stay in Firebase** (`pilots` collection) for both Live and Local modes.

Feature overview: **`docs/roster-acro-status.md`**.

## Configuration

In `server/config/local.env.js`:

```js
ROSTER_DATA_STORE: 'postgres',  // production
ROSTER_TOKEN: 'Bearer …',       // AcroRoster API (Live mode + imports)
```

Accepted values: `postgres`, `pg`, or `sql`. Default in `local.env.sample.js` is `firebase` (legacy fallback for dev laptops without migrated tables).

**Live AcroRoster mode** does not read local schedule collections — it calls the AcroRoster API. Postgres/Firebase local stores only affect **Local** mode.

## Postgres tables

Created by Sequelize `sync()` on server start (models under `server/api/roster*/`):

| Table | Purpose |
|-------|---------|
| `RosterScheduleCells` | Duty code per base / month / `rosterId` / day |
| `RosterEmployees` | Staff rows (`_id` = legacy Firebase doc id for `employee:{id}` refs) |
| `RosterCalendarRequests` | Calendar work/time-off requests |
| `RosterStaffingMinimums` | One row per section × base × duty code × weekday/weekend |
| `RosterMonthMetas` | Per-month lock (`YYYY-MM`) |

## One-time migration from Firebase

Run from repo root **before** deleting Firebase roster collections. Requires `server/firebase.json`, Sequelize env (`development.js` or `--production`), and DB connectivity.

```bash
# All phases
node -r babel-register scripts/migrate-roster-to-postgres/index.js

# Or one at a time
node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=minimums
node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=monthMeta
node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=schedules
node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=calendarRequests
node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=employees

# Against production DB (uses production.js + SEQUELIZE_URI from local.env.js)
node -r babel-register scripts/migrate-roster-to-postgres/index.js --production
```

Phases map Firebase collections → Postgres:

| Phase | Firebase collection | Postgres |
|-------|---------------------|----------|
| `minimums` | `rosterconfig` / `staffingMinimums` | `RosterStaffingMinimums` |
| `monthMeta` | `rostermonthmeta` | `RosterMonthMetas` |
| `schedules` | `rosterschedules` | `RosterScheduleCells` |
| `calendarRequests` | `rostercalendar` | `RosterCalendarRequests` |
| `employees` | `employees` | `RosterEmployees` |

Employee migration preserves Firebase document IDs as `_id` so existing `employee:{id}` schedule references keep working.

## Deploy checklist

### Before go-live

1. Run migration phases against production DB (or confirm already done).
2. Set `ROSTER_DATA_STORE: 'postgres'` in production `local.env.js`.
3. Confirm `ROSTER_TOKEN` and `server/firebase.json` are on the host (`pilots` still required).

### Build & restart

```bash
grunt build          # client static → dist/
grunt babel:server   # server → dist/server
# restart fraBering (pm2 or your process manager)
```

### Smoke test (two browsers, Local mode)

1. **Scheduling** — grid loads duty codes for OME/OTZ/UNK; edit a cell in browser A → browser B updates via socket.
2. **Import month (all bases)** — superadmin; grid and staff populate.
3. **Team** — staff list; add/edit/delete employee; other session refreshes.
4. **Calendar** — pick a person; schedule markers and requests; range request work/time off.
5. **Minimums** — superadmin save; grid summary thresholds reflect saved values.
6. **Month lock** — non-superadmin blocked from writes when locked.
7. **Live mode** — switch to AcroRoster (live); month loads from API (no Postgres schedule read).

### After verification

Safe to **delete** from Firebase (postgres mode only):

- `employees`
- `rosterschedules`

Optional cleanup once minimums, lock, and calendar are verified:

- `rostercalendar`
- `rosterconfig`
- `rostermonthmeta`

**Keep:** `pilots` (and all non-roster Firebase collections).

**Rollback:** set `ROSTER_DATA_STORE: 'firebase'` only works if Firebase collections still exist or are restored from backup.

## Architecture notes

- All Local roster HTTP handlers in `calendar.controller.js` delegate to **`rosterDataStore`**, which switches Firebase vs Postgres.
- **Socket.io** broadcasts changes from postgres stores (`*.events.js` per module).
- `ensureRosterEmployeeSchema()` patches `RosterEmployees` if the table predates a model revision (runs on employee load and in the migration script).
- AcroRoster **import** paths (`fetchAcrorosterTable`) hit the **external Acro API**, not Firebase `employees`.

## Dev laptop without Postgres roster tables

Leave `ROSTER_DATA_STORE: 'firebase'` (or unset) and use Firebase collections locally, **or** point at a dev Postgres DB and run the migration script with `--local` / development env.

Do not mix modes against the same environment without understanding which store is active.
