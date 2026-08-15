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
| **bering-dev** | **1** | Latest copy for restore (~27 GB free; one ~10 GB tar fits) |

Set in `/etc/bering/rot-backup.env`:

```bash
BACKUP_HOME=/home/andy
SSH_CONFIG=/home/andy/.ssh/config
SSH_IDENTITY_FILE=/home/andy/.ssh/bering_backup
REMOTE_HOSTS="bering-vultr bering-dev"
REMOTE_KEEP_COUNTS="3 1"
# Do not set REMOTE_USER if User is already in ~/.ssh/config for each Host
```

**Cron note:** Cron does not load your login shell. Without `BACKUP_HOME` and `SSH_CONFIG`, SSH ignores `~/.ssh/config` and falls back to **password** (or hangs). The backup script now sets these explicitly and uses `BatchMode=yes` so it fails fast instead of prompting.

At ~10 GB per tar: prod ~10 GB, vultr ~30 GB, dev ~10 GB.

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

## What you do — full walkthrough

This section is the operator checklist: what to run on each machine, in order, and what “good” looks like.

### Overview (what happens every night)

1. **bering-prod** (cron, ~02:15) runs `backup-rot-pdfs.sh`.
2. Script copies document folders from `~/ROT/server/` into a temp dir (not the whole 1.2 GB junk fileserver — only training/eval paths).
3. Script builds **`/var/backups/rot/rot-docs-YYYY-MM-DD.tar.gz`** (~10 GB on prod).
4. Script **rsync**s that file to **bering-vultr** and **bering-dev** → `/var/backups/rot/`.
5. Script **deletes old tars**:
   - prod: keep **1** newest
   - vultr: keep **3** newest
   - dev: keep **1** newest
6. Log append: `/var/backups/rot/backup.log` and `cron.log`.

Nothing touches Postgres. DB backups stay your existing dev/vultr Postgres process.

---

### Prerequisites (all hosts)

| Requirement | Where |
|-------------|--------|
| `fraBering` repo with `scripts/rot-backup/` | prod (and dev for restore script) |
| `~/ROT/server` with live documents | prod |
| `rsync`, `ssh`, `tar`, `gzip` | prod |
| `/var/backups/rot` writable | prod, vultr, dev |
| **~15 GB free** on prod backup filesystem (script checks `MIN_FREE_GB`) | prod |
| **~30 GB free** on vultr backup dir | vultr |
| **~12 GB free** on dev backup dir (1 tar) | dev |
| Passwordless SSH **prod → vultr** and **prod → dev** | prod `~/.ssh` |

---

### Step 1 — bering-vultr and bering-dev (one-time)

On **each** backup server:

```bash
sudo mkdir -p /var/backups/rot
sudo chown $USER:$USER /var/backups/rot
chmod 700 /var/backups/rot
df -h /var/backups
```

You need **~30 GB** on vultr (3 tars) and **~12 GB** on dev (1 tar).

No cron on vultr/dev — they only **receive** files from prod.

---

You need **~30 GB** on vultr (3 tars) and **~12 GB** on dev (1 tar). Adjust `REMOTE_KEEP_COUNTS` if space is tight.

---

### Step 2 — bering-prod: SSH keys and config (password → key auth)

Cron cannot type passwords. Prod must SSH/rsync to vultr and dev **using a key**, with short host aliases in `~/.ssh/config`.

#### 2a. Create a dedicated backup key (on bering-prod)

Run as the user that owns cron (usually `andy`):

```bash
# Ed25519 key, no passphrase so cron works unattended (or use ssh-agent — see below)
ssh-keygen -t ed25519 -f ~/.ssh/bering_backup -C "andy@bering-prod-rot-backup" -N ""
chmod 600 ~/.ssh/bering_backup
chmod 644 ~/.ssh/bering_backup.pub
```

To use this key in the backup script, set in `/etc/bering/rot-backup.env` (required for cron):

```bash
BACKUP_HOME=/home/andy
SSH_CONFIG=/home/andy/.ssh/config
SSH_IDENTITY_FILE=/home/andy/.ssh/bering_backup
```

#### 2b. SSH config on bering-prod

Edit `~/.ssh/config` (create if missing):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/config
```

Add (replace `HostName` with real IPs or DNS names you use today when you `ssh` with password):

```
# --- ROT backup targets (from bering-prod) ---
Host bering-vultr
    HostName 203.0.113.10
    User andy
    IdentityFile ~/.ssh/bering_backup
    IdentitiesOnly yes

Host bering-dev
    HostName 203.0.113.20
    User andy
    IdentityFile ~/.ssh/bering_backup
    IdentitiesOnly yes
```

```bash
chmod 600 ~/.ssh/config
```

**Finding HostName:** On prod, if you currently run `ssh andy@some.ip` with a password, use that IP/hostname. Or from vultr dashboard / dev machine: `hostname -I`.

**IdentitiesOnly yes** stops SSH from trying every key in the agent and getting “too many authentication failures”.

#### 2c. Install public key on vultr and dev (one-time per host)

From **bering-prod**, for each remote:

```bash
# Copies ~/.ssh/bering_backup.pub → remote ~/.ssh/authorized_keys
ssh-copy-id -i ~/.ssh/bering_backup.pub bering-vultr
ssh-copy-id -i ~/.ssh/bering_backup.pub bering-dev
```

You will be prompted for the **remote password** this last time. After that, only the key is used.

If `ssh-copy-id` is missing, do it manually on each remote:

```bash
# On bering-prod — show the public key
cat ~/.ssh/bering_backup.pub
```

On **bering-vultr** and **bering-dev** (logged in with password):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the single line from bering_backup.pub, save
chmod 600 ~/.ssh/authorized_keys
```

#### 2d. Test key login (must NOT ask for password)

On **bering-prod**:

```bash
ssh -i ~/.ssh/bering_backup bering-vultr 'hostname; whoami; ls -la /var/backups/rot'
ssh -i ~/.ssh/bering_backup bering-dev  'hostname; whoami; ls -la /var/backups/rot'
```

Or using config aliases only:

```bash
ssh bering-vultr 'hostname'
ssh bering-dev  'hostname'
```

**Good:** command runs with no password prompt.  
**Bad:** `Permission denied (publickey,password)` — key not in `authorized_keys`, wrong `User`, or wrong `HostName`.

Verbose debug:

```bash
ssh -v bering-vultr
```

Look for `Offering public key` and `Authentication succeeded`.

#### 2e. Optional: key with passphrase + cron

If you prefer a passphrase on the key, cron needs `ssh-agent` with key loaded at boot — more moving parts. For unattended backup, a **dedicated key with no passphrase** limited to `andy` on backup hosts is the usual tradeoff.

#### 2f. Remote user

If remotes use a different login than prod, set `REMOTE_USER` in `/etc/bering/rot-backup.env` and match `User` in each `Host` block.

---

### Step 3 — bering-prod: backup config file (one-time)

```bash
sudo mkdir -p /etc/bering
sudo mkdir -p /var/backups/rot
sudo chown $USER:$USER /var/backups/rot

cd ~/fraBering
cp scripts/rot-backup/rot-backup.env.sample /etc/bering/rot-backup.env
chmod 600 /etc/bering/rot-backup.env
```

Edit `/etc/bering/rot-backup.env`:

```bash
nano /etc/bering/rot-backup.env
```

| Variable | Typical value | Notes |
|----------|---------------|--------|
| `ROT_SERVER_ROOT` | `/home/andy/ROT/server` | Must exist; where ROT stores PDFs today |
| `BACKUP_DIR` | `/var/backups/rot` | Where prod writes the tar before push |
| `PROD_KEEP_COUNT` | `1` | One tar on prod |
| `REMOTE_HOSTS` | `bering-vultr bering-dev` | Order matters |
| `REMOTE_KEEP_COUNTS` | `3 1` | vultr keeps 3, dev keeps 1 |
| `SSH_IDENTITY_FILE` | `/home/andy/.ssh/bering_backup` | Optional; matches SSH config |
| `REMOTE_DIR` | `/var/backups/rot` | Same path on both remotes |

**Do not** put secrets in this file for DB — PDF backup does not use Postgres.

---

### Step 4 — bering-prod: size check before first run (one-time)

```bash
du -sh ~/ROT/server/fileserver/attachments \
       ~/ROT/server/records \
       ~/ROT/server/pdfs \
       ~/ROT/server/fileserver/BasicIndoc \
       ~/ROT/server/fileserver/"Caravan Initial" \
       ~/ROT/server/fileserver/HAZMAT

df -h /var/backups
```

Note the total — that’s roughly one tar’s size. If it’s much larger than `MIN_FREE_GB`, increase `MIN_FREE_GB` in the env file.

---

### Step 5 — bering-prod: first manual backup (one-time test)

```bash
cd ~/fraBering
chmod +x scripts/rot-backup/*.sh

ROT_BACKUP_ENV=/etc/bering/rot-backup.env \
  scripts/rot-backup/backup-rot-pdfs.sh
```

**Expect:** 10–30+ minutes depending on size and network. Log lines like:

- `Building rot-docs-2026-08-14.tar.gz from /home/andy/ROT/server`
- `Created /var/backups/rot/rot-docs-....tar.gz (XXXX MB)`
- `Pushing to andy@bering-vultr:/var/backups/rot/`
- `Pushing to andy@bering-dev:/var/backups/rot/`
- `Backup finished OK`

**Verify prod:**

```bash
ls -lh /var/backups/rot/rot-docs-*.tar.gz
tail -20 /var/backups/rot/backup.log
```

**Verify remotes:**

```bash
ssh bering-vultr 'ls -lh /var/backups/rot/'
ssh bering-dev  'ls -lh /var/backups/rot/'
```

Each remote should show the same dated tar (same file size as prod).

**Optional — spot-check tar contents:**

```bash
tar -tzf /var/backups/rot/rot-docs-$(date +%Y-%m-%d).tar.gz | head -30
```

You should see paths like `fileserver/attachments/...`, `records/...`, `pdfs/...`, not `.ISO` or `.exe`.

---

### Step 6 — bering-prod: install cron (one-time)

```bash
crontab -e
```

Add (adjust path/user if needed):

```cron
# ROT PDF backup — daily 02:15 Alaska (cron uses server local TZ)
15 2 * * * ROT_BACKUP_ENV=/etc/bering/rot-backup.env /home/andy/fraBering/scripts/rot-backup/backup-rot-pdfs.sh >> /var/backups/rot/cron.log 2>&1
```

Confirm:

```bash
crontab -l | grep rot-backup
```

---

### Step 7 — ongoing: what you check (weekly or after deploys)

```bash
# On prod — last run succeeded?
tail -30 /var/backups/rot/cron.log
tail -5 /var/backups/rot/backup.log

# Newest tar exists and is recent?
ls -lt /var/backups/rot/rot-docs-*.tar.gz | head -3

# Remotes still have copies?
ssh bering-vultr 'ls -lt /var/backups/rot/rot-docs-*.tar.gz | head -5'
ssh bering-dev  'ls -lt /var/backups/rot/rot-docs-*.tar.gz | head -5'
```

After **3+ daily runs**, vultr should show up to **3** files; dev and prod should show **1** each.

---

### SSH troubleshooting

| Symptom | Fix |
|---------|-----|
| `Permission denied (publickey)` | Re-run `ssh-copy-id -i ~/.ssh/bering_backup.pub bering-vultr`; check `authorized_keys` perms (600) |
| Still prompts for password | Cron: add `BACKUP_HOME`, `SSH_CONFIG`, `SSH_IDENTITY_FILE` to rot-backup.env; test with `env -i HOME=/home/andy ssh -F /home/andy/.ssh/config bering-vultr hostname` |
| Works in shell, fails in cron | Cron missing `BACKUP_HOME` — SSH can't find config |
| `Could not resolve hostname bering-vultr` | Fix `HostName` in `~/.ssh/config` |
| `Too many authentication failures` | Add `IdentitiesOnly yes` under each Host |
| `rsync: connection unexpectedly closed` | Test `ssh bering-vultr` first; check firewall allows SSH from prod IP |
| Works interactively, cron fails | Cron uses minimal env — use full paths in crontab and `SSH_IDENTITY_FILE` in rot-backup.env |

---

### Step 8 — when fraBering ROT integration is live

PDFs for Pilot Evals will live under **`~/fraBering/server/fileserver/rot/`** (not `dist/`).

Until cutover, backups still read **`~/ROT/server`** (`ROT_SERVER_ROOT`). When you move files to fraBering:

1. Update `ROT_SERVER_ROOT` or add a second backup path (future script change), **or**
2. Keep copying/syncing ROT → fraBering rot dir and back up from whichever is canonical.

Restore into fraBering layout:

```bash
cd ~/fraBering
./scripts/rot-backup/restore-rot-pdfs.sh \
  /var/backups/rot/rot-docs-YYYY-MM-DD.tar.gz \
  --target ~/fraBering/server/fileserver/rot \
  --layout frabering
```

---

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `ROT_SERVER_ROOT not found` | Wrong path in env | Fix `ROT_SERVER_ROOT` in `/etc/bering/rot-backup.env` |
| `Less than MIN_FREE_GB free` | Disk full on prod | `df -h`, clean space, or raise `MIN_FREE_GB` |
| `rsync to bering-vultr failed` | SSH key / host alias | `ssh bering-vultr`, fix `~/.ssh/config`, `ssh-copy-id` |
| Today's tar already exists | Re-ran same day | Normal — script skips rebuild, still pushes/prunes |
| `WARN: missing path (skipped)` | Folder empty or not on prod | OK if that section unused; create dir if needed |
| Eval PDF 404 in fraBering | File not in rot dir | Restore tar or fix `filename` in `RotEvaluations` |

---

## Setup on bering-prod (short checklist)

Same steps as **What you do** above, condensed:

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
- `PROD_KEEP_COUNT=1`, `REMOTE_KEEP_COUNTS="3 1"`
- `REMOTE_HOSTS`, `REMOTE_DIR`, optional `SSH_IDENTITY_FILE`

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

Retention: prod **1** tar; vultr **3**; dev **1** (see `REMOTE_KEEP_COUNTS`).

---

## Restore from a tarball (expanded)

Use the **newest good** tar if the latest might be corrupt — on vultr/dev you have **3** to choose from:

```bash
ssh bering-dev 'ls -lt /var/backups/rot/rot-docs-*.tar.gz'
```

Pick a date, copy locally if needed:

```bash
# Example: restore on bering-dev from local backup copy
scp bering-vultr:/var/backups/rot/rot-docs-2026-08-12.tar.gz /tmp/
```

### List contents (optional)

```bash
tar -tzf /var/backups/rot/rot-docs-2026-08-14.tar.gz | head
```

### Restore standalone ROT (bering-dev / disaster recovery)

**When:** prod disk lost; you need standalone ROT running again from backup.

```bash
cd ~/fraBering
./scripts/rot-backup/restore-rot-pdfs.sh \
  /var/backups/rot/rot-docs-2026-08-14.tar.gz \
  --target ~/ROT/server \
  --layout rot
```

This merges tar contents into `~/ROT/server/fileserver/`, `records/`, `pdfs/` without deleting unrelated files already there.

Then:

```bash
# If ROT runs under pm2 on this host:
pm2 restart rot   # or your ROT process name
```

Open ROT in browser and spot-check a known eval PDF.

### Restore into fraBering (after ROT integration)

**When:** prod fraBering `server/fileserver/rot/` is missing or corrupt; DB rows exist but PDFs don’t open.

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
| How long kept? | **1** prod, **3** vultr, **1** dev (`REMOTE_KEEP_COUNTS="3 1"`) |
| Recover files? | `scripts/rot-backup/restore-rot-pdfs.sh <tar>` |

See also: `docs/rot-integration-plan.md`, `scripts/migrate-rot-evaluations/index.js`.
