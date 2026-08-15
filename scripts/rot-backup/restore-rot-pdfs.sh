#!/usr/bin/env bash
#
# Restore ROT training-document PDFs from a rot-docs-YYYY-MM-DD.tar.gz backup.
# Run on bering-dev, bering-vultr, or bering-prod when recovering files.
#
# Scope: attachments, records, pdfs only (not general fileserver browser files).
#
# Usage:
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz --target ~/ROT/server
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz --target ~/fraBering/server/fileserver/rot --layout frabering
#
# See docs/rot-backup-restore.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATHS_FILE="${ROT_TRAINING_PATHS_FILE:-$SCRIPT_DIR/rot-training-doc-paths.sh}"

TAR_FILE=""
TARGET_ROOT=""
LAYOUT="rot"   # rot | frabering

usage() {
  echo "Usage: $0 <rot-docs-YYYY-MM-DD.tar.gz> [--target DIR] [--layout rot|frabering]"
  exit 1
}

[[ $# -ge 1 ]] || usage
TAR_FILE="$1"
shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET_ROOT="$2"; shift 2 ;;
    --layout) LAYOUT="$2"; shift 2 ;;
    *) usage ;;
  esac
done

[[ -f "$TAR_FILE" ]] || { echo "Tar not found: $TAR_FILE"; exit 1; }
[[ -f "$PATHS_FILE" ]] || { echo "Path map not found: $PATHS_FILE" >&2; exit 1; }
# shellcheck source=/dev/null
source "$PATHS_FILE"

if [[ -z "$TARGET_ROOT" ]]; then
  if [[ "$LAYOUT" == "frabering" ]]; then
    TARGET_ROOT="$HOME/fraBering/server/fileserver/rot"
  else
    TARGET_ROOT="$HOME/ROT/server"
  fi
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Extracting $TAR_FILE ..."
tar -xzf "$TAR_FILE" -C "$WORKDIR"

sync_tree() {
  local src="$1"
  local dest="$2"
  if [[ -d "$src" ]]; then
    mkdir -p "$dest"
    rsync -a "$src/" "$dest/"
    echo "  restored $dest"
  fi
}

if [[ "$LAYOUT" == "frabering" ]]; then
  echo "Restoring training PDFs into fraBering layout: $TARGET_ROOT"
  for pair in "${ROT_TRAINING_FRABERING_MAP[@]}"; do
    src_rel="${pair%%:*}"
    dest_rel="${pair##*:}"
    sync_tree "$WORKDIR/$src_rel" "$TARGET_ROOT/$dest_rel"
  done
else
  echo "Restoring training PDFs into standalone ROT tree: $TARGET_ROOT"
  for rel in "${ROT_TRAINING_SOURCE_PATHS[@]}"; do
    sync_tree "$WORKDIR/$rel" "$TARGET_ROOT/$rel"
  done
fi

if [[ -f "$WORKDIR/rot-evaluations.dump" ]]; then
  echo ""
  echo "Note: this archive includes a legacy DB dump (older backups only)."
  echo "Use your normal Postgres backup for database recovery."
fi

echo "Restore complete → $TARGET_ROOT"
