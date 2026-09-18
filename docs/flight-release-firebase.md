# Flight Release → Firebase

**Locked (18 Sep 2026).** Proven extra **6850**, PFR **`933-091826-17`**: dispatch-only omitted PIC; PIC merge kept dispatch and added PIC. Timestamps: **ISO strings** (not Firestore Timestamp).

FRA writes **`flights/{pfrId}/release/releaseStatus` only**. Flight Report (iPad / Ryan) reads that doc. If FR wipes or ignores fields, **Ryan chases it**. FRA **wipes only on Remove Release**.

## `firebaseMin`

| Rule | Detail |
|------|--------|
| PFR id | `flight.pfr._id` on the saved row; skip + log if missing |
| Target | `release/releaseStatus` `{ merge: true }` |
| Payload | `dbId`, `dateString`, `flightNumber`, `aircraft`, `pfrNum`, `knownIce` if set |
| Signatures | **Only names that are set** + matching timestamps as **ISO strings** (`toISOString()`) |
| Unset | **Omit** — do not send `null` for a signature this save did not set |
| **Wipe** | **Remove Release only** (web admin / mobile): all three names + timestamps **`null`** |

Web PATCH and mobile sign/remove → `runFlightUpdateSideEffects` → `firebaseMin`.

## Not FRA’s job

Parent `dispatchRelease` / `pilotAgree` on `flights/{pfrId}`.

## Keep

Postgres `#41` merge, `preserveExistingPfr`. HEL `writeReleaseToFirebase` after PATCH. 9xx PFR wildcard is a separate attach bug.

## Logs

`minFlight updated {pfrId} {flightNum}`
