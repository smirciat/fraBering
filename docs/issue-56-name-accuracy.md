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
2. Server reads the **newest Medical PDF**, else Certificate; extracts text with `pdf-parse`.
3. Picks the longest name-like line whose **last name matches** roster `name` (safety check).
4. If PDF text is empty or no match → **OCR** first page via **Tesseract** (`tesseract.js`).
5. **Confirm/Save** on the pilot modal to write `legalName` to Firebase.

**Prod deps**

```bash
npm install   # pdf-parse, tesseract.js
sudo apt-get install -y poppler-utils   # pdftoppm for scanned PDFs
grunt babel:server && pm2 restart fraBering
```

JPEG CERT uploads are OCR’d directly. Image-only PDFs need `pdftoppm` on the host.

Optional batch later: `scripts/rot-infer-legal-names/` (not shipped yet).

## Verify

- Selector and “All Training Dates” header show legal name when filled.
- Generate ROT or Flight Test PDF → **Pilots Name** matches certificate.
