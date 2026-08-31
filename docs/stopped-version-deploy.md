# `stopped` version — production deploy reload (do not break)

**Status:** Active ops mechanism (hundreds of prior versions). **Agents must not remove or “simplify” this without explicit user approval.**

## What it does

Open FRAT tabs poll a **versioned** API route every **60 seconds**. When Andy deploys new client + server code, he **increments the integer** in two places. Tabs still running the **old** bundle hit a route that no longer exists → **404** → **`location.reload()`** → fresh `dist/` JS.

This is the **intentional** way to push new code to dispatchers without asking everyone to hard-refresh. It has worked across hundreds of `stopped` bumps.

| File | What to bump |
|------|----------------|
| `client/components/navbar/navbar.controller.js` | `let version='…'` inside `stoppedFunction()` |
| `server/api/todaysFlight/index.js` | `router.post('/stopped…', controller.returnStopped)` |

**Both must match.** Then:

```sh
grunt build    # client → dist/; includes babel:server
pm2 restart fraBering
```

`returnStopped` itself (`todaysFlight.controller.js`) returns `{ stopped: doubleFail }` for Takeflite CSV staleness — **that is unrelated** to deploy reload. Do not conflate the two.

## How reload works (client)

```text
stoppedFunction() every 60s
  POST /api/todaysFlights/stopped{N}
    200 → normal Takeflite staleness check (purple navbar if stopped)
    404/403 → version mismatch → location.reload()  ← DEPLOY SIGNAL
    401 → stale-file path (returnFail); set localStorage, no reload
```

The **404 handler is required.** Without it, bumping `stopped` does nothing for open tabs.

### Loop guard (Aug 2026)

If reload runs but the browser still serves **cached** old JS, a second 404 on the same client version must **not** loop forever. `stoppedFunction()` uses `sessionStorage` key `fratStoppedReload` — one reload attempt per client version; then console warning to hard-refresh (`Ctrl+Shift+R`).

## Incident — Aug 29, 2026 (`stopped148` / `stopped149`)

| Commit | What happened |
|--------|----------------|
| `09736de` / `ad350f3` | Bumped `stopped147` → `stopped148` → `stopped149` (normal deploy) |
| **`7526667` (`test`)** | **Agent removed 404/403 → `location.reload()`** while trying to stop a reload loop caused by **misconfigured** bump (client/server/cache mismatch). Commit message: `test`. |

**Effect:** From that deploy until the fix was restored (~Aug 31), **open tabs did not auto-reload** on version bump. Tabs that loaded during the broken window needed a **manual refresh** once to pick up JS that still had reload logic.

**Root cause of the loop (user misconfig), not the mechanism:** bump server route without matching client rebuild, or browser cache serving old `app.*.js` after reload. Fix the config/cache — **do not delete reload-on-404.**

## Agent rules — read before touching `stoppedFunction` or `index.js` stopped route

1. **Never remove** `if (err.status===403||err.status===404) { … location.reload() … }` from `stoppedFunction()` to “fix” a reload loop. Fix version alignment and `grunt build` instead.
2. **Never change** 404 handling to only log, only update `localStorage`, or “return early” without reload — that was the Aug 29 regression.
3. **Do not** add a long-lived old route (e.g. keep `stopped149` and `stopped151`) to silence 404s — old tabs will never upgrade.
4. **Do not** rename the route pattern (`/stopped{N}`) or move it without updating **both** files and this doc.
5. **Do not** “fix” reload loops by disabling the poll interval or commenting out `stoppedFunction`.
6. If user reports a reload loop: verify **same N** in navbar + `index.js`, run **`grunt build`**, confirm **`dist/server`** and **`dist/client`** both have N, check for **cached** old `app.*.js` (filerev hash in `dist/client/index.html`). Prefer loop guard over deleting reload.
7. Bumping `stopped` is **not** a feature flag — it is a **deploy version**. Treat edits as production-critical.

## Related

- `docs/performance-status-board-2026-08.md` — `/status` data flow (mentions stopped poll)
- `.cursor/rules/stopped-version-deploy.mdc` — short agent rule (always applied)
- `AGENTS.md` — protected areas index
