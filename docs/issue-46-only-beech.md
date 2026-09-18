# Issue #46 — Only Beech (missing Caravan N-numbers)

## Problem

On **Records**, the tail-number dropdown for flight-test rows showed mostly **Beech** registrations. **Caravan** (“Van”) tails were missing when **C208** was selected.

## Cause

Tail list was built from **`GET /api/airplanes`** (Postgres). That table is used heavily for status-board types (1900 / King Air) and does not reliably include the full Firebase **aircraft** fleet. Ops source of truth for type + N# is Firebase (`_id` = registration, `acftType` = Caravan, Beech 1900, etc.) — same as `/status` and navbar `firebaseGrab`.

## Fix

- Load fleet via **`POST /api/airplanes/firebaseGrab`** (reuse `window.firebaseGrabData` when navbar already fetched).
- Filter tails by **`record.aircraft`** → `acftType`:
  - `C208` → Caravan
  - `B190PIC` / `B190SIC` → Beech 1900
  - `BE20` → King Air
  - `C408PIC` / `C408SIC` → Courier (incl. Sky Courier)
  - `C212PIC` / `C212SIC` → Casa
- Postgres `/api/airplanes` remains **fallback** if Firebase grab fails.
- Changing aircraft type clears N# if it no longer matches the filtered list.

## Files

- `client/app/rot/records/records.controller.js` — `loadRotAircraftFleet`, `nNumbersForRecord`, …
- `client/app/rot/records/records.html` — per-record tail dropdown

## Deploy

Client only: **`grunt build`**.

## QA

1. Open a record with PIC checkride + check airman; choose **C208** → N# list shows **Caravan** tails only.
2. Choose **B190PIC** → Beech 1900 tails only.
3. Switch C208 → B190 → prior Caravan N# clears if incompatible.
