# Nate ROT batch #2 (issues #60–#67)

_Exported and developer-approved 22 Sep 2026._

| # | Title | Scope |
|---|--------|--------|
| 60 | Does not automatically rebase future dates | `computeExpDate` — 293(b) PIC/SIC rebases use check-month EOM + 12, not legacy `baseMonth` table |
| 61 | Flight test form expiration logic | `generatePdf` Flight Test — use pilot profile exp / `computeExpDate`, not `getExp` only |
| 62 | Uploading and Approving Passport | CERT passport — Upload and Approve without training record |
| 63 | Create a new user | **Add pilot to ROT** — does not create a Firebase pilot. Flight Report already has the record. ROT sets `name` and `pilotBase` on that existing doc so the pilot shows in the workflow |
| 64 | Pending view | **Pending records and missing documents** — all unapproved records, plus approved records whose filename has no `associated_{id}_` |
| 65 | Move read medical button | Upload area: medical read + upload/approve with confirm |
| 66 | 293(a)1,4-8 placement | Training picker — Flight section, not under BI |
| 67 | Standalone .299 a/c + time | Tail/flight time when 299 (and 297/297g) without checkride |
