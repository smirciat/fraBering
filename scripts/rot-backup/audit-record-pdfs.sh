#!/usr/bin/env bash
# Count training-record PDFs per pilot employee number (filename prefix before first _).
#
#   ./scripts/rot-backup/audit-record-pdfs.sh
#   RECORDS_DIR=~/fraBering/server/fileserver/rot/records MIN=10 MAX=30 ./scripts/rot-backup/audit-record-pdfs.sh
#
# Files live under server/fileserver/rot/records/ (same tree nightly backup uses).

set -euo pipefail

ENV_FILE="${ROT_BACKUP_ENV:-/etc/bering/rot-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

RECORDS_DIR="${RECORDS_DIR:-${FRABERING_ROT_ROOT:-$HOME/fraBering/server/fileserver/rot}/records}"
MIN="${MIN:-10}"
MAX="${MAX:-30}"

if [[ ! -d "$RECORDS_DIR" ]]; then
  echo "ERROR: RECORDS_DIR not found: $RECORDS_DIR" >&2
  exit 1
fi

echo "Records dir: $RECORDS_DIR"
echo "Expected PDFs per employee#: about ${MIN}-${MAX} (filename prefix)"
echo ""
printf "%6s  %s\n" "count" "emp#"
printf "%6s  %s\n" "-----" "----"

total_files=0
pilots=0
in_range=0
low=0
high=0

while read -r n emp; do
  [[ -n "$n" ]] || continue
  total_files=$((total_files + n))
  pilots=$((pilots + 1))
  flag=""
  if [[ "$n" -lt "$MIN" ]]; then
    low=$((low + 1))
    flag=" LOW"
  elif [[ "$n" -gt "$MAX" ]]; then
    high=$((high + 1))
    flag=" HIGH"
  else
    in_range=$((in_range + 1))
  fi
  printf "%6d  %s%s\n" "$n" "$emp" "$flag"
done < <(
  find "$RECORDS_DIR" -maxdepth 1 -type f -name '*.pdf' -printf '%f\n' \
    | sed 's/_.*//' \
    | sort \
    | uniq -c \
    | awk '{print $1, $2}'
)

echo ""
echo "Summary: ${pilots} employee# with PDFs, ${total_files} files total"
echo "  in range ${MIN}-${MAX}: ${in_range}"
echo "  below ${MIN}: ${low}"
echo "  above ${MAX}: ${high}"
echo ""
echo "Note: ROT Records UI lists files where name starts with pilot._id (employee number)."
