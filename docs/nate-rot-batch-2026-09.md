# Nate ROT batch — Sep 2026 (issues #42–#59, #56)

Handoff for deploy, verification, and docs. Work is in the working tree until Andy commits.

## Issues (18)

| # | Topic | Doc |
|---|--------|-----|
| 56 | Legal names + CERT infer | `issue-56-name-accuracy.md` |
| 59 | CERT upload — no document date | `issue-59-document-date.md` |
| 58 | Hazmat 24 mo (HAZ tab) | `issue-57-58-hazmat.md` |
| 57 | Hazmat approve + record link | `issue-57-58-hazmat.md` |
| 55 | Expiration logic (299/297/297g) | `issue-55-expiration-logic.md` |
| 54 | M/YY expiration display | `issue-54-expiration-format.md` |
| 53 | 293(a) vs BI expiration | `issue-53-293a-bi-expiration.md` |
| 52 | Training picker layout | `issue-52-training-selection.md` |
| 51 | Unaffiliated ROTs | `issue-51-unaffiliated-rots.md` |
| 50 | Medical OCR + multi-angle scans | `issue-50-medical-ocr.md` |
| 49 | 293(a) without aircraft | `issue-49-293a-aircraft.md` |
| 48 | Delete records | `issue-48-delete-records.md` |
| 47 | GOS / General Emergency | `issue-47-gos-general-emergency.md` |
| 46 | Caravan N# (firebase fleet) | `issue-46-only-beech.md` |
| 45 | Medical/passport summary table | `issue-45-medical-passport.md` |
| 44 | Larger training entry / modal | `issue-44-larger-training-entry.md` |
| 43 | Archive pilots | `issue-43-archive-pilots.md` |
| 42 | UPLOAD A CERT + Medical tab | `issue-42-medical-upload-tab.md` |

**Issues app:** All 18 marked **ready_for_review** with per-issue comments (**no email**).  
Script: `node scripts/issue-rfr-nate-rot-sep2026/index.js`

**Verifier email (one Gmail to Nate):**  
`docs/nate-rot-verification-email-2026-09.html` — see **`docs/verifier-email-from-html.md`** (download to Mac → Finder → double‑click → copy → Gmail).

## Deploy (Andy)

```bash
nvm use 12
node -v   # ^12.22.12
which node

# Client (most ROT UI)
npx grunt build

# Server (inferMedical, medical OCR, cert scan)
npx grunt buildServer
cd dist && pm2 restart fraBering   # or your usual cwd

# Optional: force open tabs reload
# bump stopped{N} in navbar + todaysFlight (see docs/stopped-version-deploy.md)
```

**Server packages (prod):** `tesseract-ocr`, `poppler-utils`, **`imagemagick`** (`convert`) for medical/legal OCR rotation + JPEG EXIF.

## Build fix (Node 12)

**`primordials` / `cdnify`:** `grunt-google-cdn` removed; `cdnify` is a no-op in `Gruntfile.js`.  
See `docs/grunt-build-node12.md`.

## Key code areas

- `client/app/rot/records/*`, `rot.constants.js`, `rotPilotContext`, `rotPilotSelector`
- `client/components/modal/*` (training picker, #44/#47/#52)
- `client/app/rot/rotPilotExpDate.service.js` (#54)
- `server/api/rot/rot.medical*.js`, `rot.certScanOcr.lib.js` (#50, #56, rotation)
- `Gruntfile.js` (cdnify noop)

## Tests

```bash
node scripts/rot-medical-parse-test/index.js
```

## Regenerate backlog export (after Nate triage)

```bash
ISSUES_EXPORT_TOKEN='…' node scripts/export-team-backlog/index.js
# commit docs/team-backlog.md if desired
```
