# ROT → fraBering integration plan (#10)

_Preliminary planning — not started in code. Regenerate context from `~/ROT` and this doc before implementation._

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
- [ ] Import prod `Evaluations` rows + copy attachment PDFs before cutover

### Phase 2 — First UI: Pilot Evals

- [x] `client/app/rot/pilotEvals/`, state `rot.pilotEvals` at `/rot/evals`
- [x] Management → **Pilot Evals**

### Phase 3 — Pilot selector + SIC Hours

- `RotPilotContext` + `<rot-pilot-selector>`; port `sicHours`.

### Phase 4 — ROT Home + Records

- Port `main` (~1k LOC) and `records` (~1.7k LOC); PDF bower deps.

### Phase 5 — OME/OTZ + Fileserver

### Phase 6 — XML, ROT admin, decommission standalone ROT

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
- **ROT PDF backups & `ROT_SOURCE_URI` explained:** `docs/rot-backup-restore.md`
- fraBering roster Postgres pattern: `docs/roster-postgres.md`
- Issue attachment storage (repo-root fileserver): `docs/issues-workflow.md`
