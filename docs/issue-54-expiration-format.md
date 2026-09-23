# Issue #54 — Training expiration format (M/YY)

Pilot training expirations are **month/year only** (e.g. `10/27`) — all expire at end of month; day is not shown.

## Implementation

- **`client/app/rot/rotPilotExpDate.service.js`** — `parsePilotExpDate` / `formatPilotExpDate` (legacy `M/D/YYYY`, `Oct-2026`, and `M/YY`).
- **Records** — approval preview, Firebase writes, exp history table (`monthYear` filter).
- **Pilot board** — `*ExpShort` columns and cell color logic.
- **Pilot modal** — training `*Exp` fields show **MM/YY** on blur. Save writes `MM/01/YYYY`.

Full calendar dates remain for medical, hire, passport, etc.

## Storage (22 Sep 2026)

Flight Report crashes on **M/YY** strings (`9/27`). Firebase keeps the previous shape: **first of that month, `MM/01/YYYY`** (`09/01/2027`). FRA screens still display **MM/YY** (`09/27`). Writes go through `formatPilotExpStoredDate`, and `/api/rot/updateFirebase` rewrites slash-form exp to `MM/01/YYYY` before merge. A month/year string on passport, medical, hire, or DOB is dropped. See `docs/shared-firebase.md`.

**Deploy:** `grunt build` (new script in `index.html`).
