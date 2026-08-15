#!/usr/bin/env bash
# Permanent 301: tr.beringair.com → frat.beringair.com (same path; / → /rot/records)
# Run on prod: sudo bash scripts/nginx-tr-to-frat-redirect.sh

set -euo pipefail

NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/default}"
REAL_SITE="$(readlink -f "$NGINX_SITE")"

if [[ ! -f "$REAL_SITE" ]]; then
  echo "Missing $REAL_SITE (from $NGINX_SITE)" >&2
  exit 1
fi

BACKUP_DIR="/etc/nginx/backups"
mkdir -p "$BACKUP_DIR"
BACKUP="${BACKUP_DIR}/default.bak-tr-redirect-$(date +%Y%m%d%H%M%S)"
cp -a "$REAL_SITE" "$BACKUP"
echo "Backup: $BACKUP"

python3 - "$REAL_SITE" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

new_block = r'''
server {
    listen 443 ssl;
    server_name tr.beringair.com;

    # SSL Certificate paths
    ssl_certificate /etc/letsencrypt/live/tr.beringair.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/tr.beringair.com/privkey.pem; # managed by Certbot

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # BEGIN tr.beringair.com → frat redirect
    location = / {
        return 301 https://frat.beringair.com/rot/records;
    }
    location / {
        return 301 https://frat.beringair.com$request_uri;
    }
    # END tr.beringair.com → frat redirect
}
'''

pattern = re.compile(
    r"server\s*\{\s*listen 443 ssl;\s*server_name tr\.beringair\.com;.*?\n\}",
    re.DOTALL,
)
if not pattern.search(text):
    raise SystemExit("Could not find tr.beringair.com server block in nginx config")

text = pattern.sub(new_block.strip() + "\n", text, count=1)
path.write_text(text)
print("Updated tr.beringair.com server block in", path)
PY

nginx -t
systemctl reload nginx
echo "OK — test: curl -sI https://tr.beringair.com/rot/records | head -3"
