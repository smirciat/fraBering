#!/usr/bin/env bash
#
# Switch prod nightly ROT backup to fraBering canonical storage.
# Run on bering-prod after ROT screens are verified on frat.beringair.com.
#
# Usage:
#   ./scripts/rot-decommission/apply-frabering-backup-source.sh --dry-run
#   ./scripts/rot-decommission/apply-frabering-backup-source.sh
#
# See docs/rot-decommission.md

set -euo pipefail

ENV_FILE="${ROT_BACKUP_ENV:-/etc/bering/rot-backup.env}"
FRABERING_ROT_ROOT="${FRABERING_ROT_ROOT:-$HOME/fraBering/server/fileserver/rot}"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      echo "Usage: $0 [--dry-run]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ -d "$FRABERING_ROT_ROOT" ]] || {
  echo "ERROR: FRABERING_ROT_ROOT not found: $FRABERING_ROT_ROOT" >&2
  exit 1
}

apply_kv() {
  local key="$1"
  local val="$2"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: $ENV_FILE not found — copy from scripts/rot-backup/rot-backup.env.sample first" >&2
    exit 1
  fi
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "would update: ${key}=${val}"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
      echo "updated: ${key}=${val}"
    fi
  else
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "would append: ${key}=${val}"
    else
      echo "${key}=${val}" >> "$ENV_FILE"
      echo "appended: ${key}=${val}"
    fi
  fi
}

echo "ROT backup source → fraBering"
echo "  env file: $ENV_FILE"
echo "  root:     $FRABERING_ROT_ROOT"
echo ""

apply_kv "ROT_BACKUP_SOURCE" "frabering"
apply_kv "FRABERING_ROT_ROOT" "$FRABERING_ROT_ROOT"

if [[ "$DRY_RUN" -eq 0 ]]; then
  echo ""
  echo "Test backup:"
  echo "  ROT_BACKUP_ENV=$ENV_FILE ~/fraBering/scripts/rot-backup/backup-rot-pdfs.sh"
fi
