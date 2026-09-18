# Issue #47 — GOS & General Emergency sub-options

## Request

- Checking **aircraft ground** (208, 1900, King Air, Casa, C408) should offer **GOS**, **checked by default**, user can uncheck.
- Checking **Basic Indoc (BI)** should show **General Emergency** (`far293a` / 293(a) 1,4-8) as an optional sub-checkbox (not auto-checked).

## Implementation

- **`rot.constants.js`** — `trainingSelectionLinks`; GOS and 293(a) removed from top-level grouped checkboxes (#52 layout).
- **Training type modal** — nested checkboxes when parent is on; toggling parent on applies default-linked types; toggling parent off clears linked types.

Firebase field names unchanged (`C208GOS`, `far293a`, etc.).

**Deploy:** `grunt build`.
