# nginx: tr.beringair.com → frat.beringair.com (ROT)

Standalone ROT (`localhost:58786`) is decommissioned. ROT lives in **fraBering** at `/rot/*` on **frat.beringair.com**.

**tr.beringair.com** uses a **permanent redirect (301)** so the browser shows `frat.beringair.com` (one host, one login cookie).

| Request | Redirect |
|---------|----------|
| `https://tr.beringair.com/` | `https://frat.beringair.com/rot/records` |
| `https://tr.beringair.com/rot/records` | `https://frat.beringair.com/rot/records` |
| any other path | same path on `frat.beringair.com` |

## Apply on prod (automated)

```bash
cd ~/fraBering
sudo bash scripts/nginx-tr-to-frat-redirect.sh
```

Backups go to `/etc/nginx/backups/` (not `sites-enabled/` — a backup symlink there breaks `nginx -t`).

**If a prior run left a bad symlink in `sites-enabled`:**

```bash
sudo rm -f /etc/nginx/sites-enabled/default.bak-tr-redirect-*
sudo nginx -t && sudo systemctl reload nginx
```

The redirect block may already be in `sites-available/default` from a partial run — you only need the `rm` + reload.

## Manual nginx block

Replace the entire `server { ... server_name tr.beringair.com; ... }` block in `/etc/nginx/sites-enabled/default` with:

```nginx
server {
    listen 443 ssl;
    server_name tr.beringair.com;

    ssl_certificate /etc/letsencrypt/live/tr.beringair.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tr.beringair.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location = / {
        return 301 https://frat.beringair.com/rot/records;
    }
    location / {
        return 301 https://frat.beringair.com$request_uri;
    }
}
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Smoke test

```bash
curl -sI https://tr.beringair.com/ | grep -E 'HTTP|Location'
# HTTP/1.1 301
# Location: https://frat.beringair.com/rot/records

curl -sI https://tr.beringair.com/rot/ome | grep -E 'HTTP|Location'
# Location: https://frat.beringair.com/rot/ome
```

## ROT URLs (use on frat after redirect)

| Screen | URL |
|--------|-----|
| Training Records | `https://frat.beringair.com/rot/records` |
| Pilot Evals | `https://frat.beringair.com/rot/evals` |
| SIC Log | `https://frat.beringair.com/rot/sic-hours` |
| Nome / Kotz | `https://frat.beringair.com/rot/ome`, `/rot/otz` |
| Fileserver | `https://frat.beringair.com/rot/files` |

Old bookmarks to `tr.beringair.com` keep working via 301.
