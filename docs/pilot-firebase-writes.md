# Pilot Firebase writes

**Locked 22 Sep 2026.** `pilots/1173` (Nikolas Lacroix) was saved from **Edit Pilot Training Dates** the same day flight-log currency on that doc was in question (`courierCurrency`, `apprCurrency`, `holdCurrency`). Those fields are real on some pilot documents. FRA never computes them. A full-document merge can still write them back to whatever the browser loaded.

Firestore `set(..., { merge: true })` updates every key in the payload and leaves the rest alone. It does not protect fields that are included. A stale tab that posts the whole pilot restores old currency and drops anything Flight Report wrote after the page loaded.

## Write

`/api/rot/updateFirebase` with `collection: 'pilots'` keeps only FRA-owned fields (`pickPilotWriteFields` in `server/api/rot/rot.firebase.controller.js`). Dropped keys are logged. Do not bypass that allowlist.

Client saves that used to post `fullPilot` must stay narrow:

| Save | Send |
|------|------|
| Edit Pilot Training Dates | `pilotProfileWriteDoc()` — modal fields only, plus `trainingExpHistory` |
| Save Pilot Assignment/Removal Data | `pilotAssignmentWriteDoc()` — quals, removals, certificate checkboxes, high minimums, medical fields, plus `trainingExpHistory` |
| Approve / revert / passport / medical scan / legal name / archive / pilot-board cell | The few keys that action changes |

## Do not

- `Object.assign({}, fullPilot, …)` (or the training-dates modal object) as the Firebase `doc`.
- Add `courierCurrency`, `apprCurrency`, `holdCurrency`, `extLoadCurrency`, `caravanCurrency`, `beech1900Currency`, `kingairCurrency`, phones, email, or other flight-log fields to the allowlist so a save “does not lose them.” Omitting them is what keeps them.
- Return the filtered payload and then merge the **read-back** full document into the next write.

Training expiration strings stored on the pilot are **`MM/01/YYYY`** (first of the month). **`M/YY`** (`9/27`) crashes Flight Report. Display in FRA may stay **MM/YY**; do not write that shape. Calendar fields (passport, medical, hire, DOB) stay full dates. See `docs/shared-firebase.md` and `docs/issue-54-expiration-format.md`.

## Not FRA’s job

Landing, approach, hold, and courier currency timestamps. Another app owns those. If they look wrong, do not “fix” them by writing the pilot document FRA has in memory.

## resBering (checked 22 Sep 2026)

resBering does not write `pilots`. `pilot-firebase-import.ts` and `rot-firebase.ts` only **read** Firestore (`fpilots`, then `pilots` if that collection is empty) and map a short field list into Postgres or an in-memory index. The import’s Postgres `update` sets `username`, `displayName`, names, base, `active`, `isPilot`, `email`, `weight`, and `far299Exp` — not the Firebase document.

The only Firestore `set(..., { merge: true })` in resBering is `webhook-firestore-writer.ts`: a built Takeflite event on `flights/{id}/{subcollection}/{eventId}`, not the parent flight and not a pilot.
