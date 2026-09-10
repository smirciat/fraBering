# Day Planner — `/status` alternate view (Sep 2026)

Gantt-style day schedule for fixed-wing ops. **Not** a replacement for the primary Status Board — an alternate layout under **View → Day Planner** in the navbar.

## Access

- Navbar **View → Day Planner** (`nav.setView(5)` → `status.view === 'planner'`). From other routes (e.g. **Bugs**), `setView` saves the view and `$state.go('status')`; status applies the saved view on load (`syncStatusViewFromNav`).
- Fixed-wing bases only (OME / OTZ / UNK). HEL shows a short note.
- Same auth as `/status` (`Auth.isUser()`)
- Clicking a bar opens the same flight modal as the main board (`lookAtFlight()` → `Modal.confirm.flight`)

## Layout

| Axis | Content |
|------|---------|
| **Rows** | PIC (pilot in command), not aircraft — tail swaps stay on the same row |
| **Columns** | 30-minute slots from **0700–2100** Alaska time |
| **Bars** | Flight number, tail, full routing (3-letter codes); color from flight risk / charter |

Row labels use roster **First Last** when available (`plannerPilotName()`), assigned **FO** name directly below the captain (left-border link styling), plus the pilot’s **first aircraft** of the day. Tail numbers are **not** repeated on every bar — only on the first bar after an aircraft swap mid-day (`annotatePlannerRowAircraft`).

Flight bars share **grid row 1** with the time-slot cells (`grid-row: 1` on label, slots, and bars) so bars do not wrap to a second grid row (which previously doubled row height).

## Data source

Reuses the existing status stack — no new API:

- `todaysFlights` / `allTodaysFlights` from `POST /api/todaysFlights/dayFlights`
- Socket.io `todaysFlight` sync
- Same base filter as the main board (Nome / Kotzebue / Unalakleet)
- `buildPlannerRows()` runs on: view switch to planner, base/date/filter changes, aircraft list, socket updates, after `resetFlights()` loads day data, and after `setPilotList()` completes (base roster is async — planner must not rebuild on stale `sortedPilots`)

## Pilot rows (who appears)

**Shown:**

- Roster captains with flying duty codes: `8`, `KA`, `B1`, `B2`, `C1`, `C2`, `S1`, `S2`, `IOE`, `OTZ`, `T`
- **`A`** (available) duty
- Any captain who is PIC on a visible flight today, even if duty would otherwise hide them

**Hidden:**

- Duty-only rows (no flights at this base) when roster `pilotBase` does not match the selected base — pilots **with flights** at the base always show (e.g. OME captain flying through OTZ)
- OC, NM, ND, D, DM, F, CS, `16`
- Headers: OC, Dispatch, Fueler, Cargo Lead, Medevac, Unassigned Copilots
- Copilots (`!pilot.far299Exp`)

## Flight bars (what appears)

`plannerFlightVisible()` enforces its own rules (does not rely on `todaysFlightDisplayFilter` alone — that filter skips the `active` check when an aircraft filter is selected):

| Check | Rule |
|-------|------|
| Active | `active === 'true'` |
| Aircraft | N-prefix fixed-wing |
| Date | Today's `dateString` (or assessment date) |
| Base | Same airport logic as main board (`plannerFlightInBase`) |
| Hide past | When `window.toggle` is on, same as main board |
| Suppressed | `plannerFlightSuppressed()` — see below |

### Suppressed / cancelled flights

`plannerFlightSuppressed()` hides flights that are:

- `active === 'false'` or `inactive`
- Missing `flightId` (dropped from Takeflite manifest but row still in DB)
- `flightStatus` contains: cancel, cxld, no show, noshow, no-go, nogo, no go, not oper, abort
- `operation` contains: cancel

### Overlap dedupe (same pilot row)

When two bars overlap in time on one pilot row, `dedupePlannerBars()` keeps one:

1. Non-suppressed over suppressed
2. Has `flightId` over missing
3. Later departure time
4. Higher numeric flight number (e.g. keep 594 over 590)

This addresses stacked bars when Takeflite still has a stale pairing (e.g. BRG590 + BRG594 on the same captain).

## Files changed

| File | Role |
|------|------|
| `client/components/navbar/navbar.controller.js` | `views[]` includes `"planner"`; `setView` bound to `views.length` |
| `client/components/navbar/navbar.html` | View menu item **Day Planner** |
| `client/app/status/status.controller.js` | Planner model: slots, rows, filters, dedupe, `buildPlannerRows()` |
| `client/app/status/status.html` | `<section class="day-planner">` grid |
| `client/app/status/status.css` | Sticky header/labels, bar styles, scroll container |

Primary board section (`status.view === 'board'`) is unchanged.

## Key controller methods

- `buildPlannerSlots()` — 0700–2100 in 30-min steps
- `plannerTimeToMinutes` / `plannerSlotIndex` — bar column span
- `plannerPilotKey` / `plannerPilotName` / `plannerLookupPilot`
- `plannerPilotAllowed` / `plannerHasFlightDuty`
- `plannerFlightVisible` / `plannerFlightSuppressed` / `plannerFlightInBase`
- `plannerBarForFlight` / `dedupePlannerBars` / `buildPlannerRows`
- `plannerHeading` — weekday + date title
- `plannerBarClass` — uses `colorLock||color` (same as main board flight chip); calls `ensureFlightColorLock` before resolving class

## Implementation notes

- **Babel 6 class quirk:** `buildPlannerSlots()` must not run in the constructor. `plannerSlots = []` in constructor; `this.plannerSlots = this.buildPlannerSlots()` in `$onInit()`.
- **Known client bug (not fixed in this work):** `filterTodaysFlights` line ~542 uses `flight.active==='false'` (comparison) instead of assignment when `!flight.flightId`. Planner works around this via `plannerFlightSuppressed()`.

## Deploy

1. **`stopped169`** in both places (same number):
   - `client/components/navbar/navbar.controller.js` — `stoppedFunction()` → `let version='169'`
   - `server/api/todaysFlight/index.js` → `router.post('/stopped169', ...)`
2. `grunt build`
3. `pm2 restart fraBering`

See `docs/stopped-version-deploy.md` — do **not** remove 404 → `location.reload()` in `stoppedFunction()`.

## Smoke test (OTZ fixed-wing)

1. **View → Day Planner** — grid loads with pilot names and time header
2. No OC / dispatch / copilot-only rows
3. Cancelled or stale pairings (e.g. BRG590) not stacked on live flight (BRG594)
4. Click bar → same flight release modal as main board
5. Refresh page on planner view — rows rebuild after `dayFlights` returns
6. Old tabs reload after deploy (`stopped169` bump)

## Related

- `docs/performance-status-board-2026-08.md` — `/status` and `dayFlights` performance
- `docs/stopped-version-deploy.md` — deploy reload mechanism
