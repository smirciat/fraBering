# Issues #57 / #58 — Hazmat upload, approval, expiration

## #58 — 2-year Hazmat expiration

**Cause:** `setExp(tab)` used `case 'HAZMAT': timeframe=24` but upload/approval paths pass tab **`HAZ`**, so Hazmat fell through to `default: timeframe=12` (1 year).

**Fix:** `case 'HAZ':` shares 24-month timeframe with `HAZMAT` in `records.controller.js` `setExp()`.

## #57 — Hazmat approval / upload-and-approve

**Symptoms (Nate):** Upload-and-approve appeared to succeed but PDF was not linked to the record; approving a Hazmat-only row showed expiration preview for **checkride** events (299, 297, C208 PIC, etc.) with “new base” warnings.

**Causes:**

1. **Upload and Approve** without choosing **Select Training Record Associated with this Upload** only uploads to a tab; filenames lack `associated_<recordId>_`, so `recordHasPdf()` stays false and auto-approve does not run.
2. **`enrichRecordForForms`** rebuilt `trainingTypeArray` from every `trainingEventKeys` boolean on the record. New drafts cloned the full pilot profile, so stale `"true"` flags could repopulate the array and drive the wrong expiration preview.
3. Hazmat exp updates used **checkride “new base month”** logic via `shouldAutoRebase` → bad proposed dates for `HazmatExp`.

**Fixes (client — `grunt build` for prod):**

- Require an associated saved record before **Upload and Approve**.
- New drafts: clear training-event booleans; start with empty `trainingTypeArray`.
- When `trainingTypeArray` is non-empty, treat it as source of truth; sync booleans from the array instead of overwriting the array from booleans.
- `shouldAutoRebase`: never auto–new-base for `HazmatExp` (extend from current expiration + 24 months).

**Ops check:** For Hazmat-only paperwork, select the pending Hazmat row in the associate dropdown, then **Upload and Approve**, or upload with association then **Approve** on that row. Preview should list **HazmatExp** only.
