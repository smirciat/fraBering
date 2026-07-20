# Agent guide — fraBering (Bering Air operations app)

## What this is

Legacy **Angular Full-Stack** app (AngularJS 1.x + Express + Sequelize). It supports flight operations: rosters, manifests, METAR/TAF, hazard reports, timesheets, notifications, and real-time updates via Socket.io and Firebase.

## Stack constraints

- **Node.js ^12.22.12** and **npm ^6.14.12** — do not upgrade major dependencies without explicit approval.
- **Babel 6 / ES2015 imports** on the server; **Grunt** builds the client.
- **Sequelize 6** with PostgreSQL (production) or SQLite (local dev).
- Auth uses **JWT + Passport** with roles: `guest`, `user`, `admin`, `superadmin`.

## Project layout

| Path | Purpose |
|------|---------|
| `client/` | AngularJS app (modules, controllers, directives, services) |
| `server/api/` | REST API modules (`index.js` routes, `*.controller.js`, `*.model.js`) |
| `server/auth/` | JWT/Passport middleware |
| `server/config/` | Environment and Express/Socket.io setup |
| `server/app.js` | Server entry — **scheduled jobs**, Helmet CSP, Socket.io |
| `e2e/` | Protractor end-to-end tests |

## Commands

```bash
grunt serve          # Dev server (opens client)
grunt build          # Production build → dist/
npm test             # Unit tests (Grunt + Karma/Mocha)
npm start            # Production server from dist/
```

## Protected areas — read `.cursor/rules/` before editing

1. **Secrets / local config** — never commit or overwrite: `local.env.js`, `development.js`, `firebase.json`, `.env`
2. **`server/app.js`** — background intervals (METAR, TAF, roster, Firebase, flight logs)
3. **`server/config/environment/shared.js`** — flight schedules, pilot roster, equipment limits
4. **`server/auth/`** — authentication and authorization middleware
5. **Database** — no destructive SQL, drops, or `sequelize.sync({ force: true })`

## Change discipline

- Match existing patterns in the module you touch (AngularJS module/controller/service layout; Express router + auth guards).
- Prefer the smallest change that fixes the issue.
- Do not refactor unrelated code, rename modules, or modernize the stack unless asked.
- Run or extend existing tests when changing API or auth behavior.

## Local setup (for humans)

Copy sample config files before first run:

- `server/config/local.env.sample.js` → `local.env.js`
- `server/config/environment/development.sample.js` → `development.js`
- Provide `server/firebase.json` separately

See `README.md` for full install steps (npm, bower, node version quirks).
