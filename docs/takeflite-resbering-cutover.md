# Takeflite → resBering cutover (fraBering)

**Target:** Tue **Oct 7, 2026** ops morning (technical flip **Mon Oct 6** evening). resBering becomes the source for schedule/manifest data that fraBering today pulls from `api.tflite.com`.

**resBering spec:** `resBering/docs/issues-161-cutover-integrations.md` (slices 1–3 shipped).

## Agreed plan (Sep 2026)

fraBering **does not receive Takeflite webhooks** today and **should not** get a new CloudEvent/webhook inbound at cutover. Status board stays a **~1 min REST poll**.

| Piece | Plan |
|-------|------|
| **Webhooks** | One Takeflite subscription → **resBering** `POST /api/webhooks` (Postgres ingest). Firebase mirror is for **Ryan/Jenae**, not FRA. Do **not** duplicate TF subscriptions or POST TF-shaped events into fraBering. |
| **FRA API (preferred)** | **One** call: `GET /api/integrations/v1/flights/status-export` (crew, route, scheduled times, `actualDepart` / `actualArrive`). Map that into `tf()` / flight-log fields. |
| **FRA API (compat shim, current code)** | status-export **plus** per-flight `manifest?format=takeflite` so `tf()` can keep the old Takeflite object. **1 + N HTTP** — fine as a flip safety net, **not** the long-term minute loop. |
| **Same host** | Prefer `RESBERING_API_BASE_URL=http://127.0.0.1:<resBering-port>` so FRA does not go out through nginx. Optional later: localhost **push** from resBering into FRA if poll lag/load is a problem — not needed for Oct 7. |
| **If legs still required** | Add **one** bulk manifest route on resBering (`dateFrom`/`dateTo` + `format=takeflite`) instead of N singles. Do not keep N+1. |

Cutover-week work: swap the shim for **status-export-only** (or one bulk call). Leave `TAKEFLITE_DATA_SOURCE` as the flip.

## What fraBering uses today (Takeflite)

| Legacy | Role |
|--------|------|
| `POST` OAuth `api.tflite.com/authentication/oauth/token` | `TF_ID` / `TF_SECRET` → bearer |
| `GET …/manifests?departureDate.gte&lte` | `getManifests()` → FRA `tf()` status board sync (~1 min) |
| `GET …/flightlogs?departureDate…` | `getFlightLogs()` → wheels off/on, standby leg times |
| `GET …/manifests/{date}/{flightNumber}/…` | `getManifest()` (debug / tools) |

Takeflite **webhooks** are ingested by **resBering**, not fraBering. At cutover, fraBering stops calling Takeflite REST; resBering Postgres + that single webhook ingest stay authoritative.

## Flip switch (`local.env.js`)

```js
TAKEFLITE_DATA_SOURCE: 'resbering',   // default 'takeflite' until cutover
RESBERING_API_BASE_URL: 'http://127.0.0.1:8081',  // same-host; else RESERVATIONS_API_BASE_URL
RESBERING_INTEGRATION_TOKEN: '<same as resBering RESBERING_INTEGRATION_TOKEN>',
```

Restart PM2 after changing env (`grunt babel:server` if you deploy compiled `dist/`).

**Code:** `server/config/takefliteSource.js`, `server/api/todaysFlight/takeflite.resbering.js` (**compat shim**), branches in `todaysFlight.controller.js` (`setBearer`, `getManifests`, `getFlightLogs`, `getManifest`).

## resBering routes

| fraBering need | Preferred | Current shim |
|----------------|-----------|--------------|
| Status board list + times | `GET …/flights/status-export?dateFrom=&dateTo=` **only** | Same, then N× `GET …/manifest?format=takeflite` |
| Single manifest (debug `getManifest`) | `GET …/flights/manifest?…&format=takeflite` | Same |
| Flight logs / wheels | Fields on status-export (`actualDepart` / `actualArrive`) | Rebuild logs from N manifests |

Auth: `Authorization: Bearer <RESBERING_INTEGRATION_TOKEN>`.

## Dev soak (`TAKEFLITE_DATA_SOURCE=resbering`)

Leave dev on resBering for a few days before prod flip. Watch `/status` and server logs each `tf()` cycle (~1 min).

**Match / duplicate behavior (Sep 2026 fix):** `tf()` matches manifest flights to existing `TodaysFlight` rows across recent DB history (not only today/tomorrow), so the same flight # + date should not be **created** every interval. Manifest fetch still covers ~**yesterday through today+2**.

**Log noise after a bad soak is normal:**

| Log | Meaning |
|-----|--------|
| `creating flight:NNN M/D/YYYY` | New row — should **not** repeat every minute for the same # + date once matching works. |
| `More than one Flight matching NNN` | Two+ DB rows for that # + date (often from an earlier duplicate-create bug). |
| `destroyed duplicate flight …` | Extra row had no pilot agree / OC / dispatch release — removed (intended). |
| `Deletion Reprieve for flight …` | Duplicate row **has** a release — **not** deleted; message may repeat each minute until that date leaves the manifest window or you merge/delete rows manually. |

Optional cleanup: for a noisy date (e.g. yesterday still in the window), dedupe in DB — keep the `_id` with real release/PFR data, remove stray duplicates without releases.

**Regression checks:** no back-to-back `creating flight` for the same # + date; today’s board crew/route/times look right vs reservations.

## Cutover checklist (fraBering)

1. Confirm resBering prod has integration token set and slices 1–3 deployed.
2. Parallel run (optional): set `TAKEFLITE_DATA_SOURCE=resbering` on **dev** first; compare status board vs Takeflite for a day.
3. **Before prod flip (preferred):** map `status-export` into `tf()` so the minute job is **one** HTTP call; point `RESBERING_API_BASE_URL` at localhost.
4. **Mon Oct 6 evening:** set `TAKEFLITE_DATA_SOURCE=resbering` on prod `local.env.js`, restart fraBering.
5. Watch logs: `Takeflite data source: resBering`, `tf()` duration. If still on the shim, duration will be worse than Takeflite.
6. Leave `TF_ID` / `TF_SECRET` in place until Takeflite is fully retired.

## CSV flight summary (`flight.controller.js` `tf`)

The **uploaded Takeflite Flight Summary CSV** (`fileserver/current.csv`) is separate from API manifests. Not part of this flip unless ops replaces that workflow later.

## Related

- resBering: `docs/issues-161-cutover-integrations.md`, `docs/beta-outcomes-and-cutover.md`
- FDR hours: Firebase only — not affected by this flip
