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

**Client reload:** This pass bumps `stopped179` (navbar + `server/api/todaysFlight/index.js`) so open tabs pick up `dist/` after restart. See [`stopped-version-deploy.md`](./stopped-version-deploy.md).

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

## Iterate with Nate (default loop)

Nate generates on prod whenever he needs a form. When a PDF is wrong, he sends Andy the **downloaded file** plus a **short note** (what’s wrong / what it should be). No DevTools, no JSON.

1. Drop the PDF in `uploads/` (or `uploads/issue-40-pdf-qa/`). Keep Nate’s filename if it is already `ROT_…` / `FlightTest_…`.
2. In Cursor: *“Nate says [note]. PDF is `uploads/….pdf` — compare to the record and fix.”*
3. Agent: rasterize / read the **flattened** page (there are no live AcroForm values), look up the Firebase training row + pilot profile, diff vs `generatePdf`, patch, **regenerate the whole form** (do not edit the PDF by hand).
4. `grunt build`, bump `stopped{N}` in **both** places, `pm2 restart fraBering`. Nate generates again from `/rot/records`.

Enough from Nate: the PDF + the complaint. Pilot name and date on the filename are usually enough to find the row. Helpful extras (not required): record id, which button (ROT / Flight Test / INDOC), screenshot.

Stakeholder for “that dropdown / month pair looks wrong” is **Nate**.

---

## Optional extras (Andy, not Nate)

`generatePdf` still `console.log`s the `fields` object. If you have it, paste into a sidecar next to the PDF ([`qa-case.template.json`](./issue-40-rot-pdf/qa-case.template.json)). Re-upload on the record in the UI for audit (`server/fileserver/rot/records/` on prod). Neither is required for the iterate loop.

---

## Fixes from Sep 15 QA (Scott / Hopley / Smircich PDFs)

| Item | Detail |
|------|--------|
| ROT `undefined/` cert line | Use instructor, else check airman (`rotPdfSigner`) — Ryan Scott checkride had no instructor |
| ROT Aircraft Flight instructor | Same signer fallback (Tim Kunkel on the 9/1/2026 row) |
| ROT vs Flight Test field clash | `Dropdown3`–`7`, exp dates, PIC/SIC checkboxes are Flight Test only — they were overwriting ROT S/U columns with MARCH/SEPTEMBER |
| ROT aircraft type | PIC/SIC → `Dropdown17` (flight row). Ground/GOS → `Dropdown25`/`26`. Do not stamp C208 on ground rows for a flight-only check |
| Check airman cert type | `Cert Type2` from roster `certType` when a check airman is on the row |
| Type of check | Prefer `trainingType` (avoid `recurrent undefined`) |
| BI + General Emergency | Unchanged — one BI event fills both ROT lines |
| 297 six-month math | Unchanged — last day of base+6 month (`getExp`) |
| N# / flight time | Filled only if the record has `aircraftN` / `nNumber` / `tailNumber` / `acftNumber` or `flightTime` / `hours` (not on current rows) |

**Flatten (Sep 15):** ROT / Flight Test / INDOC are filled with **pdf-lib** (`client/vendor/pdf-lib/pdf-lib.min.js`) then **fully flattened**. Chrome and Preview show instructor names, S/U, and aircraft type without clicking. Live AcroForm widgets are gone on purpose.

**Regenerate the whole PDF** after any mapping change — do not patch a downloaded file. Same generate buttons on `/rot/records`.

**Paper signatures:** live signature widgets are **removed before flatten** so Acrobat is not required and we do not bake a second widget appearance. The template already prints a yellow **Signature:** prompt in the cert rows — that cell stays empty for wet-sign on paper. Bottom “Inspector’s Signature:” is printed artwork, not a widget.

**Chrome vs Adobe (old files):** on the previous `pdfform` / NeedAppearances PDFs, Chrome often showed dropdowns better than Adobe Reader. Flattened files should look the same in both. Stakeholder for “that dropdown looks wrong” is **Nate**.

**297 base-month dropdown (`Dropdown5` on FlightTest.pdf):** the template is not a single month. Options are:

`-`, `JAN/JUL`, `FEB/AUG`, `MAR/SEP`, `APR/OCT`, `MAY/NOV`, `JUN/DEC`, `JUL/JAN`, `AUG/FEB`, `SEP/MAR`, `OCT/APR`, `NOV/MAY`, `DEC/JUN`

We set **base month first, then +6** (`pdf297MonthPair`): March → **MAR/SEP**, September → **SEP/MAR**. The **297 EXP** date is still last day of the +6 month (`getExp`, freq 6). If Nate wants the other order (always Jan–Jun first, e.g. always MAR/SEP), change `pdf297MonthPair` and regenerate.

SIC Hours still uses `pdfform` (not flattened).

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
