# Issues workflow (fraBering)

Team feedback lives in the app at **Issues** (navbar) → `/issues`.

## For humans

1. File a bug, feature, or question with title, description, and screenshots (paste into the screenshot box).
2. Discuss in **comments**.
3. An **admin** sets **status**, **priority**, and **Developer approved** when the item is ready for an agent or developer to implement.

Statuses:

| Status | Meaning |
|--------|---------|
| `open` / `in_progress` | Active work |
| `needs_clarification` | Waiting on reporter — do not build |
| `ready_for_review` | Shipped — reporter verifies |
| `done` / `closed` | Finished |

## For Cursor / agents

Agents read **`docs/team-backlog.md` in this repo** — not prod directly.

### Get prod backlog onto your dev machine (usual)

Run the export **in this workspace** (your laptop). The script **downloads** markdown from prod and **writes a file here**:

```sh
cd /path/to/fraBering
node scripts/export-team-backlog/index.js
```

- **API:** `https://frat.beringair.com` (default)
- **Auth:** `ISSUES_EXPORT_TOKEN` from your **dev** `server/config/local.env.js` (must match **prod** `local.env.js` so the server accepts the request)
- **Output:** `docs/team-backlog.md` in this folder, plus screenshots under `docs/team-backlog/attachments/` when the server supports `GET /api/issues/agent-summary?format=export` (same token as agent-summary)

You do **not** need to SSH to prod for this. Prod only needs the same token in its `local.env.js` so it can verify your export request.

`--local` uses `http://localhost:9000` and your **dev** database (not team prod issues).

### If you ran export on prod instead

The file would be created **on the prod server’s disk** (wherever you ran the command). It would **not** appear in this dev workspace unless you copy it (`scp`, `git commit` on prod and `git pull` here, etc.). That path is awkward; prefer running export on your dev machine as above.

### Regenerate (reference)

1. **`docs/team-backlog.md`** — build queue, ready-for-review, needs-clarification (see `.cursor/rules/team-backlog.mdc`).
2. **`GET /api/issues/agent-summary`** — same markdown live (requires export token or admin JWT).
3. **`GET /api/issues/:id`** — full JSON with comments and attachment paths (authenticated user).

### Server config

In `server/config/local.env.js` (not committed), optionally set:

```js
ISSUES_EXPORT_TOKEN: 'long-random-string'
```

Same value as `ISSUES_EXPORT_TOKEN` when running the export script.

If unset, only **admin** / **superadmin** JWT can call `/api/issues/agent-summary`.

### Email on new issue

When someone files an issue via **POST /api/issues**, the server sends a short HTML email (same Gmail SMTP as flight-release mail) if these are set in `local.env.js`:

- `GMAIL_ADDRESS` / `GMAIL_APP_PASS` — already used for flight release notifications
- `DEVELOPER_EMAIL_ADDRESS` — your inbox for new-issue alerts
- `DOMAIN` — used for the “Open in fraBering” link (e.g. `https://frat.beringair.com`)

If `DEVELOPER_EMAIL_ADDRESS` is empty, no email is sent (issue create still succeeds). Email failures are logged only; they do not fail the API response.

**Prod checklist**

1. Set `DEVELOPER_EMAIL_ADDRESS` in **prod** `server/config/local.env.js` (not only dev).
2. **Restart** the Node process after changing `local.env.js`.
3. **Deploy latest server** so `GET /api/issues/agent-summary?format=export` exists (same auth as agent-summary). Older servers return 404 for `/agent-export`; the export script falls back to markdown-only until you deploy.
4. Run `node scripts/export-team-backlog/index.js` — writes `docs/team-backlog.md` and downloads screenshots when the bundle API is available.
5. After filing a test issue, check server logs for `issue notify:` — skipped, sending, sent, or send failed.

## Screenshot paste (dev vs prod)

Paste runs in the browser only. **`grunt serve`** uses live `client/` files; **production** serves **`dist/`** after `grunt build`. If paste works locally but not on `https://frat.beringair.com`, redeploy a fresh build first.

- The app reads the clipboard **during** the paste event (deferring loses data on HTTPS).
- If a preview appears but save fails, nginx may be limiting body size — set `client_max_body_size 20m;` for the frat vhost (Express allows 50mb JSON).

## Issue attachment storage (prod)

Screenshots are **not** in git or in `dist/`. They live on disk at:

`server/fileserver/issue-attachments/<issueId>/`

**Why attachments disappeared after deploy:** Older builds wrote uploads under `dist/server/fileserver/…`. `grunt build` starts with `clean:dist`, which **deletes everything in `dist/`** except a few dotfiles. DB rows stayed; files were wiped.

**Current behavior:** New uploads always go to `server/fileserver/issue-attachments/` at the **repo root** (outside `dist/`), so `grunt build` / `grunt babel:server` does not remove them. The API still checks legacy `dist/server/fileserver/…` paths when serving old files.

**After deploying this fix:** Re-upload any missing screenshots, or copy files from `dist/server/fileserver/issue-attachments/` into `server/fileserver/issue-attachments/` on prod before the next full build (if any remain in dist).

Optional override: `ISSUE_ATTACHMENT_ROOT` in `local.env.js` (see `local.env.sample.js`).

Export (`scripts/export-team-backlog`) only **reads** attachments; it does not delete them.
