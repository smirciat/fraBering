# Issue #50 — Medical upload OCR

## Goal

Upload a CERT **Medical** scan (image or PDF); server **OCR** reads exam date and class and updates the pilot profile — no manual date entry when OCR succeeds.

## Flow

1. **CERT** tab → **Medical** → choose file → **Upload File**.
2. After save to disk, client calls `POST /api/rot/inferMedical` with `pilotId` and `filename`.
3. Server runs **tesseract** (+ **pdftoppm** for PDFs), parses `DATE OF EXAMINATION` / class lines, writes `medicalDate` and `medicalClass` to Firebase.
4. If OCR fails, falls back to upload date for `medicalDate` only when `fallbackDate` is passed (upload path).

**Manual retry:** **Read medical from newest CERT scan** (visible when CERT + Medical selected).

Medical CERT uploads use **upload date in filename** (no document date picker), same pattern as other CERT types in #59.

## Server

- `rot.medicalParse.lib.js` — parse OCR text
- `rot.medicalFromScan.js` — pick `{emp#}_*_CERT_Medical_*`, OCR, parse
- `rot.certScanOcr.js` — `ocrCertUploadRawText` (full page text)
- `POST /api/rot/inferMedical` — records access required

Same limits as legal-name OCR: skip read **> 15 MB**, skip OCR **> 800 KB**.

**Deploy:** `grunt buildServer` + `grunt build`; host needs `tesseract-ocr` and `poppler-utils`.

**Sideways scans:** OCR tries **0°, 90°, 180°, 270°** (picks the best parse via `scoreMedicalOcrText`). Requires **ImageMagick** `convert` on the server (`apt install imagemagick`). JPEGs also get **`-auto-orient`** from EXIF when `convert` is available. Without ImageMagick, behavior is a single 0° pass (as before).

## Test

```bash
node scripts/rot-medical-parse-test/index.js
```
