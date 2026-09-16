# Issue #40 — ROT / Flight Test PDF accuracy

**Backlog:** [#40](https://frat.beringair.com/issues?issue=40) (reporter: Andy; Nate priority for ROT paperwork).

**Code:** [`client/app/rot/records/records.controller.js`](../client/app/rot/records/records.controller.js) — `pdf()` → `persistRecord` → `generatePdf()`.

**Templates:** `server/fileserver/rot/pdfs/ROT.pdf`, `FlightTest.pdf`, `FlightTestINDOC.pdf` (prod disk; see [`rot-integration-plan.md`](./rot-integration-plan.md)).

**Where to test:** Production Firebase holds almost all training rows — use **[https://frat.beringair.com/rot/records](https://frat.beringair.com/rot/records)** (not local dev). Records API access is the ROT allow-list in `server/api/rot/rot.access.js` (Andy / Nate / instructors).

---

## Production deploy (ship #40 PDF fixes)

On the **prod app host** (same box as `pm2` `fraBering`):

```bash
cd ~/fraBering   # or your clone path
git pull
grunt build && grunt babel:server
pm2 restart fraBering
```

**Client reload:** This pass bumps `stopped176` (navbar + `server/api/todaysFlight/index.js`) so open tabs pick up `dist/` after restart. See [`stopped-version-deploy.md`](./stopped-version-deploy.md).

**Templates (no git — must exist on disk):**

```bash
ls -la server/fileserver/rot/pdfs/ROT.pdf \
       server/fileserver/rot/pdfs/FlightTest.pdf \
       server/fileserver/rot/pdfs/FlightTestINDOC.pdf
```

If any are missing, restore from ROT backup or run the copy step in [`rot-backup-restore.md`](./rot-backup-restore.md) / [`rot-integration-plan.md`](./rot-integration-plan.md) (`migrate-rot-training-docs`).

**Smoke after deploy (logged in as records user):**

1. Open `/rot/records`, load a pilot with existing rows.
2. DevTools → Network: `GET /api/rot/files/pdfs?filename=ROT.pdf` should be **200** (auth cookie).
3. Generate **ROT** on a saved row — PDF downloads; Console shows `fields` from `generatePdf`.
4. Spot-check: **Check Airman Cert #**, **C408 SIC** checkbox on a Flight Test row, **BaseMonth** when profile has base month.

No extra env flags — prod already uses production Firebase for `/api/rot/firebase*`.

---

## QA workflow (Nate / training)

1. On `/rot/records`, pick a pilot and build a **saved** row (date, events, instructor, check airman if checkride).
2. Click **ROT**, **Flight Test**, or **INDOC** — record saves first, then PDF downloads.
3. Open the PDF and compare to the row and pilot profile (cert, medical, base month, exp lines).
4. Re-upload the generated PDF on the same record’s upload area to keep a copy for audit.
5. Repeat for a **ground-only** row (ROT) and a **checkride** row (Flight Test) on recent real data.

Browser devtools: `generatePdf` logs the `fields` object sent to `pdfform()`.

---

## Fixes in this pass (code)

| Item | Detail |
|------|--------|
| C408 SIC checkbox | Typo `CS08PIC` → `C408SIC` on Flight Test PIC/SIC check boxes |
| Check airman cert | `checkAirmanCert` filled from pilots roster (same pattern as instructor) |
| Form enrich | `enrichRecordForForms()` before PDF fill (profile + roster certs) |
| Base month | Safe `baseMonthUpper` when base month missing |

---

## Known gaps (still to map on PDF)

Events in `rotAppConfig.trainingEventKeys` **not** wired in `generatePdf` yet:

- `C208TKS`
- `CheckAirmanObs`, `FlightInstructorObs`
- `C208GOS`, `B190GOS`, `BE20GOS`, `C408GOS`, `C212GOS` (if used on records)

To add a row: uncomment `pdfform().list_fields(response.data)` once in dev, match AcroForm names in the template, then extend the `if (pilot.Event…)` blocks in `generatePdf`.

Optional profile fields (confirm AcroForm names on template): OAS, passport, Russian visa — not in `generatePdf` today.

---

## Related issues

- **#29** — duplicate row on ROT (save with index before generate — `pdf()` uses `persistRecord` with index).
- **#23** — approve / expiration (separate from PDF generation).
