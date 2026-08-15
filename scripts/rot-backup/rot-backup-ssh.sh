#!/usr/bin/env bash
# SSH wrapper for rot-backup rsync/ssh — same flags as manual test that works.
# rsync -e /path/to/rot-backup-ssh.sh ...

ENV_FILE="${ROT_BACKUP_ENV:-/etc/bering/rot-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

export HOME="${BACKUP_HOME:-${HOME:-/home/andy}}"
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config}"
SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE:-$HOME/.ssh/bering_backup}"

if [[ ! -f "$SSH_CONFIG" ]]; then
  echo "rot-backup-ssh: missing SSH_CONFIG $SSH_CONFIG" >&2
  exit 1
fi
if [[ ! -f "$SSH_IDENTITY_FILE" ]]; then
  echo "rot-backup-ssh: missing SSH_IDENTITY_FILE $SSH_IDENTITY_FILE" >&2
  exit 1
fi

exec ssh \
  -F "$SSH_CONFIG" \
  -i "$SSH_IDENTITY_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  "$@"
