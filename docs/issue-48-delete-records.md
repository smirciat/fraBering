# Issue #48 — Delete erroneous training records

## Symptoms

- **Delete** on a saved row appeared to do nothing or removed the wrong row.
- After leaving and returning to `/rot/records`, **deleted rows reappeared** (still in Firebase).
- **Draft** rows (no type / no `_id`) only showed an alert — could not clear the extra line.

## Cause

`delete(record, $index)` used **`$index` from `recordFilter`**, which does not always match the index in `this.records` when approved rows are hidden. `splice($index, 1)` could remove a different row while the intended Firestore document stayed — the next `init()` reload brought it back.

## Fix

- Resolve index by **`record._id`** (or object reference for drafts).
- **Draft rows** (no `_id`): remove locally and keep a single draft via `ensureDraftRow()`.
- Show a **toast** if Firebase delete fails.
- HTML: `delete(record)` only — no filtered `$index`.

**Deploy:** `grunt build`.
