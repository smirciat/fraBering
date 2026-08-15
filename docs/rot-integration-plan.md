# ROT → fraBering integration plan (#10)

## Progress (2026-08-14)

**Pilot Evals slice — live on prod (smoke test passed).**

**SIC Hours slice — in repo (Phase 3); deploy with `grunt build` + `grunt babel:server`.**

**Records slice — in repo (Phase 4); deploy with `grunt build` + `grunt babel:server`.**

**Pilot board slice (OME/OTZ) — in repo (Phase 5a); shared `rot-pilot-board` component.**

**Fileserver slice — in repo (Phase 5b); `/rot/files` upload/download browser.**

| Step | Status |
|------|--------|
| PDF backup prod → vultr (3) + dev (1) | Done — cron installed |
| `RotEvaluations` table + API + UI | Deployed |
| DB import (`migrate-rot-evaluations`) | Done — 24 rows |
| Eval PDFs → `server/fileserver/rot/attachments/` | Done |
| `RotPilotContext` + `<rot-pilot-selector>` | Done (in repo) |
| SIC Hours UI at `/rot/sic-hours` | Done (in repo) |
| Records UI at `/rot/records` | Done (in repo) |
| Pilot board OME/OTZ at `/rot/ome`, `/rot/otz` | Done (in repo) — shared component |
| ROT Fileserver at `/rot/files` | Done (in repo) |
| `SIC_LOG.pdf` → `server/fileserver/rot/pdfs/` | Copied in repo — deploy to prod |
| ROT PDF templates → `server/fileserver/rot/pdfs/` | Copied in repo — deploy to prod |
| Training PDF migration script | `scripts/migrate-rot-training-docs/` — done on prod |
| Standalone ROT :58786 | **Decommission in progress** — see `docs/rot-decommission.md` |
| Nightly backup source | Switch to `ROT_BACKUP_SOURCE=frabering` on prod |

**Phase 6 (decommission):** XML import skipped (unused); ROT admin skipped (fraBering admin). Stop `:58786`, point backups at fraBering.

See: `docs/rot-decommission.md`

## Prod deploy + training PDF migration

**Code deploy** (no file moves required for OME/OTZ/SIC UI):

```bash
grunt build && grunt babel:server && pm2 restart frabering
```

**Training PDFs** — run once on prod after deploy (`docs/rot-backup-restore.md`):

```bash
./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh --dry-run
./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh
```

Copies `attachments/`, `records/`, `pdfs/` from `~/ROT/server` → `~/fraBering/server/fileserver/rot/`.

**Not migrated:** general ROT fileserver browser files — stored elsewhere; `/rot/files` is for new uploads.

See also: `docs/rot-backup-restore.md`.

---

## Goal

Move the standalone **ROT** app (`~/ROT`) into **fraBering** with minimal stack churn (Node 12.22.12, AngularJS 1.x). Use fraBering JWT auth; link screens from **Management** dropdown. Keep Firebase Firestore for pilot/record data; keep local PDF storage; add Postgres/Sequelize models in `metar` when needed.

## ROT inventory (current)

| ROT route | Purpose | Pilot selector? |
|-----------|---------|-----------------|
| `/` (`main`) | Primary pilot table, PDF gen | Yes (`$root.nav.chosenPilot`) |
| `/records` | Training records (~1,730 LOC) | Yes |
| `/sicHours` | SIC hours log | Yes |
| `/pilotEvals` | Checkride evals (Postgres) | No |
| `/ome`, `/otz` | Base-specific views | No (`pilotBase` filter) |
| `/pdftab` | Fileserver browser | No |
| `/xml` | XML import | No |
| `/admin` | Admin | — |

**Server APIs:** `/api/evaluations`, `/api/pilots`, `/api/raws`, `/api/things` (Firebase proxy), file routes `/pdf`, `/fileserver`, `/recordPDFs`.

**Auth today:** Firebase client login in `index.html`; ROT API routes largely unguarded. **Target:** fraBering JWT + `auth.hasRole` on all ROT endpoints.

## Conflicts with fraBering

| Item | Issue | Mitigation |
|------|--------|------------|
| ui-router states `main`, `admin` | Name clash | Namespace: `rot.main`, `rot.records`, … URLs `/rot/…` |
| Sequelize `Pilot` model | Different schema | Prefix tables/API: `RotPilot`, `/api/rot/pilots` |
| Sequelize v3 vs v6 | ROT uses `import`, `updateAttributes` | Port models to Sequelize 6 patterns |
| ROT `User` | Duplicate auth | Drop; use fraBering users only |
| Bower deps | pdfmake, pdfjs, pdfform, xlsx, etc. | Add per screen as ported |
| File uploads | `dist/` wipe on build | Store under `server/fileserver/rot/` at repo root (see `docs/issues-workflow.md`) |

## Architecture (target)

```
Management ▼
  … Roster, Audit, …
  ROT Home       → /rot           (rot.main)
  Records        → /rot/records
  Evals          → /rot/evals
  SIC Log        → /rot/sic-hours
  Nome (OME)     → /rot/ome
  Kotz (OTZ)     → /rot/otz
  Fileserver     → /rot/files
```

**Shared building blocks:**

- `server/api/rot/` — REST + file routes under `/api/rot/…`
- Reuse fraBering `firebase-admin` (same `brg-flight-report` project); no second `initializeApp`
- `RotPilotContext` Angular service + `<rot-pilot-selector>` directive (replaces `$root.nav.chosenPilot` on main/records/sicHours only — **not** fraBering navbar)

## Phased delivery

### Phase 0 — Decisions (no code)

- [ ] ROT Postgres: same `metar` DB or separate? Table names + row counts.
- [ ] On-disk PDF/record paths on ROT prod (for migration).
- [ ] Access: all `user` vs `admin` for some screens.
- [ ] Is `/xml` still used?
- [ ] Parallel run ROT :58786 until cutover?

### Phase 1 — Server spine (slice 1: evaluations only)

- [x] Sequelize 6 model: `RotEvaluation` → table `RotEvaluations`
- [x] Routes: `/api/rot/evaluations`, `/api/rot/files/{attachments,records,pdfs,fileserver}` (JWT auth)
- [x] Persistent files: `server/fileserver/rot/` (repo root, survives `grunt build`)
- [x] Migration script: `scripts/migrate-rot-evaluations/index.js`
- [x] Import prod `Evaluations` rows + copy attachment PDFs before cutover

### Phase 2 — First UI: Pilot Evals

- [x] `client/app/rot/pilotEvals/`, state `rot.pilotEvals` at `/rot/evals`
- [x] Management → **Pilot Evals**
- [x] Abstract parent state `rot` + prod `grunt build` deploy

### Phase 3 — Pilot selector + SIC Hours

- [x] `RotPilotContext` + `<rot-pilot-selector>` (`client/app/rot/rotPilotContext.service.js`, `rotPilotSelector/`)
- [x] Port `sicHours` → `rot.sicHours` at `/rot/sic-hours`, Management → **SIC Log**
- [x] `queryOr` on `/api/airplanes/firebaseQuery` (PIC/SIC employee lookup)
- [x] `pdfform` vendored in `client/vendor/pdfform/`; `SIC_LOG.pdf` in `server/fileserver/rot/pdfs/`

### Phase 4 — ROT Home + Records

- [x] Port `records` (~1.7k LOC) → `rot.records` at `/rot/records`, Management → **Records**
- [x] ROT Firebase write paths: `/api/rot/updateFirebase`, `/api/rot/deleteFirebase`
- [x] Record file ops: `/api/rot/{listRecords,uploadRecord,changeFilename,deleteRecord}`
- [x] `rotAppConfig` training constants; Modal `radio` + `pilotData`; `rot.main` → records redirect
- [x] PDF templates `ROT.pdf`, `FlightTest.pdf`, `FlightTestINDOC.pdf`, `quarterly.xlsx` in `server/fileserver/rot/pdfs/`
- [ ] Full `main` ROT home dashboard (deferred — use Records as entry point)

### Phase 5 — OME/OTZ + Fileserver

- [x] Unified `rot-pilot-board` component (`client/app/rot/pilotBoard/`) — replaces duplicate OME/OTZ controllers
- [x] `rot.ome` at `/rot/ome` (NOME, split print pages, 85vh grids)
- [x] `rot.otz` at `/rot/otz` (KOTZEBUE, combined layout, 40vh grids)
- [x] Firebase via `/api/rot/firebaseQuery` + `/api/rot/updateFirebase` (no client Firestore REST)
- [x] Management → **Nome (OME)** / **Kotz (OTZ)**
- [x] ROT Fileserver browser at `/rot/files`
- [x] Fileserver API: `/api/rot/{listFileserver,uploadFileserver,deleteFileserver}` + `GET /api/rot/files/fileserver`

### Phase 6 — Decommission standalone ROT

- [x] XML import — **skipped** (unused)
- [x] ROT admin — **skipped** (fraBering user admin)
- [ ] Stop standalone ROT `:58786` on bering-prod — `docs/rot-decommission.md`
- [ ] Nightly backup: `ROT_BACKUP_SOURCE=frabering` in `/etc/bering/rot-backup.env`
- [ ] Team uses Management → ROT links on frat.beringair.com only

## Auth migration

**Remove:** Firebase `signInWithEmailAndPassword` in ROT `index.html`, ROT User model, ROT login/signup.

**Keep:** Firestore via server-side admin SDK (same as fraBering status/roster patterns).

## Open questions

1. Access control — all users or admin-only for some ROT screens?
2. Is ROT Postgres already on `metar`?
3. Cutover strategy — parallel vs hard switch?
4. Screen priority if not Evals-first?
5. XML route still needed?

## References

- ROT agent guide: `~/ROT/AGENTS.md`
- ROT decommission runbook: `docs/rot-decommission.md`
- fraBering roster Postgres pattern: `docs/roster-postgres.md`
- Issue attachment storage (repo-root fileserver): `docs/issues-workflow.md`
