# Legacy development — read before changing behavior

fraBering is a **live flight-operations** app on a **frozen-era stack** (AngularJS 1.x, Grunt, Bower, Express 4, Sequelize 6, Node 12). It is not a greenfield project. Treat it like avionics: **if it works, do not rip it out** because a blog post says to use something newer.

## Rules (non-negotiable for agents and contributors)

1. **Fix only what was requested.** Adding a field, column, or label does **not** authorize rewriting the server query, switching endpoints, or “cleaning up” old syntax.

2. **Reuse existing data paths.** Before adding a new API call or Sequelize `where` clause, search the repo for how the **same data** is already loaded. Use that path. Different filters on different columns (`date` vs `dateObject`, Firebase vs Postgres, etc.) are a common source of “everything broke but we only changed the UI.”

3. **Do not modernize in passing.** Avoid replacing legacy Sequelize operators, refactoring controllers to new patterns, swapping build tools, or bumping dependencies unless the user explicitly approves. Modern Sequelize/Angular/Node patterns **often do not behave the same** here.

4. **When debugging, suspect the diff—not the decade-old code.** If behavior regressed during a small change, revert incidental edits first (especially server SQL and shared services), then fix forward with minimal scope.

5. **Production wins over elegance.** A duplicated loop that calls `dayFlights` per day is acceptable if that is what the rest of the app uses and ops trusts it.

## Example: audit flight lists

- **Works:** `POST /api/todaysFlights/dayFlights` with `dateString` (locale date string), same as status/audit `setFlights`.
- **Often empty / misleading:** `POST /api/todaysFlights/flightRange` filtering `dateObject` — many rows never get `dateObject` populated; this is not a safe default for audit CSVs unless you have verified data and queries end-to-end.

TSA / Flight Release audit CSVs should load flights via the **dayFlights** pattern across the selected date range, not by “improving” server range queries without ops sign-off.

## Status board — flight leg colors (future work)

- **Jul 2026:** `refreshFlightAirportColors()` was fixed to always base leg METAR on `masterAirports[].metarObj` instead of reusing stale `flight.airportObjs` copies (internet + manual obs cycling after base-closure / `runScroll` updates).
- **Still open:** `filterTodaysFlights()` mutates `flight.airportObjs[listIndex].color` with `+= " night "` whenever `isItNight` is true, on every filter pass, without rebuilding color from master METAR. If night styling or flight-color mismatch resurfaces, align night handling with `refreshFlightAirportColors()` (set `metarObj.night` and suffix once from a fresh `overallRiskClass` / cached color).

## Performance — status board / dayFlights (Aug 2026)

Sequelize pool timeouts, sluggish `/status`, and public-board load were investigated on prod. Fixes include public + authenticated `dayFlights` column whitelists, **45s in-memory cache** on `public/dayFlights`, `TodaysFlights.date` index, and deduped `firebaseGrab`. Details and benchmarks: **`docs/performance-status-board-2026-08.md`**.

## Where else this is documented

- `docs/performance-status-board-2026-08.md` — dayFlights pool exhaustion, benchmarks, deploy checklist
- `.cursor/rules/safe-changes.mdc` — always-on agent guardrails
- `AGENTS.md` — agent entry point
- `.cursor/rules/project-overview.mdc` — stack and layout
