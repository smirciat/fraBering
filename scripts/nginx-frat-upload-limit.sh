#!/usr/bin/env bash
# Verify nginx upload limit for frat.beringair.com (issue screenshot paste).
# Edit /etc/nginx/sites-available/default in place — no sudo for the file.
# Reload: sudo nginx -t && sudo systemctl reload nginx
set -euo pipefail

CONF=/etc/nginx/sites-available/default
MARKER='# fraBering issues upload limit'

if grep -q "$MARKER" "$CONF"; then
  echo "OK: client_max_body_size present on frat vhost in $CONF"
  echo "Reload if you changed it: sudo nginx -t && sudo systemctl reload nginx"
  exit 0
fi

echo "Missing in $CONF — add after ssl_ciphers in the frat.beringair.com server block:"
echo "    client_max_body_size 50M; $MARKER"
echo "See resBering docs/runbooks/nginx-prod-smircich.md"
exit 1
