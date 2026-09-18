# Issue #51 — Unaffiliated ROTs

## Need

Upload a signed ROT PDF under a section (e.g. Basic Indoc) **without** updating base month or training expirations. File should appear in that tab’s **single line entry** list.

## Usage

1. Select pilot; **do not** associate a training record.
2. **Tab:** `BI` · **Type:** `Unaffiliated`
3. Enter **Training description** (e.g. `Special approach training`).
4. **Upload File** only (not Upload and Approve).

Filename pattern:

`{pilotId}_{date}_BI_Unaffiliated_{DescriptionTag}_{original.pdf}`

Files show under **BI → Unaffiliated** in the file browser and in the **BI** single line entry (Training/Test column uses the description tag).

## Safeguards

- Upload and Approve hidden/disabled for Unaffiliated.
- No associated-record approval path for these uploads.
- `buildExpPreviewRows` skips records flagged `unaffiliatedRot` (reserved for future record rows).

**Deploy:** `grunt build`.
