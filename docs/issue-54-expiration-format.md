# Issue #54 — Training expiration format (M/YY)

Pilot training expirations are **month/year only** (e.g. `10/27`) — all expire at end of month; day is not shown.

## Implementation

- **`client/app/rot/rotPilotExpDate.service.js`** — `parsePilotExpDate` / `formatPilotExpDate` (legacy `M/D/YYYY`, `Oct-2026`, and `M/YY`).
- **Records** — approval preview, Firebase writes, exp history table (`monthYear` filter).
- **Pilot board** — `*ExpShort` columns and cell color logic.
- **Pilot modal** — training `*Exp` fields normalize to M/YY on blur.

Full calendar dates remain for medical, hire, passport, etc.

**Deploy:** `grunt build` (new script in `index.html`).
