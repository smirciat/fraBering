# Performance investigation — `/status` and `dayFlights` (Aug 2026)

Ops report: fraBering pm2 process showed Sequelize errors, `/status` flights briefly appeared then disappeared, and the app felt sluggish. Investigation and fixes were done on the **production host** (`fraBering` pm2 id 0, port **58779**, DB **`metar`** on local Postgres). Continue tuning on **bering-dev** using this doc.

## Symptoms observed

| Symptom | Likely cause |
|--------|----------------|
| `SequelizeConnectionAcquireTimeoutError: Operation timeout` in pm2 error log | All 5 Sequelize pool connections stuck on slow `TodaysFlights` queries; new requests could not acquire a connection |
| `/status` flights flash then vanish | Client race: `renewFirebase()` re-filtered before `dayFlights` finished; overlapping `dayFlights` responses; server overload/timeouts |
| General sluggishness | Node heap ~98% (~1.5 GB), heavy GC; many concurrent `public/dayFlights` polls; background METAR job running 35–85s |

## Architecture notes (why this hurts)

- **Single Node process** (pm2 fork, `--max-old-space-size=4096`) serves API + static client from repo root `client/`.
- **pm2 runs `dist/server`** — server source changes require **`grunt babel:server`** (or equivalent) into `dist/server` before restart. Client JS is served from `client/` without a full prod build.
- **Sequelize default pool `max: 5`** — no custom `pool` in `server/sqldb/index.js`.
- **`TodaysFlights`** table: ~36k rows, ~1 GB total; ~73 rows per ops day (`8/3/2026`); fat JSONB columns (`pfr`, `airportObjs`, `loadsObject`, etc.).
- **Authenticated** `POST /api/todaysFlights/dayFlights` returns **all columns** for the day (~3.5 MB+ JSON on wire; much larger in Node while hydrating).
- **Public** `POST /api/todaysFlights/public/dayFlights` whitelists response fields in `toPublicFlightRow()` but historically still ran `SELECT *` before mapping.

## Root causes (ranked)

1. **Pool exhaustion** — five connections blocked on full-row `TodaysFlights` reads; Postgres showed `ClientWrite` wait (Node too slow to consume rows while heap was full).
2. **Public departures polling** — `client/app/public/public.controller.js` polls `public/dayFlights` every **60s** per tab. On a busy host we measured **~21 requests / 30s** (~42/min), i.e. many open `/public` boards or overlapping slow requests.
3. **No index on `date`** — day queries used sequential scan over 36k rows (~29ms DB time alone; worse under load).
4. **Duplicate `firebaseGrab` on `/status` load** — navbar and status both called `POST /api/airplanes/firebaseGrab` (~944 KB each).
5. **Client race on status** — initial `renewFirebase()` could run `filterTodaysFlights(undefined)` before `dayFlights` returned.
6. **Background jobs compete with user traffic** (`server/app.js`):
   - `callbackFunction` (Takeflite `tf()` + `getFlightLogs`) — **every 1 min**, ~7–8s
   - `metarFunction` — **every 3 min**, observed **35–85s**
   - `tafFunction` — every 5 min
   - `firebaseFunction` — hourly

## Fixes applied (Aug 3, 2026)

### 1. Slim public `dayFlights` query (server)

**File:** `server/api/todaysFlight/todaysFlight.controller.js`

- Added `PUBLIC_DAY_FLIGHT_ATTRS` (12 columns used by `toPublicFlightRow`).
- `dayFlightsPublic` `findAll` now passes `attributes: PUBLIC_DAY_FLIGHT_ATTRS`.

**Also patched:** `dist/server/api/todaysFlight/todaysFlight.controller.js` on the host (grunt was not available; run `grunt babel:server` on bering-dev for a clean build).

**Before/after (single request, idle server):**

| Metric | Before | After |
|--------|--------|-------|
| `public/dayFlights` latency | ~0.56s | **~0.04s** |
| Response size | ~25 KB | ~25 KB (unchanged) |
| DB execution (subset of columns + index) | ~29ms seq scan | **~0.5ms** index scan |

### 2. Index on `TodaysFlights.date` (database)

```sql
CREATE INDEX IF NOT EXISTS TodaysFlights_date_idx ON public."TodaysFlights" (date);
```

Verify on bering-dev:

```sql
\d "TodaysFlights"   -- should list todaysflights_date_idx
EXPLAIN ANALYZE SELECT "date", "active", "flightNum"
  FROM "TodaysFlights" WHERE date = '8/3/2026';
-- expect: Bitmap Index Scan on todaysflights_date_idx
```

**Note:** `date` is a **locale string** (`8/3/2026`), not ISO. Server resolves dates via `new Date(req.body.dateString).toLocaleDateString()` in `dayFlights` / `dayFlightsPublic`. ISO strings like `2026-08-03` can shift a day in Alaska (UTC parse → previous local day).

### 3. Dedupe `firebaseGrab` on `/status` init (client)

**Files:**

- `client/components/navbar/navbar.controller.js` — stores `window.firebaseGrabData`, calls `window.applyFirebaseGrabData(res.data)` when grab completes.
- `client/app/status/status.controller.js` — `initFirebaseData()` registers `applyFirebaseGrabData` and uses cached data; removed initial `renewFirebase()` on load. Hourly `scrollInterval` still calls `renewFirebase()`.

### 4. Earlier client fixes (same session, still on branch)

**File:** `client/app/status/status.controller.js`

- Removed debug `$onInit` HTTP spam (`getManifests`, `getFlightLogs`, `futureCharters/grab`, etc.).
- `renewFirebase` only re-filters when `allTodaysFlights` is loaded.
- `filterTodaysFlights` returns `[]` instead of `undefined` when array missing; pilot filter guarded when `this.user` not ready.
- `resetFlights` ignores stale `dayFlights` responses via `flightsRequestId` counter; `.catch` clears spinner.

### 5. Slim authenticated `dayFlights` (server)

**File:** `server/api/todaysFlight/todaysFlight.controller.js`

- `AUTH_DAY_FLIGHT_ATTRS` — column whitelist for `POST /api/todaysFlights/dayFlights` (status, loads, audit).
- Omits unused/heavy columns: `json`, `flightLegs`, `miscObject`, `dateObject`, `dateForPG`, `daysOfWeek`, `base`, `mitigation`, `nonRevFlight`.
- Still loads `pfr`, `airportObjs`, `airportObjsLocked`, `loadsObject`, release signatures, fuel fields.

### 6. Short TTL cache for `public/dayFlights` (server)

**File:** `server/api/todaysFlight/todaysFlight.controller.js`

- In-memory cache keyed by locale `date`, **45s TTL**, stores post-`toPublicFlightRow` JSON.
- Cuts repeated DB reads when many `/public` tabs poll every 60s.

## How to reproduce / monitor on bering-dev

### pm2 / logs

```sh
pm2 logs fraBering --lines 100
# Sequelize pool timeout:
grep -i SequelizeConnectionAcquire /home/andy/.pm2/logs/fraBering-error.log | tail

# Background job duration:
grep -E 'Metar Function|TF Function' /home/andy/.pm2/logs/fraBering-out.log | tail -20
```

### Request rate (30s sample)

```sh
before=$(wc -l < /home/andy/.pm2/logs/fraBering-out.log)
sleep 30
after=$(wc -l < /home/andy/.pm2/logs/fraBering-out.log)
tail -n $((after-before)) /home/andy/.pm2/logs/fraBering-out.log \
  | grep -oE '(GET|POST|PATCH) [^ ]+' | sort | uniq -c | sort -rn
```

Watch for high counts of `POST /api/todaysFlights/public/dayFlights`.

### Endpoint benchmarks

```sh
# Public board (no auth)
curl -s -o /dev/null -w 'public/dayFlights: %{time_total}s %{size_download}b\n' \
  -X POST http://127.0.0.1:58779/api/todaysFlights/public/dayFlights \
  -H 'Content-Type: application/json' \
  -d '{"dateString":"8/3/2026"}'

# Ops board (needs JWT cookie/token)
curl -s -o /dev/null -w 'dayFlights: %{time_total}s %{size_download}b\n' \
  -X POST http://127.0.0.1:58779/api/todaysFlights/dayFlights \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"dateString":"8/3/2026"}'
```

### Postgres

```sh
psql -d metar -c \
  "SELECT state, count(*) FROM pg_stat_activity WHERE datname='metar' GROUP BY state;"

psql -d metar -c \
  "SELECT pid, now()-query_start AS dur, wait_event, left(query,80) \
   FROM pg_stat_activity WHERE datname='metar' AND state='active';"
```

Stuck pool symptoms: several active `SELECT` on `TodaysFlights` with `wait_event = ClientWrite`.

### Heap

```sh
pm2 show fraBering | grep -E 'Heap|Used Heap|uptime'
```

Sustained **>90%** heap after a few minutes suggests GC pressure; check concurrent load and large responses.

## `/status` data flow (for further debugging)

1. Navbar sets `window.dateString`, `window.base`; polls `stopped{N}` every 60s (deploy version — see `docs/stopped-version-deploy.md`).
2. Status `$watch('nav.dateString')` → `resetFlights()` → `POST /api/todaysFlights/dayFlights` (auth, **slim column list**).
3. Template: `todaysFlights | filter:todaysFlightDisplayFilter` — uses `window.dateString`, `window.base`, `window.toggle`, `flight.active === 'true'`, aircraft prefix `N`, base airport names (`Nome`, `Kotzebue`, `Unalakleet`).
4. Socket `todaysFlight:save` updates `allTodaysFlights`; re-filter on `runScroll` or `created` (skips `colorPatch === 'true'`).

If flights disappear after refresh, check: **My flights filter** (`nav.isFilter` for role `user`), **base** (HEL hides fixed-wing column), **failed `dayFlights`** (401 jwt malformed in logs), or **stale overlapping requests**.

## Remaining work (good bering-dev follow-ups)

| Item | Impact | Notes |
|------|--------|--------|
| ~~**Slim authenticated `dayFlights`**~~ | High for `/status` | **Done (Aug 2026):** `AUTH_DAY_FLIGHT_ATTRS` in `todaysFlight.controller.js` — omits `json`, `flightLegs`, `miscObject`, `dateObject`, `dateForPG`, `daysOfWeek`, `base`, `mitigation`, `nonRevFlight`. Keeps `pfr`, `airportObjs`, `loadsObject`, release fields. |
| ~~**Server-side cache for `public/dayFlights`**~~ | High under many `/public` tabs | **Done (Aug 2026):** in-memory cache, **45s TTL**, keyed by locale `date` string; returns mapped `toPublicFlightRow` payload. |
| **Increase Sequelize `pool.max`** | Medium | Only after slimming queries; `server/sqldb/index.js` + env-specific config. |
| **METAR background job duration** | High | `metarFunction` observed 35–85s; blocks single-threaded Node (`server/app.js` — protected; needs approval). |
| **`grunt babel:server` on deploy** | Ops hygiene | Ensure `dist/server` matches `server/`; do not rely on manual dist patches. |
| **Public poll interval** | Medium | 60s × many displays; consider 90–120s or ETag/cache headers. |

## Related code paths

| Path | Role |
|------|------|
| `server/api/todaysFlight/todaysFlight.controller.js` | `dayFlights`, `dayFlightsPublic`, `toPublicFlightRow`, `tf()` |
| `server/api/todaysFlight/index.js` | Routes; public route is unauthenticated |
| `server/sqldb/index.js` | Sequelize init (no pool config today) |
| `server/app.js` | Scheduled METAR/TAF/Takeflite intervals |
| `client/app/status/status.controller.js` | Ops board flight load/filter/socket |
| `client/app/public/public.controller.js` | Public board 60s poll |
| `client/components/navbar/navbar.controller.js` | `firebaseGrab`, `stopped{N}` poll (deploy reload) |

## Deploy checklist (bering-dev → prod)

1. Merge client + server source changes.
2. `grunt babel:server` (or full `grunt build` for prod layout).
3. Apply DB index on production Postgres if not already present (see SQL above; safe, non-blocking `IF NOT EXISTS`).
4. `pm2 restart fraBering`.
5. Hard-refresh browsers on `/status` and `/public`.
6. Re-run benchmarks and 30s request-rate sample; confirm heap stays below ~80% under normal load.

## Session log (prod host, Aug 3 2026)

- Restart cleared pool exhaustion; memory dropped 2.3 GB → ~600 MB temporarily, then climbed back under load.
- Removed status `$onInit` debug calls that were hitting `getManifests` / `getFlightLogs` on every page load.
- After three small fixes + restart: `public/dayFlights` ~0.04s; index scan ~0.5ms; pm2 restart #7.

---

See also: `docs/legacy-development.md` (data-path conventions — always use `dayFlights` + locale `dateString`, not ad-hoc `dateObject` filters without verification).
