# Roster / AcroRoster integration — status (Aug 2026)

Paused mid-build. This is the handoff for `/roster` work that copies AcroRoster views into fraBering while keeping fraBering login.

**Goal:** Scheduling, Calendar, and Team views under `/roster`, with a **Live AcroRoster** vs **Local (Firebase)** data-source toggle. Privileges / per-user permissions are deferred.

## Key files

| Path | Role |
|------|------|
| `client/app/roster/roster.controller.js` | Main UI logic |
| `client/app/roster/roster.html` | Template (nav panel + schedule / calendar / team) |
| `client/app/roster/roster.css` | Styles (incl. loading overlay) |
| `client/app/roster/roster.js` | ui-router state `/roster` |
| `server/api/calendar/calendar.controller.js` | Roster month, local schedules, employees, calendar requests |
| `server/api/calendar/index.js` | Routes |

**Firestore / config:** do not commit secrets. `ROSTER_TOKEN` lives in `local.env.js`. Server changes need `grunt babel:server` (+ pm2 restart) when running from `dist/server`.

## What we have

### Shell & layout
- Three views: **Scheduling**, **Calendar**, **Team** (left nav panel).
- **Live vs Local** toggle (`sessionStorage`: `rosterDataSource`).
- Month picker (prev/next + month popup); navbar day changes within the same month do not reload.
- Loading overlay (`spinner` / `viewRefreshing` / import flags) in the main panel.
- Critical fix: do **not** use `<main>` or a class/name that collides with the FRA `main` component / `<sidebar>` directive — use `roster-main` / `roster-navpanel`.

### Scheduling (grid)
- Live: AcroRoster month events via `POST /api/calendar/rosterMonth`.
- Local: Firebase `rosterschedules` docs `{base}-{YYYY-MM}`; cell edit + save.
- Duty-count summary rows for captains/FOs (KA, C1, S1, 8, B1, OC, NM/ND).
- Section headers, spacers, weekend / duty-code styling; pilots sorted by hire date.
- Staff rows on the grid (live inferred from events; local from `employees` + schedule days).

### Multi-base “Show tables” (detached from navbar base)
- Bases: **OME**, **OTZ**, **UNK**.
- Section keys are `{base}:{sectionId}` (e.g. `OTZ:captains`, `UNK:csa-dispatch`).
- **OTZ has captains only** (no FO button — no FOs in Kotz).
- Staff categories duplicated per base (e.g. three CSA/Dispatch toggles).
- Nav panel label: **All bases**. Changing navbar base does **not** reload the roster.
- Person rows cached (`cachedPersonRows`) so toggling a previously hidden section still has data.
- Location mapping includes `KOTZ` / `KOTZEBUE` → OTZ.

### Imports (Local mode, all bases)
- **Import month (all bases)** → `rosterScheduleLocalImport` with `bases: ['OME','OTZ','UNK']`.
  - Writes per-base schedule docs.
  - Upserts staff inferred from events.
  - Imports non-shift / time-off-style events into `rostercalendar` (keeps `source: 'local'` requests).
- **Import staff (all bases)** → `rosterEmployeesImportFromAcroroster` with multi-base loop.
- Cell save uses the **row’s** `base` / `pilotBase`, not the navbar.

### Team
- Pilots read-only from Firebase `pilots`, grouped by base × Capt/FO visibility.
- Staff CRUD in Local mode; groups by base × job category.
- Nested `ng-repeat` for base × category (avoid `ng-if` + `ng-repeat` on the same element).

### Calendar
- Person picker (pilots + employees); month grid with markers.
- **Live:** read-only AcroRoster person events.
- **Local:** schedule days + `rostercalendar` requests; person base resolved from the person (not navbar).
- **Range select:** click start day, then end day; clear selection button.
- **Request work / time off** for the selected range:
  - Writes `rostercalendar` (`source: 'local'`, status `pending`).
  - Applies duty codes to `rosterschedules` (`8` work, `V` time off) when `rosterId` is known.
- Requests list shows title, day, status, source; Remove only for local requests (also clears schedule cells).
- Off codes on schedule (`V`, `RA`, etc.) classify as time-off markers / list entries.

### Firebase collections (Local)
| Collection | Purpose |
|------------|---------|
| `pilots` | Read-only pilot roster |
| `employees` | Staff (jobCategory, base, …) |
| `rosterschedules` | `{base}-{YYYY-MM}` day codes by `rosterId` |
| `rostercalendar` | `{base}-{YYYY-MM}-{personKey}` request arrays |

## Known gaps / quirks

- Minimum staffing thresholds on duty-count rows — not started.
- Calendar privileges / “only my calendar” — not started (any authenticated user can edit Local).
- Add-employee / some imports historically tied to navbar base; schedule import is multi-base, but **new employee form** may still need an explicit base picker.
- AcroRoster event `type` values for pure “request” (non-shift) are inferred heuristically; odd tenant types may need tuning.
- Live calendar is read-only by design; creating requests requires Local.
- Full AcroRoster parity (announcements, locks, approvals workflow, etc.) — out of scope for this slice.

## Intended next steps (priority order)

1. **Smoke-test calendar range + import** after server restart  
   - Local → Import month (all bases) → Calendar: confirm imported time-off/requests show.  
   - Select a range → Request time off / work → confirm markers, request list, and Scheduling grid codes update.

2. **Explicit base on Team “Add employee”**  
   - Detach create/edit from navbar; pick OME / OTZ / UNK on the form.

3. **Minimum staffing thresholds**  
   - Highlight duty-count summary cells when below configured mins (per base / role / code).

4. **Calendar privileges**  
   - Limit who can request / edit whose calendar (start with “own person only” + admin override).

5. **Request approval workflow (optional)**  
   - Pending vs approved; only approved codes on the live scheduling grid, or a separate “requests” layer.

6. **Polish**  
   - Scrollable Show-tables stack if the button list is too long.  
   - Optional group headers by base in the nav panel.  
   - Confirm AcroRoster non-shift event types against a real month sample and tighten `inferAcrorosterRequestType`.

7. **Deploy checklist**  
   - Client: hard-refresh `/roster` (or `grunt build` for prod static).  
   - Server: `grunt babel:server` + restart if serving `dist/server`.  
   - Ensure `ROSTER_TOKEN` and Firebase credentials are present on the target host.

## Quick resume commands

```bash
# Dev (typical)
grunt serve

# If pm2 serves dist/server
grunt babel:server
# then restart the fraBering process
```

Session context: agent transcript [Roster AcroRoster integration](90e1bb88-9c24-45f6-8378-7587d770362d).
