#!/usr/bin/env bash
#
# Daily ROT document backup — run on bering-prod (cron).
# Creates rot-docs-YYYY-MM-DD.tar.gz, copies to bering-vultr and bering-dev,
# prunes to PROD_KEEP_COUNT on prod; per-remote counts via REMOTE_KEEP_COUNTS.
#
# See docs/rot-backup-restore.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATHS_FILE="${ROT_TRAINING_PATHS_FILE:-$SCRIPT_DIR/rot-training-doc-paths.sh}"
ENV_FILE="${ROT_BACKUP_ENV:-/etc/bering/rot-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

# Cron runs with minimal env — set HOME before anything else uses it
export HOME="${BACKUP_HOME:-${HOME:-}}"
if [[ -z "$HOME" || "$HOME" == "/" ]]; then
  echo "ERROR: set BACKUP_HOME=/home/andy in $ENV_FILE" >&2
  exit 1
fi

SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE:-$HOME/.ssh/bering_backup}"
SSH_WRAPPER="${SSH_WRAPPER:-$SCRIPT_DIR/rot-backup-ssh.sh}"
export ROT_BACKUP_ENV="$ENV_FILE"

ROT_SERVER_ROOT="${ROT_SERVER_ROOT:-$HOME/ROT/server}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rot}"
PROD_KEEP_COUNT="${PROD_KEEP_COUNT:-1}"
REMOTE_KEEP_COUNT="${REMOTE_KEEP_COUNT:-3}"
REMOTE_KEEP_COUNTS="${REMOTE_KEEP_COUNTS:-}"
MIN_FREE_GB="${MIN_FREE_GB:-15}"
REMOTE_HOSTS="${REMOTE_HOSTS:-bering-vultr bering-dev}"
REMOTE_DIR="${REMOTE_DIR:-/var/backups/rot}"
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

remote_keep_count() {
  local host="$1"
  local idx="${2:-0}"
  if [[ -n "$REMOTE_KEEP_COUNTS" ]]; then
    local -a keeps
    read -ra keeps <<< "$REMOTE_KEEP_COUNTS"
    if [[ -n "${keeps[$idx]:-}" ]]; then
      echo "${keeps[$idx]}"
      return
    fi
  fi
  echo "$REMOTE_KEEP_COUNT"
}

[[ -x "$SSH_WRAPPER" ]] || chmod +x "$SSH_WRAPPER"
[[ -f "$SSH_CONFIG" ]] || fail "SSH_CONFIG not found: $SSH_CONFIG"
[[ -f "$SSH_IDENTITY_FILE" ]] || fail "SSH_IDENTITY_FILE not found: $SSH_IDENTITY_FILE"

ssh_remote() {
  local host="$1"
  shift
  "$SSH_WRAPPER" "$host" "$@"
}

rsync_remote() {
  local host="$1"
  rsync -av --partial -e "$SSH_WRAPPER" "${TAR_PATH}" "${host}:${REMOTE_DIR}/"
}

prune_remote() {
  local host="$1"
  local keep="$2"
  log "Pruning remote ${host}:${REMOTE_DIR} (keep ${keep} newest)"
  ssh_remote "$host" \
    "mkdir -p '${REMOTE_DIR}' && ls -1t '${REMOTE_DIR}'/rot-docs-*.tar.gz 2>/dev/null | tail -n +$((keep + 1)) | xargs -r rm -f" \
    || log "WARN: remote prune failed on ${host}"
}

[[ -d "$ROT_SERVER_ROOT" ]] || fail "ROT_SERVER_ROOT not found: $ROT_SERVER_ROOT"

mkdir -p "$BACKUP_DIR" "$WORKDIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

log "SSH wrapper=$SSH_WRAPPER HOME=$HOME key=$SSH_IDENTITY_FILE"

FREE_GB="$(free_gb || echo 0)"
if [[ "$FREE_GB" -lt "$MIN_FREE_GB" ]]; then
  fail "Less than ${MIN_FREE_GB}GB free on ${BACKUP_DIR} (have ${FREE_GB}GB)"
fi

if [[ -f "$TAR_PATH" ]]; then
  log "Today's tarball already exists: $TAR_PATH (skipping create, will still push/prune)"
else
  log "Building ${TAR_NAME} from ${ROT_SERVER_ROOT} (training PDFs only)"

  [[ -f "$PATHS_FILE" ]] || fail "Path map not found: $PATHS_FILE"
  # shellcheck source=/dev/null
  source "$PATHS_FILE"

  for rel in "${ROT_TRAINING_SOURCE_PATHS[@]}"; do
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

host_idx=0
for host in $REMOTE_HOSTS; do
  remote_keep="$(remote_keep_count "$host" "$host_idx")"
  log "Pushing to ${host}:${REMOTE_DIR}/ (keep ${remote_keep} on remote)"
  ssh_remote "$host" "mkdir -p '${REMOTE_DIR}'"
  rsync_remote "$host" || fail "rsync to ${host} failed"
  prune_remote "$host" "$remote_keep"
  host_idx=$((host_idx + 1))
done

prune_keep_count "$BACKUP_DIR" "$PROD_KEEP_COUNT" "prod"
log "Backup finished OK"
