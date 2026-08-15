# Decommission standalone ROT (Phase 6)

fraBering is the canonical ROT app. Standalone `~/ROT` on port **58786** can be stopped after prod verification.

**Skipped (not needed):** `/rot/xml` import, ROT admin screen (fraBering already has user admin).

---

## Prerequisites (confirm before stopping ROT)

- [ ] All ROT screens verified on prod: Training Records, Pilot Evals, SIC Log, OME, OTZ, Fileserver
- [ ] Training PDF migration complete (`server/fileserver/rot/{attachments,records,pdfs}`)
- [ ] `RotEvaluations` in `metar` + eval attachments on disk
- [ ] Team notified: use **Management** menu on https://frat.beringair.com (not `:58786`)

---

## Step 1 — Update nightly backup source (bering-prod)

Backups now read from **fraBering**, not `~/ROT/server`.

```bash
sudo nano /etc/bering/rot-backup.env
```

Set (or add):

```bash
ROT_BACKUP_SOURCE=frabering
FRABERING_ROT_ROOT=/home/andy/fraBering/server/fileserver/rot
# Legacy — no longer used when ROT_BACKUP_SOURCE=frabering:
# ROT_SERVER_ROOT=/home/andy/ROT/server
```

Test manually:

```bash
cd ~/fraBering
ROT_BACKUP_ENV=/etc/bering/rot-backup.env \
  scripts/rot-backup/backup-rot-pdfs.sh
```

Verify tarball contents (legacy tar layout for restore compat):

```bash
tar -tzf /var/backups/rot/rot-docs-$(date +%Y-%m-%d).tar.gz | head -20
# expect: fileserver/attachments/..., records/..., pdfs/...
```

Cron line is unchanged — it sources `/etc/bering/rot-backup.env`.

---

## Step 2 — Stop standalone ROT (bering-prod)

Identify how ROT runs:

```bash
pm2 list
ss -tlnp | grep 58786
```

Common cases:

```bash
# pm2
pm2 stop rot
pm2 save

# or named differently
pm2 list | grep -i rot
```

If not pm2, check systemd:

```bash
systemctl --user list-units | grep -i rot
sudo systemctl list-units | grep -i rot
```

**Verify port closed:**

```bash
ss -tlnp | grep 58786    # should return nothing
curl -s -o /dev/null -w "%{http_code}" http://localhost:58786/   # should fail
```

---

## Step 3 — Optional reverse-proxy / firewall

If nginx or Apache forwards `:58786`, remove or comment that vhost and reload.

If external DNS/bookmarks point at `:58786`, update team docs to `https://frat.beringair.com/rot/records` (etc.).

---

## Step 4 — Keep `~/ROT` as archive (recommended)

Do **not** delete `~/ROT` immediately. Leave the tree for 30–90 days as read-only fallback.

Optional — disable accidental restart:

```bash
# pm2: already stopped + saved
# rename entry point so a stray `npm start` fails obviously:
mv ~/ROT/server/app.js ~/ROT/server/app.js.stopped-$(date +%Y%m%d) 2>/dev/null || true
```

Nightly backups from fraBering continue; vultr/dev retention unchanged.

---

## Step 5 — Smoke test after stop

| URL | Check |
|-----|-------|
| `/rot/records` | Cold load (direct URL), pilot data + PDFs |
| `/rot/evals` | Open eval PDF |
| `/rot/sic-hours` | Form loads |
| `/rot/ome`, `/rot/otz` | Pilot boards |
| `:58786` | Unreachable |

---

## Rollback (if needed)

```bash
cd ~/ROT
pm2 start ...   # your prior pm2 ecosystem or start command
```

Restore fraBering backup env:

```bash
ROT_BACKUP_SOURCE=standalone
ROT_SERVER_ROOT=/home/andy/ROT/server
```

---

## Related

- `docs/rot-backup-restore.md` — backup/restore details
- `docs/rot-integration-plan.md` — integration progress
- `scripts/rot-backup/backup-rot-pdfs.sh` — nightly backup script
- `scripts/migrate-rot-training-docs/` — one-time migration (historical)
