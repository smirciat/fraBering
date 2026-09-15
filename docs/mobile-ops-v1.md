# Mobile ops API v1 (fraBering) — contract draft

**Status:** design only — routes not implemented yet.

**Product:** FRAT status board + flight release sign-off inside **bering_crew** (resBering Flutter). One employee login; reservations brokers a short-lived FRAT JWT for a **1:1 mapped** fraBering `User`.

**Flutter / deploy / tab gating:** [`resBering/docs/bering-crew-frat-board.md`](../../resBering/docs/bering-crew-frat-board.md). This file is **API on frat.beringair.com only**.

**Do not use:** legacy `POST /api/todaysFlights/mobile/*` + `MOBILE_TOKEN` (shared secret, no per-user identity).

**Related:** `GET /api/todaysFlights/ops-export` + `FRAT_OPS_EXPORT_TOKEN` (reservations daily board) — same secret family for server-to-server trust.

---

## Base URL

`https://frat.beringair.com/api/mobile/ops/v1`

Version in path so store builds can lag server deploy.

---

## Auth

### Client (Flutter → fraBering)

After `POST` reservations `…/employee/v1/frat/session` (employee Bearer), the app calls fraBering with:

```http
Authorization: Bearer <frat-jwt>
```

JWT is a normal fraBering token (`signToken(user._id, role)` — same as `POST /auth/local`). TTL should be **hours / one day**, not multi-year.

### Server-to-server (reservations → fraBering)

Assertion mints the JWT for the mapped user. **Not callable from the phone.**

```http
POST /api/mobile/ops/v1/auth/assertion
x-frat-ops-export-token: <FRAT_OPS_EXPORT_TOKEN>
Content-Type: application/json

{ "email": "pilot@beringair.com" }
```

or `{ "userId": 123 }` when a stable link table exists.

**Response:** `{ "token", "user": { "_id", "email", "name", "role" } }`

**Errors:** `401` bad token; `404` / `409` no unique user match (reservations surfaces “no FRAT account linked”).

Env: `FRAT_OPS_EXPORT_TOKEN` in `server/config/local.env.js` (see `local.env.sample.js`).

---

## Endpoints (v1)

All below except `auth/assertion` require `auth.isAuthenticated()` (Bearer JWT).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/me` | Mapped user + which sign roles apply (`canSignDispatch`, `canSignOc`, `canSignPilot` for a given `flightId` query optional) |
| GET | `/board?base=OME\|OTZ\|UNK\|HEL&date=YYYY-MM-DD` | Slim day list for base (FW filter same as web navbar; HEL from Firebase path) |
| GET | `/flights/:id` | Release DTO: legs, colors, PFR summary, release fields, `whoCanSign`, bulletin nag flag |
| POST | `/flights/:id/sign` | `{ "as": "dispatch" \| "oc" \| "pilot" }` — server enforces same rules as web modal |
| GET | `/hel?date=YYYY-MM-DD` | Slim HEL cards (v1 may merge into `/board?base=HEL`) |

### Board row (fixed-wing) — illustrative fields

Not the full `dayFlights` Sequelize row. Example:

- `_id`, `flightNum`, `airports[]`, `departTimes[]`, `flightStatus`, `color` / `colorLock`
- `dispatchRelease`, `ocRelease`, `pilotAgree` (booleans or names)
- `pilotObject`, `equipment` (minimal)
- `updatedEta` / display ETA fields as on web strip

### Sign body

Server sets timestamps and names on the flight row (`dispatchRelease`, `ocRelease`, `pilotAgree`, inspections, `airportObjsLocked` / `colorLock` when applicable). Reuse PATCH side-effects (`firebaseMin`, release email rules) from existing `todaysFlight.controller.js`.

**Sign gates (must match web):** `ocRequired`, PFR/fuel mins, 1h dispatch window, PIC last name vs `pilotObject`, role `admin+` / `superadmin`, bulletin nag is **warn-only** (reservations bridge — same as modal).

### HEL

v1: **read-only** HEL list via existing `firebaseDate` / card shape. HEL OC sign (`updateFirebaseHeli`) is **v1.1** unless product adds it to first ship.

---

## Parity reference (web)

| Concern | Code |
|---------|------|
| Status board / bases | `client/app/status/status.controller.js`, `client/components/navbar/navbar.controller.js` |
| Release modal + sign UX | `client/components/modal/modal.service.js`, `modal.html` |
| PATCH flight | `PATCH /api/todaysFlights/:id` |
| Bulletin nag at sign | `GET /api/reservationsBridge/pending-bulletins` |
| Ops export (related token) | `GET /api/todaysFlights/ops-export` |

---

## Implementation notes (when building)

1. New router under `server/api/mobileOps/` (or `mobile/ops/`) mounted in `server/routes.js` — **not** commented `indexMobile.js` token routes.
2. Add integration tests for sign gates (PIC vs FO, OC required, already signed).
3. Deploy fraBering **before** resBering `frat/session` + crew tab.
4. Identity: normalize email match employee ↔ `User`; optional `employeeId` ↔ `_id` link table in resBering if email-only is brittle.

---

## resBering broker (not in this repo)

Planned on reservations API:

- `POST /api/mobile/employee/v1/frat/session` → returns FRAT JWT
- `GET /api/mobile/employee/v1/frat/status` → `{ linked: boolean }` for tab empty state

Documented in resBering [`docs/mobile-api-v1.md`](../../resBering/docs/mobile-api-v1.md) (planned routes) and [`docs/bering-crew-frat-board.md`](../../resBering/docs/bering-crew-frat-board.md).
