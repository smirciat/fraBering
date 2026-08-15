#!/usr/bin/env bash
#
# Restore ROT documents from a rot-docs-YYYY-MM-DD.tar.gz backup.
# Run on bering-dev, bering-vultr, or bering-prod when recovering files.
#
# Usage:
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz --target ~/ROT/server
#   ./restore-rot-pdfs.sh /var/backups/rot/rot-docs-2026-08-14.tar.gz --target ~/fraBering/server/fileserver/rot --layout frabering
#
# See docs/rot-backup-restore.md

set -euo pipefail

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
  echo "Restoring into fraBering layout: $TARGET_ROOT"
  sync_tree "$WORKDIR/fileserver/attachments" "$TARGET_ROOT/attachments"
  sync_tree "$WORKDIR/records" "$TARGET_ROOT/records"
  sync_tree "$WORKDIR/pdfs" "$TARGET_ROOT/pdfs"
  sync_tree "$WORKDIR/fileserver/BasicIndoc" "$TARGET_ROOT/fileserver/BasicIndoc"
  sync_tree "$WORKDIR/fileserver/Caravan Initial" "$TARGET_ROOT/fileserver/Caravan Initial"
  sync_tree "$WORKDIR/fileserver/HAZMAT" "$TARGET_ROOT/fileserver/HAZMAT"
else
  echo "Restoring into standalone ROT tree: $TARGET_ROOT"
  sync_tree "$WORKDIR/fileserver" "$TARGET_ROOT/fileserver"
  sync_tree "$WORKDIR/records" "$TARGET_ROOT/records"
  sync_tree "$WORKDIR/pdfs" "$TARGET_ROOT/pdfs"
fi

if [[ -f "$WORKDIR/rot-evaluations.dump" ]]; then
  echo ""
  echo "Note: this archive includes a legacy DB dump (older backups only)."
  echo "Use your normal Postgres backup for database recovery."
fi

echo "Restore complete → $TARGET_ROOT"
