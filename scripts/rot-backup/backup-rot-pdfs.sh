#!/usr/bin/env bash
#
# Daily ROT document backup — run on bering-prod (cron).
# Creates rot-docs-YYYY-MM-DD.tar.gz, copies to bering-vultr and bering-dev,
# prunes to PROD_KEEP_COUNT on prod and REMOTE_KEEP_COUNT on each remote.
#
# See docs/rot-backup-restore.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROT_BACKUP_ENV:-/etc/bering/rot-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

ROT_SERVER_ROOT="${ROT_SERVER_ROOT:-$HOME/ROT/server}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rot}"
PROD_KEEP_COUNT="${PROD_KEEP_COUNT:-1}"
REMOTE_KEEP_COUNT="${REMOTE_KEEP_COUNT:-3}"
MIN_FREE_GB="${MIN_FREE_GB:-15}"
REMOTE_HOSTS="${REMOTE_HOSTS:-bering-vultr bering-dev}"
REMOTE_DIR="${REMOTE_DIR:-/var/backups/rot}"
REMOTE_USER="${REMOTE_USER:-$USER}"
DATE_TAG="$(date +%Y-%m-%d)"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORKDIR="${BACKUP_DIR}/.work-${STAMP}"
TAR_NAME="rot-docs-${DATE_TAG}.tar.gz"
TAR_PATH="${BACKUP_DIR}/${TAR_NAME}"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  if [[ -n "${ALERT_EMAIL:-}" ]] && command -v mail >/dev/null 2>&1; then
    echo "$*" | mail -s "ROT backup failed on $(hostname)" "$ALERT_EMAIL" || true
  fi
  exit 1
}

free_gb() {
  df -BG "$BACKUP_DIR" 2>/dev/null | awk 'NR==2 {gsub(/G/,"",$4); print $4}'
}

prune_keep_count() {
  local dir="$1"
  local keep="$2"
  local label="$3"
  local to_delete
  to_delete="$(ls -1t "$dir"/rot-docs-*.tar.gz 2>/dev/null | tail -n +$((keep + 1)) || true)"
  if [[ -z "$to_delete" ]]; then
    log "${label}: nothing to prune (keep ${keep} newest)"
    return
  fi
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    log "${label}: pruning $f"
    rm -f "$f"
  done <<< "$to_delete"
}

prune_remote() {
  local host="$1"
  log "Pruning remote ${host}:${REMOTE_DIR} (keep ${REMOTE_KEEP_COUNT} newest)"
  ssh "${REMOTE_USER}@${host}" "mkdir -p '${REMOTE_DIR}' && ls -1t '${REMOTE_DIR}'/rot-docs-*.tar.gz 2>/dev/null | tail -n +$((REMOTE_KEEP_COUNT + 1)) | xargs -r rm -f" \
    || log "WARN: remote prune failed on ${host}"
}

[[ -d "$ROT_SERVER_ROOT" ]] || fail "ROT_SERVER_ROOT not found: $ROT_SERVER_ROOT"

mkdir -p "$BACKUP_DIR" "$WORKDIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

FREE_GB="$(free_gb || echo 0)"
if [[ "$FREE_GB" -lt "$MIN_FREE_GB" ]]; then
  fail "Less than ${MIN_FREE_GB}GB free on ${BACKUP_DIR} (have ${FREE_GB}GB)"
fi

if [[ -f "$TAR_PATH" ]]; then
  log "Today's tarball already exists: $TAR_PATH (skipping create, will still push/prune)"
else
  log "Building ${TAR_NAME} from ${ROT_SERVER_ROOT}"

  # Document paths only — excludes Office ISO, installers, logs (see docs)
  DOC_PATHS=(
    fileserver/attachments
    records
    pdfs
    fileserver/BasicIndoc
    fileserver/Caravan Initial
    fileserver/HAZMAT
  )

  for rel in "${DOC_PATHS[@]}"; do
    src="${ROT_SERVER_ROOT}/${rel}"
    if [[ -e "$src" ]]; then
      mkdir -p "$WORKDIR/$(dirname "$rel")"
      cp -a "$src" "$WORKDIR/$rel"
    else
      log "WARN: missing path (skipped): $src"
    fi
  done

  echo "$DATE_TAG" > "$WORKDIR/BACKUP_DATE.txt"
  hostname > "$WORKDIR/BACKUP_HOST.txt"

  tar -czf "$TAR_PATH" -C "$WORKDIR" .
  rm -rf "$WORKDIR"

  SIZE_MB="$(du -m "$TAR_PATH" | awk '{print $1}')"
  log "Created ${TAR_PATH} (${SIZE_MB} MB)"
fi

for host in $REMOTE_HOSTS; do
  log "Pushing to ${REMOTE_USER}@${host}:${REMOTE_DIR}/"
  ssh "${REMOTE_USER}@${host}" "mkdir -p '${REMOTE_DIR}'"
  rsync -av --partial "${TAR_PATH}" "${REMOTE_USER}@${host}:${REMOTE_DIR}/" \
    || fail "rsync to ${host} failed"
  prune_remote "$host"
done

prune_keep_count "$BACKUP_DIR" "$PROD_KEEP_COUNT" "prod"
log "Backup finished OK"
