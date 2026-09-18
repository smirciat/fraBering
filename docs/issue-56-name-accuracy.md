# Issue #56 — Name accuracy (Training Records / ROT PDFs)

**Reporter:** Nathaniel Olson · **Priority:** critical

## Problem

ROT and Flight Test PDFs and training records used the short **roster** `name` field (e.g. “Conor Murray”) instead of the **FAA certificate legal name** (e.g. “Conor Rocco Murray”, “Shawn Michael Thomas Graham”).

## Fix (code)

- Firebase pilot docs may include optional **`legalName`** (and existing **`payrollName`** fallback).
- **Edit Pilot Training Dates** modal: new **Legal name (as on FAA certificate)** field; roster name unchanged for daily use.
- Training Records + PDF **`Pilots Name`** use `legalName` → `payrollName` → `name`.
- Pilot selector shows legal name when set.

## Infer from CERT scan (after deploy)

Scans live under `server/fileserver/rot/records/` as  
`{employee#}_{MMDDYYYY}_CERT_Medical_…` or `_CERT_Certificate_…` (PDF with text layer).

1. Select pilot → **Infer legal name from CERT scan** (or **Edit Pilot Training Dates** → **Infer from scan**).
2. Server reads the **newest Medical** scan, then **newest Pilot Certificate** if medical yields no match; `pdf-parse` then OCR per file.
3. Picks the longest name-like line whose **last name matches** roster `name` (safety check).
4. If PDF text is empty or no match → **OCR** first page via system **`tesseract`** CLI (not `tesseract.js` — incompatible with Node 12).
5. **Confirm/Save** on the pilot modal to write `legalName` to Firebase.

**Prod deps**

Production runs from **`dist/`** (`npm start` there). Static JS is **`dist/client`**, API is **`dist/server`** — a `git pull` alone does not update what browsers or pm2 use until you build.

```bash
cd ~/fraBering
node -v    # should be ^12.22.12 for grunt
npm install --legacy-peer-deps   # pdf-parse (no tesseract.js — requires Node 14+)
sudo apt-get install -y poppler-utils tesseract-ocr   # pdftoppm + `tesseract` CLI for Node 12
npx grunt buildServer            # or: grunt babel:server (same as buildServer)
npx grunt build                  # client → dist/client (required for new toasts/UI)
cd dist && pm2 restart fraBering # or your usual pm2 cwd
```

JPEG CERT uploads are OCR’d directly. Image-only PDFs need `pdftoppm` on the host.

### “Failed instantly” — usually not OCR

Real OCR (Tesseract on page 1) normally takes **several seconds**. A warning in under ~1s usually means:

| Cause | What to check |
|--------|----------------|
| **Old `dist/server`** | `grep ocrAttempted dist/server/api/rot/rot.legalNameFromScan.js` — should exist after `buildServer` |
| **Old `dist/client`** | Modal hint should mention **OCR (Tesseract)**; generic “could not read” only → rerun **`grunt build`** |
| **No matching CERT file** | On disk: `{employee#}_…_CERT_Medical_…` or `_CERT_Certificate_…` (pilot Firebase `_id` = employee #) |
| **poppler missing** | Toast: *install poppler-utils* (`ocr_needs_poppler`) — fails fast, no OCR |
| **404 on API** | Network tab: `POST /api/rot/inferLegalName` — needs logged-in approver + deployed route |
| **502 Bad Gateway** | Nginx lost Node — often OCR: check `pm2 logs fraBering` right after click; install **`tesseract-ocr`**; redeploy `buildServer` |

### 502 on infer

HTML **502** from nginx (not JSON from Express) often meant **tesseract.js** was loaded on **Node 12** (`??` syntax error). OCR uses only the **`tesseract-ocr`** system package now.

```bash
which tesseract pdftoppm
pm2 logs fraBering --lines 80   # right after a failed click
```

### More than clicking the button

1. **Infer legal name from CERT scan** — infers and **writes Firebase** (`persist`).
2. **Edit Pilot Training Dates** — if `legalName` is empty, a **silent** infer runs **before** the modal opens (can feel like “it already failed”).
3. **Infer from scan** in the modal — fills the field only; **Confirm/Save** still required to store.
4. Parsed name must **match roster last name** (e.g. roster “Conor Murray” → certificate must end in **Murray**).

### Bulk infer (server script)

On **smircich** (or any host with `server/firebase.json` and CERT files on disk):

```bash
cd ~/fraBering
node scripts/rot-infer-legal-names/index.js              # dry-run
node scripts/rot-infer-legal-names/index.js --apply      # write Firebase legalName
node scripts/rot-infer-legal-names/index.js --apply --force   # overwrite existing
node scripts/rot-infer-legal-names/index.js --pilot Graham --apply
node scripts/rot-infer-legal-names/index.js --delay 3000 --apply   # slower OCR pacing
```

Skips pilots who already have `legalName` unless `--force`. Uses the same infer logic as the UI (`pdf-parse` → OCR). No `grunt build` required — runs against `server/` source via `babel-register`.

## Verify

- Selector and “All Training Dates” header show legal name when filled.
- Generate ROT or Flight Test PDF → **Pilots Name** matches certificate.
