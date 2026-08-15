#!/usr/bin/env bash
#
# Copy critical ROT training PDFs from standalone ROT into fraBering.
# Safe to re-run (rsync merge; does not delete destination files).
#
# Usage (on prod host, after code deploy):
#   ./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh --dry-run
#   ./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh
#
#   ROT_MIGRATE_ENV=/etc/bering/rot-migrate.env \
#     ./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh
#
# See docs/rot-backup-restore.md — "Prod cutover"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATHS_FILE="${ROT_TRAINING_PATHS_FILE:-$SCRIPT_DIR/../rot-backup/rot-training-doc-paths.sh}"
ENV_FILE="${ROT_MIGRATE_ENV:-}"

DRY_RUN=0
SOURCE_ROOT=""
TARGET_ROOT=""

usage() {
  cat <<'EOF'
Usage: migrate-rot-training-docs.sh [options]

Copy ROT training PDFs (attachments, records, pdfs) into fraBering server/fileserver/rot/.

Options:
  --source DIR   Standalone ROT server root (default: ~/ROT/server)
  --target DIR   fraBering rot storage root (default: ~/fraBering/server/fileserver/rot)
  --dry-run      Show rsync plan without copying
  -h, --help     This help

Environment:
  ROT_MIGRATE_ENV   Optional env file (ROT_SOURCE_ROOT, FRABERING_ROT_ROOT)
  ROT_TRAINING_PATHS_FILE  Override path map (default: scripts/rot-backup/rot-training-doc-paths.sh)

Examples:
  ./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh --dry-run
  ROT_MIGRATE_ENV=/etc/bering/rot-migrate.env ./scripts/migrate-rot-training-docs/migrate-rot-training-docs.sh
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE_ROOT="$2"; shift 2 ;;
    --target) TARGET_ROOT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

load_env_file() {
  local f="$1"
  [[ -n "$f" ]] || return 0
  if [[ ! -f "$f" ]]; then
    echo "ERROR: env file not found: $f" >&2
    exit 1
  fi
  if [[ ! -r "$f" ]]; then
    echo "ERROR: cannot read $f" >&2
    echo "  sudo chown \$USER:\$USER $f   # after sudo cp, file is root-owned" >&2
    echo "  Or omit ROT_MIGRATE_ENV and use defaults / --source / --target" >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$f"
}

load_env_file "$ENV_FILE"

[[ -f "$PATHS_FILE" ]] || { echo "Path map not found: $PATHS_FILE" >&2; exit 1; }
# shellcheck source=/dev/null
source "$PATHS_FILE"

SOURCE_ROOT="${SOURCE_ROOT:-${ROT_SOURCE_ROOT:-$HOME/ROT/server}}"
TARGET_ROOT="${TARGET_ROOT:-${FRABERING_ROT_ROOT:-$HOME/fraBering/server/fileserver/rot}}"

[[ -d "$SOURCE_ROOT" ]] || { echo "ROT source not found: $SOURCE_ROOT" >&2; exit 1; }

mkdir -p "$TARGET_ROOT"

RSYNC_FLAGS=(-a --human-readable)
if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_FLAGS+=(--dry-run -v)
  echo "DRY RUN — no files will be copied"
fi

echo "ROT training docs migration"
echo "  source: $SOURCE_ROOT"
echo "  target: $TARGET_ROOT"
echo ""

copied=0
skipped=0

for pair in "${ROT_TRAINING_FRABERING_MAP[@]}"; do
  src_rel="${pair%%:*}"
  dest_rel="${pair##*:}"
  src="${SOURCE_ROOT}/${src_rel}"
  dest="${TARGET_ROOT}/${dest_rel}"

  if [[ ! -e "$src" ]]; then
    echo "  SKIP (missing): $src_rel"
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$dest"
  echo "  rsync ${src_rel}/ → ${dest_rel}/"
  rsync "${RSYNC_FLAGS[@]}" "${src}/" "${dest}/"
  copied=$((copied + 1))
done

echo ""
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete ($copied path(s) would sync, $skipped missing)."
else
  echo "Migration complete ($copied path(s) synced, $skipped missing)."
  echo ""
  echo "Verify:"
  echo "  du -sh ${TARGET_ROOT}/attachments ${TARGET_ROOT}/records ${TARGET_ROOT}/pdfs"
  echo "  # Pilot Evals → open a known eval PDF"
  echo "  # Records → list/download a known record file"
fi
