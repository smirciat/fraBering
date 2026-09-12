# Flight & Duty Records (FDR) — plan (#35)

Spreadsheet-like **Flight & Duty** view next to Training Records. Kaleb stops maintaining `Flight&DutyRecordReport.xls` as the working copy. The browser view looks like the year-tab workbook; **hours auto-fill from Firebase flights**; **days off stay manual** (paper F&D / pay sheet is the source of truth).

Confirmed with Andy 2026-09-11 against `uploads/Flight&DutyRecordReport.xls`.

## Implementation status (2026-09 — pre–Phase 4 soak)

Shipped in app code (deploy: `grunt babel:server`, `grunt build`, `pm2 restart fraBering`; `sequelize.sync` creates new tables on restart).

| Area | Behavior |
|------|----------|
| **Import + static years** | Workbook import → `FdrPilot`, `FdrImportHour`, `FdrDaysOff`, `FdrHourNote`; years ≤2024 read-only snapshot |
| **Computed hours (2025+)** | Aggregated from Firestore per employee (`server/api/rot/rot.fdr.hours.js`); **not** on every page load |
| **Postgres cache** | `FdrComputedHour` — monthly hours per pilot/year with `syncedAt` / `syncedBy` |
| **On-demand sync** | Toolbar: all pilots, base (OME / OTZ / Rotorwing), or one pilot; batched `POST /api/rot/fdr/:year/compute-hours` (1 pilot per request) |
| **Sync visibility** | Green ● = saved in DB; blue ● = synced this browser session (`sessionStorage`); filter + summary line |
| **Duty limits** | `rot.fdr.limits.js` — ≤500h/quarter, ≤1400h/year, ≥13 days off/quarter (when auditable), ≤800h for Q1+Q2, Q2+Q3, Q3+Q4, and **Q4(prior year)+Q1(current year)**; cell/header outlines + legend |
| **Year lock** | `FdrYearSettings.hoursLocked` — blocks Firebase sync (`403` on compute); days off still editable; `PUT /api/rot/fdr/:year/settings` |
| **Compare alerts** | Server flags import vs Firebase when computed differs by &gt;15% from imported (≥5h imported months)—both too low and too high; kept for QA while soaking |

**Deferred (Phase 4 — hold while soaking):** tone down compare banner, optional backfill script from in-memory cache, nginx timeout tuning. No code changes until ops is happy with sync + limits + lock in prod.

**Not built:** hour overrides in DB (still Firebase or import fallback per pilot), roster-derived days-off hints, year-lock on days-off (hours only).

## Placement

- **Management** dropdown and ROT sub-nav: **FDR** → `/rot/flight-duty` (**FDR name allowlist**, not general records access)
- ROT nav sibling of Training Records
- **FDR-only allowlist** by user name (hidden from nav otherwise): Andy, Nathaniel, Kaleb, Fen, Scott, Kyle, Brian — see `FDR_ACCESS_NAMES` in `server/api/rot/rot.access.js` and `client/app/rot/rotAccess.service.js`
- Training Records keeps its own access rules (`canAccessRecords`)
- Not part of the records upload/approve flow
- ROT **Fileserver** removed from Management dropdown (out of scope for #35); `/rot/files` route remains if needed

Live FDR module: `client/app/rot/fdr/`, APIs under `/api/rot/fdr/*`. Workbook import seeds DB; 2025+ hours come from **saved Firebase sync** or import fallback until synced.

## What the workbook is

An **audit of paper Flight & Duty records**, not a live hours engine. Instructions (comment on `Instructions`, David W. Olson):

1. Enter **flight hours** and **days off**.
2. Quarter and yearly totals are automatic.
3. Discrepancies: comment on that month’s **hours** cell (red flag).
4. File the paper records.
5. Entering hours + days off **marks that pilot-month complete**.
6. When the month is done, update an Internal Audit Checklist (due ~15th). That checklist page is **not in this file**.

Month hours and days off are **typed**. The only formulas are Q1–Q4, YEAR, section totals, company **Total HOURS**, and Summary. Many of those SUM ranges are stale after row inserts (`#REF!`, Total HOURS pointing at days-off rows, Summary 2023 → `2019!`, Summary missing 2024–2026). **Do not port those formulas.** Recompute in code.

## Confirmed rules

### Hours (auto)

Each pilot has **one row of monthly flight hours**. Section names (**NOME PIC**, **NOME SIC**, **ROTORWING**, **KOTZEBUE**) are **duty assignment / where they sit**, not a filter on time.

- Sum Firebase `flights.flightTime` (minutes → hours) for that employee as **PIC or SIC** that calendar month (`pilotEmployeeNumber` **or** `coPilotEmployeeNumber`).
- **Firebase / Flight Report only.** Takeflite is not an FDR hours source (fixed-wing may also exist there; those times are not crew flight time).
- **All aircraft.** Do not restrict PIC-section rows to PIC-leg time.
- Same person, one section: all of their hours for the year go in that section’s row.

### Days off (manual)

**Days off** = calendar days the pilot was off that month, from the **paper F&D / pay sheet**.

- **Not** days flown.
- **Not** roster duty-day counts.
- Roster **Available (A)** and **admin** days are **duty**, so they must **not** count as days off. Those only show up on the F&D form.

**Source of truth:** paper F&D. It is not in the database, so days off are **manually entered** (import existing xls values as the starting set).

Optional later hint (not source of truth): show roster scheduled OFF count next to the cell. Never treat A/admin as OFF. Do not block save if hint ≠ entered value.

### One section per person per year

No mid-year split rows. If they upgrade or change base, they **move next January**. Empty months in the new section are OK (they were not in that assignment yet, or the month was not flown).

Verified in the uploaded workbook:

| Pilot | 2023 | 2024 | 2025 | 2026 |
|-------|------|------|------|------|
| **Hanson, Ryan** | KOTZEBUE (full year) | KOTZEBUE (Jan–Aug filled) | **NOME PIC** (Oct–Dec only) | NOME PIC (Jan–Aug filled) |
| **Rickett, Rylan** | NOME SIC (Dec hire) | NOME SIC (full year) | NOME SIC (full year) | **NOME PIC** |

Neither appears in two sections in the same year. Hanson 2025 hours live only in NOME PIC (late-year move); Rickett’s PIC time starts 2026.

If Firebase has Hanson hours in Jan–Sep 2025, those **should appear** in the NOME PIC row (computed hours are more accurate than blanks in the xls). That is expected, not a section split.

### History cutover

| Years | Hours | Days off | Section list |
|-------|--------|----------|--------------|
| **≤ 2024** | Static snapshot from the spreadsheet | Static from spreadsheet | Static from spreadsheet |
| **2025–2026+** | **Computed from Firebase** (authoritative) | **Imported from spreadsheet**, then manual going forward | Imported from spreadsheet; Kaleb can add/move names |

If 2025 Firebase hours look **incomplete** vs filled xls months (computed << spreadsheet for the same pilot-month), **alert** — expectation is Firebase is complete for 2025.

Summary tab: company total **hours** only (no days off). For ≤ 2024 use imported monthly company totals (or re-sum static year sheets). For 2025+ re-sum computed section hour totals.

## Grid (UI contract)

Year tabs (2006–current) + **Summary**.

Per year, per section:

```
Instructions   JAN … DEC   Q1 Q2 Q3 Q4   YEAR
NOME PIC
LAST, FIRST    hours…                     (computed 2025+)
               days off…                  (manual)
…
Total OME PIC  (sum of hour rows)
```

Then NOME SIC, ROTORWING, KOTZEBUE, then **Total HOURS** (sum of section hour totals).

**Formulas (always in code):**

- Q1 = Jan+Feb+Mar, Q2 = Apr+May+Jun, Q3 = Jul+Aug+Sep, Q4 = Oct+Nov+Dec
- YEAR = Q1+Q2+Q3+Q4
- Section total = sum of that section’s **hour** rows (not days-off rows)
- Total HOURS = sum of section hour totals

Cell comments on hours = discrepancy notes (audit). Completing a month = hours present (computed) **and** days off entered.

### Duty / flight limits (2025+ computed years)

Evaluated in `server/api/rot/rot.fdr.limits.js` and shown on the grid (gold ≈90% of cap, red = violation).

| Rule | Threshold |
|------|-----------|
| Single quarter hours | ≤ **500** |
| Calendar year hours | ≤ **1400** |
| Consecutive quarters **same year** | Q1+Q2, Q2+Q3, Q3+Q4 each ≤ **800** |
| **Cross-year only** | Q4(**Y−1**) + Q1(**Y**) ≤ **800** (prior Q4 from PG or import) |
| Days off per quarter | ≥ **13** when quarter is auditable (entered months or quarter ended) |

## Data model

Do not keep editing the `.xls` as system of record. Postgres (implemented):

- **`FdrPilot`** — `year`, `section`, `pilotName`, `sortOrder`, optional `employeeId`
- **`FdrDaysOff`** — `year`, `month` (1–12), `pilotName`, `daysOff`, `updatedBy`
- **`FdrImportHour`** — imported monthly hours (static years + fallback for unsynced 2025+ pilots)
- **`FdrHourNote`** — discrepancy comment on a month’s hours
- **`FdrComputedHour`** — `year`, `pilotName`, `month`, `hours`, `syncedAt`, `syncedBy` (Firebase snapshot)
- **`FdrYearSettings`** — `year` PK, `hoursLocked`, `lockedAt`, `lockedBy`

Hours for 2025+ default path: **last successful Firebase sync** in `FdrComputedHour`. Unsynced pilots still show import hours until scoped sync runs.

Import once from `uploads/Flight&DutyRecordReport.xls`:

- All years → section membership + names
- ≤2024 → frozen hour and days-off values as displayed
- 2025–2026 → days off (and notes) only; hours come from Firebase

Workbook lookup today: `FDR_WORKBOOK_PATH`, `uploads/Flight&DutyRecordReport.xls`, or `server/fileserver/rot/fdr/`. After import, the file is archive/export only.

## APIs

Auth: logged-in user + **FDR allowlist** (`requireFdrAccess`). Year lock: FDR allowlist or admin (`canManageFdrYearLock`).

| Endpoint | Role |
|----------|------|
| `GET /api/rot/fdr/meta` | Years, sections, computed/static cutover years |
| `GET /api/rot/fdr/:year` | Full grid: hours, days off, limits, `syncSummary`, `hoursLocked`, compare alerts |
| `POST /api/rot/fdr/:year/compute-hours` | On-demand Firebase aggregate; body `scope` (`all` \| `base` \| `pilot`), `offset`/`limit` batching; **403** if year locked |
| `PUT /api/rot/fdr/:year/settings` | `{ hoursLocked: boolean }` — freeze/unfreeze Firebase sync for the year |
| `PUT /api/rot/fdr/:year/days-off` | Save days-off cells |
| `PUT /api/rot/fdr/:year/hour-notes` | Save hour discrepancy notes (2025+) |
| `PUT /api/rot/fdr/:year/pilots` | Section roster for the year |
| `POST /api/rot/fdr/:year/copy-roster` | Copy roster from prior year |
| `GET /api/rot/fdr/.../export` | Excel export (year, summary, full workbook) |

Firebase: per-employee Firestore queries on the server (`rot.fdr.hours.js`). Fields: `flightTime`, `date`, employee as PIC/SIC.

## UI behavior

- Year tabs + Summary; default to latest year
- Spreadsheet-like table (`rot-fdr` CSS): two-row bands per pilot (hours + days off), section totals, company total
- 2025+: hours read-only (Firebase snapshot or import fallback); days off editable; **sync toolbar** (not automatic on load)
- Session banner: last DB sync time; “not refreshed this session” via row markers
- ≤2024: fully read-only snapshot
- Completeness: green/amber month cells; red flag on hour notes
- Limits legend + quarter/year outlines when limits enabled
- **Lock Firebase sync** control (managers): freezes compute only; days off still editable
- Compare alerts list when Firebase hours exist but lag imported xls (QA; may soften in Phase 4)

Issues **xlsx** upload (same #35 note) is separate and already started.

## Build order

1. ~~**Import + static years**~~ — done
2. ~~**Computed hours 2025+**~~ — done (on-demand sync + `FdrComputedHour`)
3. ~~**Days-off edit + save**~~ — done
4. ~~**Totals / Summary in code**~~ — done
5. ~~**Section roster edit**~~ — done (copy from prior year)
6. ~~**Notes / completion**~~ — done
7. ~~**Export**~~ — xlsx downloads (year, summary, workbook)
8. ~~**Duty limits**~~ — done (`rot.fdr.limits.js`)
9. ~~**Year lock**~~ — done (`FdrYearSettings`)
10. **Phase 4 cleanup** — deferred during prod soak (see status table above)

## Next: duty days + monthly audits (planning, Sep 2026)

**Hours:** Firebase Flight Report is SOT for **all** pilot flight time (`flights.flightTime` as PIC or SIC). Takeflite is **not** part of FDR — even though fixed-wing trips also exist there, off-block / schedule times are not crew hours. Spreadsheet vs Firebase gaps (e.g. ROTORWING Paulsen) are FR vs paper/xls, not Takeflite. Compare alerts flag Firebase **higher or lower** than import.

**Days off (not implemented):** A day off is a calendar day the pilot did **not** claim as duty (flight **or** admin). Do **not** infer off from “no flight that day.” Roster A/admin is duty.

### What we found in Firestore (explore with Andy)

Root collections: `aircraft`, `auditLogs`, `employees`, `flights`, `keys`, `manifest`, `passengers`, `people`, `pilots`, `recordTypes`, `records`, `rostercalendar`, `rostermonthmeta`, `rosterschedules`, `users`. **No dedicated `dutyDays` collection.**

Duty lives under **`pilots/{employeeId}/flightIndex`** (Flight Report persistence):

| Doc id pattern | Example | Notes |
|----------------|---------|--------|
| PFR id | `1099-010826-1` | Same as `flights` doc; `dutyDayIsAssigned` sometimes true |
| Sequence ON | `100ON` | `dutyDayType.Regular` / `Overnight` / `Partial` / `Training` often set; `dutyDayIsAssigned` often **false** |
| Sequence OFF | `100OFF` | types empty; not the same as “calendar day off” |

`dutyDayType` flags: `Admin`, `AdminAR`, `Medevac`, `MedevacPhone`, `Overnight`, `Partial`, `Regular`, `Training`, `WeatherFull`, `WeatherHalf`.

`pilots/{id}/BRG-Indexes/BRGIndex` has a numeric `duty` counter (Paulsen **141**) plus a `pfr` date map — likely hitch/PFR indexes, not monthly days-off.

**Coverage is uneven:** rotor / FR-heavy pilots have hundreds of `flightIndex` docs; some FW PICs have almost none. **Hypothesis (Andy, 2026-09-12):** `flightIndex` (and maybe `BRGIndex`) is written on Flight Report **manual backup**, not on every duty claim. Andy’s emp **933** index is dense **2023–Nov 2024**, then nearly empty in **2025–2026**, matching “last backup around then.” If true, missing days are **unsynced local duty**, not days off — auto-import is unsafe until backup (or a live sync) is proven.

**Open questions (need FR / iPad walkthrough):**

1. Which field means “claimed this calendar day as duty”? (`dutyDayIsAssigned` vs any `dutyDayType` vs presence of `*ON` vs PFR with `flightBeganString`)
2. Is Admin-only duty always written to Firebase, or only on backup?
3. Are `{n}ON`/`{n}OFF` hitch bookends or per-day records?
4. Timezone: `date` timestamps look UTC afternoon for AK morning (`07:00`).
5. Does FR **backup** upsert `flightIndex` for 2025–2026 Admin-only days?

### Backup test — emp 933 (ready to run)

**Baseline (queried 2026-09-12, before a new backup):**

| Metric | Value |
|--------|--------|
| `pilots/933/flightIndex` docs | **1442** |
| `dutyDayIsAssigned` true | 161 |
| `dutyDayType.Admin` | **7** (all `{n}ON`; none on PFR ids) |
| Admin-only (no Regular) | `551ON` (~2024-08-21), `602ON` (~2024-11-13) |
| Last dense month | **2024-11** |
| 2025+ index | handful of docs (not a full year) |
| `BRGIndex.duty` | 801 |

**Procedure**

1. ~~Snapshot before~~ — done (table above).
2. **Andy:** on the iPad Flight Report app, run the same **manual backup** used historically. Note time (AK) and whether it reports success / error / “nothing to upload.”
3. Wait until the app says finished (plus ~1 min). Ping this thread.
4. Re-query `pilots/933/flightIndex` (counts + newest `date` + Admin flags + 2025–2026 month histogram). Compare to the baseline.

**Backup test — emp 933 (ran 2026-09-12 ~11:00 AK)**

**Baseline (before):** 1442 index docs, 161 assigned, 7 Admin, dense through 2024-11, `BRGIndex.duty` 801.

**After backup:** **no change** — same 1442 / 161 / 7 Admin / duty 801. **0** `flightIndex` docs had `updateTime` in the backup window (newest index write **2026-02-09**). PIC `flights` for 933 also **0** writes in that window, but `flights` already has **2025 (482) + 2026 (300)** PFRs — hours sync live; **duty index does not**.

| After backup | Meaning |
|--------------|---------|
| Doc count jumps; 2025–2026 `{n}ON` rows; Admin on known admin-only days | Backup **is** the duty sync. |
| `flights` / hours change but `flightIndex` stays ~1442 and still dead after 2024-11 | Backup is PFR/hours only. |
| **Observed:** nothing moved on `flightIndex` or `flights` | This backup pass did **not** upsert duty (or PFRs). Hours were already in `flights`. Duty auto-import still blocked. |

**Not a fleet-wide FR cutoff (2026-09-12 sample):** Many FW and HEL pilots still have dense `flightIndex` through **2026-08/09** (e.g. Gordon, Bickford, McIntosh, Macavoy, Paulsen, Barton). Andy **933** going quiet after **2024-11** is **not** the company pattern. Empty/tiny indexes (Rowe 0, Hajdukovich 3) look like never used, not a Nov 2024 code drop. Gordon still has **116** Admin-flagged index docs, including the current era.

**Live Admin test — emp 933, calendar 2026-09-13 (Andy creating in FR):**

**Before (2026-09-12):** 1442 index docs, max `{n}ON` sequence **800**, **no** index rows dated 2026-09-13/14.

**After create+sync:** **+2 docs** (`1105ON` / `1105OFF`). `1105ON` date **2026-09-13**, **`dutyDayType.Admin` only**, `dutyDayIsAssigned` false, `flightTime` 0, began `07:00`. `1105OFF` is 2026-09-14, empty types. `BRGIndex.duty` 801 → **1106**. Admin count 7 → **8**.

**Beta vs production FR (confirmed 2026-09-12):** Two indexes, not identical:

| Collection | Emp 933 |
|------------|---------|
| `flightIndex` (non-beta app) | 1444 docs, sparse 2025, Admin test **1105ON** 9/13 |
| `flightIndexBeta` (beta app) | **3003** docs, dense 2025–2026, **154** Admin; **1104ON** Admin 2026-09-09; **no** 1105ON |
| `Backup-Beta_26-09-12` | Today’s beta backup (**1234** docs) — **not** merged into `flightIndex` |

This morning’s backup did not update prod `flightIndex` because it was a **beta** backup into `Backup-Beta_*`. Live non-beta sync wrote 1105ON. Fleet: some people are almost entirely beta (Hajdukovich 3 vs 3213; Krebiehl 0 vs 3568); line captains often prod-only (Paulsen beta 2 docs).

We **cannot** require one FR build. Plan: **always union** `flightIndex` and `flightIndexBeta`. Ignore `Backup-*` / `Backup-Beta_*`.

### Union solution (plan — not built)

**Goal:** Auto days off from Firebase duty claims; hours stay on `flights`. Postgres caches a snapshot; auditors mark a pilot-month complete on the FDR grid.

**1. Read (per employee, on-demand sync — same pattern as hours)**

```
pilots/{employeeId}/flightIndex
pilots/{employeeId}/flightIndexBeta
```

Same `employeeId` we already resolve for hours. Do **not** read dated backup subcollections. Do **not** merge by `{n}` — sequence numbers are per app (1104 vs 1105).

**2. Calendar day (America/Anchorage)**

Map each doc’s `date` timestamp to an AK calendar date (FR stores ~07:00 AK as UTC afternoon). Overnight `OFF` docs are **not** a second duty day.

**3. Claimed duty (union set of dates)**

A doc counts as a **claim** if:

- id is `{n}ON` **and** at least one `dutyDayType` flag is true (`Admin`, `AdminAR`, `Regular`, `Partial`, `Training`, `Weather*`, `Medevac*`, `Overnight`, …), **or**
- `dutyDayIsAssigned === true` (PFR tied to a duty day)

Ignore `{n}OFF`, empty types, and PFR docs that are only hours with no assignment/type.

**Union:** `claimedDates = dates(prod) ∪ dates(beta)`. Same calendar day in both apps = **one** duty day. Admin in beta + Regular in prod same day = still one duty day.

**4. Days off for month M**

```
daysOff = daysInMonth − |claimedDates in M|
```

Current month: only count through **today** (AK), or leave the cell “in progress” until the month closes. Do **not** treat “no index at all” as 30 days off — if both collections are empty for that year, keep imported/manual `FdrDaysOff` and flag **unsynced**.

**5. Postgres cache (parallel to `FdrComputedHour`)**

- `FdrComputedDuty` — per pilot/year/month: `daysOff`, `claimedCount`, `syncedAt`, `syncedBy`, maybe `source` (`union`)
- Optional `FdrComputedDutyDay` — list of claimed ISO dates for that month (debug / audit drill-in)
- `FdrMonthAudit` — `year`, `pilotName`, `month`, `auditedAt`, `auditedBy`, `note` (Kaleb/auditor: “numbers look right”)

Grid still shows one days-off number per month. Audit is a checkbox/note on the month, not a replacement for the number.

**6. UI / API**

- Piggyback **Sync** (all / base / pilot) to refresh hours **and** duty, or a second “Sync duty” if we want to isolate load.
- 2025+: days-off cells **read-only from cache** after sync; override only via audit note + optional manual patch if FR is wrong (keep rare).
- Compare banner: computed days off vs imported xls (same ±15% / absolute delta idea) so Kaleb sees drift.
- Legend: hours from `flights`; duty from FR prod∪beta.

**7. What we will not do**

- Infer off from “no PFR / no Takeflite flight”
- Use roster A/OFF
- Use `BRGIndex.duty` as a monthly count
- Require pilots to leave beta

**8. Build order**

1. ~~Server helper + `scripts/fdr-duty-union-test`~~ — shipped (`rot.fdr.duty.js`).
2. ~~`FdrComputedDuty` + sync on `compute-hours`~~ — shipped (`rot.fdr.computedDuty.js`).
3. ~~FDR grid reads cached days off when duty synced~~ — shipped; unsynced pilots keep xls/manual.
4. Month audit control + Postgres row — **not built**.
5. Days-off compare alerts — **not built**.
6. Soak on Andy + one prod-only captain + one beta-only before fleet-wide trust.

## Out of scope

- Treating roster codes or “no flight that day” as days off
- Rewriting Training Records (#23)
- Fixing historical Excel formulas in the file
- Mid-year split rows (Hanson/Rickett pattern: one section, some months blank)

## Deploy

`grunt babel:server` + `grunt build` + `pm2 restart fraBering`. Bump `stopped{N}` in **both** places when shipping client changes (see `docs/stopped-version-deploy.md`).

**First deploy with FDR sync tables:** restart creates `FdrComputedHour` and `FdrYearSettings` if missing. Existing prod may show import hours until someone runs **Sync all** (or scoped sync). Lock a closed year (e.g. 2025) after Firebase QA.

Copy the master `.xls` onto prod for the one-time import (`uploads/` or `FDR_WORKBOOK_PATH`).

```bash
# Dev (local DB + workbook in uploads/) — same command as prod (sets NODE_ENV=development if unset):
node -r babel-register scripts/import-fdr-workbook/index.js
# Re-import from xls (wipes FDR tables): add --replace
```

Then `grunt serve` (or `grunt build` + `grunt babel:server` + restart API), log in as an allowed name, open **Management → FDR**.

First API hit also auto-imports when `FdrPilot` is empty (workbook must be present). Prod: copy `Flight&DutyRecordReport.xls` to `uploads/` (or set `FDR_WORKBOOK_PATH`), run the import once, then deploy client/server.
