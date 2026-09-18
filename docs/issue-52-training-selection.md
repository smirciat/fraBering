# Issue #52 — Training selection organization

## Request

Group the record training-type picker like Nate’s sticky note: **Ground** vs **Flight**, aircraft sub-groups for ground/GOS and 293(b) PIC/SIC. **297, 297g, and 299** stay single checkboxes (not repeated per aircraft).

## Implementation

- **`rot.constants.js`** — `trainingSelectionSections` (same `name` values as `trainingEventKeys` / Firebase booleans).
- **`modal.service.js`** — Radio modal uses sections; `eventResult` init walks all leaves.
- **`modal.html` + `modal.css`** — Grouped layout with nested rows and scrollable body.

Record save/approve logic unchanged (still driven by selected event names).

**Deploy:** `grunt build`.
