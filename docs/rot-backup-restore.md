# ROT backups and restore

Two separate concerns when moving ROT into fraBering:

| Concern | What it is | When you need it |
|---------|------------|------------------|
| **`ROT_SOURCE_URI`** | Postgres connection to the **old standalone ROT database** | **One-time** import of `Evaluations` rows into fraBering `RotEvaluations` |
| **PDF / document backups** | Tarballs of files on disk (`attachments`, `records`, `pdfs`, training folders) | **Ongoing** — prod → vultr + dev |

They are **not** the same thing. Daily backups do **not** use `ROT_SOURCE_URI`.

---

## `ROT_SOURCE_URI` — database migration only

Used only by:

```bash
node -r babel-register scripts/migrate-rot-evaluations/index.js
```

**What it does:** Connects to the ROT app’s Postgres database (standalone ROT on port 58786) and copies rows from table `"Evaluations"` into fraBering’s `"RotEvaluations"` table in the `metar` database.

**Set in** `server/config/local.env.js` (or env var for one run):

```js
ROT_SOURCE_URI: 'postgres://USER:PASS@localhost:5432/rot_db_name',
```

Find the real URI on **bering-prod** in `~/ROT/server/config/local.env.js` → `SEQUELIZE_URI`.

**After migration:** fraBering reads/writes `RotEvaluations` in `metar` only. You can leave `ROT_SOURCE_URI` unset unless you re-run the import.

**PDF filenames** in `RotEvaluations.filename` must exist on disk under `server/fileserver/rot/attachments/` (or legacy ROT paths until cutover). The migration script does **not** copy files — use the backup/restore flow below.

---

## Document backup strategy (prod → vultr + dev)

### What gets backed up

From `~/ROT/server/` on **bering-prod** (document paths only):

- `fileserver/attachments/` — eval PDFs linked from DB
- `records/`
- `pdfs/`
- `fileserver/BasicIndoc/`
- `fileserver/Caravan Initial/`
- `fileserver/HAZMAT/`

**Excluded** (not training docs): `*.ISO`, `*.exe`, `*.msi`, `*.7z`, logs, scripts.

**Not included:** Postgres — ROT / `metar` DB is backed up separately on dev (and vultr when you add that). PDF tarballs are files only.

### Retention

| Host | Copies kept | Why |
|------|-------------|-----|
| **bering-prod** | **1** | Live files are the source of truth; tar is a convenience copy before push |
| **bering-vultr** | **3** | Off-site if prod is unrecoverable or latest tar is corrupt |
| **bering-dev** | **3** | Same |

At ~10 GB per tar: prod ~10 GB, each remote ~30 GB. Fits your 20–30 GB planning on vultr/dev.

Check prod before first run:

```bash
du -sh ~/ROT/server/fileserver/attachments ~/ROT/server/records ~/ROT/server/pdfs
du -sh ~/ROT/server/fileserver/BasicIndoc ~/ROT/server/fileserver/HAZMAT
df -h /var/backups
```

### Scripts (in repo)

| Script | Run on | Purpose |
|--------|--------|---------|
| `scripts/rot-backup/backup-rot-pdfs.sh` | **bering-prod** (cron) | Create `rot-docs-YYYY-MM-DD.tar.gz`, rsync to vultr + dev, prune by count |
| `scripts/rot-backup/restore-rot-pdfs.sh` | any host | Extract tar into ROT or fraBering layout |
| `scripts/rot-backup/rot-backup.env.sample` | copy to prod | Paths, remotes, retention |

---

## Setup on bering-prod

### 1. SSH keys to backup servers

Prod must rsync to vultr and dev without a password:

```bash
ssh-copy-id bering-vultr
ssh-copy-id bering-dev
ssh bering-vultr 'mkdir -p /var/backups/rot && df -h /var/backups'
ssh bering-dev  'mkdir -p /var/backups/rot && df -h /var/backups'
```

Use `~/.ssh/config` host aliases `bering-vultr` and `bering-dev` (or edit `REMOTE_HOSTS` in config).

### 2. Config

```bash
sudo mkdir -p /etc/bering /var/backups/rot
sudo cp ~/fraBering/scripts/rot-backup/rot-backup.env.sample /etc/bering/rot-backup.env
sudo chmod 600 /etc/bering/rot-backup.env
sudo chown $USER:$USER /var/backups/rot   # or dedicated backup user
```

Edit `/etc/bering/rot-backup.env`:

- `ROT_SERVER_ROOT` — usually `/home/andy/ROT/server`
- `PROD_KEEP_COUNT=1`, `REMOTE_KEEP_COUNT=3`
- `REMOTE_HOSTS`, `REMOTE_DIR`

### 3. Test once manually

```bash
chmod +x ~/fraBering/scripts/rot-backup/*.sh
ROT_BACKUP_ENV=/etc/bering/rot-backup.env ~/fraBering/scripts/rot-backup/backup-rot-pdfs.sh
```

Verify on remotes:

```bash
ssh bering-vultr 'ls -lh /var/backups/rot/rot-docs-*.tar.gz'
ssh bering-dev  'ls -lh /var/backups/rot/rot-docs-*.tar.gz'
```

### 4. Cron (daily, e.g. 02:15 Alaska)

```bash
crontab -e
```

```cron
15 2 * * * ROT_BACKUP_ENV=/etc/bering/rot-backup.env /home/andy/fraBering/scripts/rot-backup/backup-rot-pdfs.sh >> /var/backups/rot/cron.log 2>&1
```

Retention: after each successful push, prod keeps the **1** newest tar; vultr and dev each keep the **3** newest.

---

## Restore from a tarball

### List contents (optional)

```bash
tar -tzf /var/backups/rot/rot-docs-2026-08-14.tar.gz | head
```

### Restore standalone ROT (bering-dev / disaster recovery)

```bash
cd ~/fraBering
./scripts/rot-backup/restore-rot-pdfs.sh \
  /var/backups/rot/rot-docs-2026-08-14.tar.gz \
  --target ~/ROT/server \
  --layout rot
```

Restart ROT pm2 if you use standalone ROT on that host.

### Restore into fraBering (after ROT integration)

```bash
./scripts/rot-backup/restore-rot-pdfs.sh \
  /var/backups/rot/rot-docs-2026-08-14.tar.gz \
  --target ~/fraBering/server/fileserver/rot \
  --layout frabering
```

Then confirm eval PDFs open: Management → Pilot Evals → View Full Eval.

### Restore database

Use your existing Postgres backups on dev/vultr (not the PDF tar). For fraBering `RotEvaluations`, re-run `scripts/migrate-rot-evaluations/index.js` if you still have ROT Postgres, or restore `metar` from your DB backup.

---

## Quick reference

| Question | Answer |
|----------|--------|
| What is `ROT_SOURCE_URI`? | One-time ROT **Postgres** URL for evaluation **rows** import |
| Where do PDFs live in fraBering? | `server/fileserver/rot/` (repo root, not `dist/`) |
| Where are daily backups? | `/var/backups/rot/rot-docs-YYYY-MM-DD.tar.gz` on prod, vultr, dev |
| How long kept? | **1** tar on prod, **3** on vultr and dev (`PROD_KEEP_COUNT`, `REMOTE_KEEP_COUNT`) |
| Recover files? | `scripts/rot-backup/restore-rot-pdfs.sh <tar>` |

See also: `docs/rot-integration-plan.md`, `scripts/migrate-rot-evaluations/index.js`.
