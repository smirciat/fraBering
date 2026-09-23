# Shared Firebase — do not change the shape

**Locked 22 Sep 2026.** Firestore (`brg-flight-report`) is shared. Flight Report (Ryan’s iPad), BRG Admin, the crew app, fraBering, and resBering all touch it. This repo does not own the readers. A write that looks fine here can crash an app we do not ship.

`set(..., { merge: true })` updates every key in the payload. It does not keep the old type or string pattern of a key you included.

## Anti-pattern

Rewriting a stored value into a cleaner shape: shorter date, `null` instead of omit, Firestore `Timestamp` instead of the string that was already there, or posting a whole loaded document so stale fields go back.

Display format and stored format are different. Change the screen. Leave the stored string and type alone unless that field’s existing pattern is what you are writing.

## Two breaches (Sep 2026)

| When | Where | What changed | What broke |
|------|--------|----------------|------------|
| 17–18 Sep | fraBering `firebaseMin` (`flights/{id}/release/releaseStatus`), while crew/release work was in progress | Unset signatures written as `null`; timestamps became Firestore `Timestamp` instead of ISO strings | Flight Report lost PIC or dispatch on merge |
| 22 Sep | fraBering ROT pilot saves (`pilots/{employee}`) | Training expirations rewritten from `MM/01/YYYY` (`09/01/2027`) to `M/YY` (`9/27`) | Flight Report crashed for pilots whose dates had been converted |

Detail: `docs/flight-release-firebase.md`, `docs/pilot-firebase-writes.md`, `docs/issue-54-expiration-format.md`.

## Patterns that already work

| Field | Stored shape | Screen may show |
|-------|----------------|-----------------|
| Pilot training `*Exp`, `far293a148`, `trainingExpHistory[].exp` | `MM/01/YYYY` (day `01`) | `MM/YY` (`09/27`) |
| Passport, medical, hire, DOB, OAS, Russian visa | Full date, `MM/DD/YYYY` | That date. Do not shorten to month/year |
| PFR `dateString` | `MM/DD/YY` | |
| Release signature times | ISO strings | |
| `*Currency` on `pilots` | Firestore timestamps owned by Flight Report | Do not write them |

## Writes from this app

- `pilots`: FRA-owned fields only (`pickPilotWriteFields`). Exp strings are forced back to `MM/01/YYYY`. A month/year string on a calendar field is dropped, not stored.
- `flights/{id}/release/releaseStatus`: the locked `firebaseMin` payload only.

resBering’s only Firestore merge is a Takeflite event on `flights/{id}/{subcollection}/{eventId}`. It does not update the parent PFR or `pilots`. Same rule if that changes: `docs/shared-firebase.md` in resBering.
