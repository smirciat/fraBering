# Flight Release → Firebase

**Locked (18 Sep 2026).** Proven extra **6850**, PFR **`933-091826-17`**: dispatch-only omitted PIC; PIC merge kept dispatch and added PIC. Timestamps: **ISO strings** (not Firestore Timestamp).

FRA writes **`flights/{pfrId}/release/releaseStatus` only**. Flight Report (iPad / Ryan) reads that doc. If FR wipes or ignores fields, **Ryan chases it**. FRA **wipes only on Remove Release**.

## Do not patch-forward (Sep 17–18 2026)

The first report was that **recent API work** stopped the Flight Report write. Ops asked, repeatedly, to go back to the **last working `firebaseMin`**. Agents **patched forward** instead. The worst failures were **induced by those patches**, then chased as if they were the original bug.

| Induced by the “fix” | What it did |
|----------------------|-------------|
| Missing signatures → `null` so Firestore would accept the doc | `{merge:true}` **deleted** PIC or dispatch/OC |
| Extra client HEL write of **all** signature fields | Same wipe from a stale modal / 5s retry |
| Write the **saved Sequelize row** instead of the JSON PATCH body | Dates became **Firestore Timestamps**; old path had **ISO strings** because Angular JSON-encoded the body |
| Parent-doc merge, live PFR matching, stub-PFR workarounds | Extra surface; Flight Report still reads `release/releaseStatus` |

**Rule:** If ops says restore what worked, restore **that function and the payload Flight Report used to receive** — including accidents (ISO-via-JSON). Do not ship a “cleaner equivalent” (`Date` vs string, `null` vs omit, parent vs subcollection). Diff against `firebaseMin` from **before the breakage**, not against the last agent commit.

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

ISO strings: old `firebaseMin` copied `flight.releaseTimestamp` from the **PATCH JSON** (already ISO). `toISOString()` is how we keep that shape now that the write uses the saved row.

## Not FRA’s job

Parent `dispatchRelease` / `pilotAgree` on `flights/{pfrId}`.

## Keep

Postgres `#41` merge, `preserveExistingPfr`. HEL `writeReleaseToFirebase` after PATCH. 9xx PFR wildcard is a separate attach bug.

## Logs

`minFlight updated {pfrId} {flightNum}`
