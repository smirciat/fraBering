# Flight Release → Firebase / Flight Report (Sep 2026)

**Status:** Working on **open** PFRs after 2026-09-17. Do not “fix” Firestore `undefined` by writing `null` for unsigned signature fields.

When FRA records a flight release, Flight Report (iPad) is supposed to show dispatch/OC and PIC on that PFR. This broke repeatedly in Sep 2026. The notes below are what actually failed in prod (flight **852**), and the test that proved the live path (flight **853**).

## What Flight Report reads

Two Firestore locations, both under `flights/{pfrDocId}` (example: `933-091726-13`):

| Path | Fields | Notes |
|------|--------|--------|
| Parent PFR document | `dispatchRelease`, `ocRelease`, `pilotAgree` (+ matching `*Timestamp`) | **This is what the iPad UI shows** for FW. Timestamps on the parent should be **ISO strings**, same as Flight Report’s own writes. |
| Subcollection `release/releaseStatus` | Same signature fields, plus `dbId`, `flightNumber`, `aircraft`, `pfrNum`, `knownIce` | Historical FRA write (`firebaseMin`). HEL OC/fuel uses this same doc. Keep writing it. |

Orange / high-risk legs use **OC**, not dispatch. Flight Report will show `ocRelease` in that case.

PFR doc id looks like `933-091726-12` (pilot emp + `MMDDYY` + sequence). It is **not** the Postgres `TodaysFlights._id`.

## Proven write shape

Old `firebaseMin` (before 2026-09-17 experiments):

- Target: `flights/{flight.pfr._id}/release/releaseStatus` with `{merge:true}`.
- Copy signature fields **as they are**. Missing fields were omitted or `undefined`.
- Firestore **rejects `undefined`**, so some writes failed entirely. That is safer than sending `null` for a field another signer already set.

HEL status-board writes (`updateFirebase` → `POST /api/airplanes/updateFirebaseHeli`) only send **`_id` plus the field being changed**. Same merge rule.

## What broke (do not repeat)

Several Sep 17 attempts tried to make Firestore accept the payload by converting missing signatures to `null`. With `{merge:true}`, **`null` erases the field**.

Sequence that produced “Postgres has both, Flight Report only has dispatch/OC”:

1. PIC signs → write includes `dispatchRelease: null` or `ocRelease: null` → wipes the earlier name.
2. Dispatch/OC signs from a stale modal (or the 5s `flightModalCallback` retry) → write includes `pilotAgree: null` → wipes PIC.
3. `mergeFlightReleaseFields` in Postgres **already** preserves the other signature (`server/api/todaysFlight/releaseMerge.js`). Firebase did not.

Other traps from the same week:

- Release modal stub `flight.pfr = {legArray:[{}]}` saved over the real PFR → `firebaseMin` had no Firestore id.
- Firebase observer `Object.assign({ _id: doc.id }, data)` let embedded `_id` overwrite `doc.id`.
- Numeric Postgres ids are not PFR doc ids (`isLikelyPfrDocId`).
- **Closed** PFRs (`flightIsClosed: true`) are a bad test. The iPad holds a local copy and will not pick up parent `pilotAgree` the same way. Use an **open** PFR (853-style).
- **Remove Release** correctly writes explicit `null`s to parent + `releaseStatus`. Flight Report may **keep showing** the old names until it discards its local copy. Check Firestore before assuming FRA failed.

## Current code (keep this behavior)

| Piece | Role |
|-------|------|
| `server/api/airplane/airplane.controller.js` `firebaseMin` / `compactReleaseWrite` | After save: merge **only set** signatures; on Remove Release, write all signature fields `null`. Also merge those fields onto the **parent** PFR (ISO strings). |
| `server/api/todaysFlight/todaysFlight.controller.js` `runFlightUpdateSideEffects` | Calls `firebaseMin` on the **saved** row (after `mergeFlightReleaseFields` / `preserveExistingPfr`). |
| `client/app/status/status.controller.js` `writeReleaseToFirebase` | Backup HEL write; **omit** empty signatures (do not send `pilotAgree: null` when dispatch signs). |
| `server/api/mobileOps/mobileOps.controller.js` | Sign / remove-release must call `runFlightUpdateSideEffects`. |

## How to verify (prod)

Postgres (`metar` on 5432), e.g. flight 853 on 9/17/2026:

```sql
SELECT "_id", "flightNum", "pilotAgree", "dispatchRelease", "ocRelease"
FROM "TodaysFlights"
WHERE "flightNum" = '853' AND date = '9/17/2026';
```

PFR id is on the row’s `pfr` JSON (`pfr->>'_id'` or `pfr->>'firestoreId'`).

Firebase (admin SDK, `server/firebase.json`):

- Parent: `flights/{pfrId}` → `pilotAgree` / `ocRelease` / `dispatchRelease`
- Sub: `flights/{pfrId}/release/releaseStatus` → same fields

**Live test (this is what worked):**

1. Open an **unsigned, still-open** PFR in Flight Report (do not close/backup).
2. FRA: sign dispatch **or** OC only (orange → OC). FR should show that name; PIC blank.
3. FRA: PIC accept. FR should show **both**.
4. Optional: Remove Release in FRA. Postgres + Firebase go to `null`. FR may still show names until the iPad drops its cache.

Do not use a closed PFR (852 on 2026-09-17) to judge PIC display.

## Logs

`minFlight updated {pfrId} {flightNum}` is in **dist** only when that `console.log` is present. HEL dumps `req.body.flight` on `POST /api/airplanes/updateFirebaseHeli` — look there for accidental `pilotAgree: null` payloads.
