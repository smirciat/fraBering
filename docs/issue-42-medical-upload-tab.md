# Issue #42 — CERT / Medical tab disappears after “UPLOAD A CERT”

## Problem

After choosing **UPLOAD A CERT** in “Select Training Record Associated with this Upload”, the **CERT** tab and **Medical** (and other CERT type) pickers vanished. Upload then failed with “Need to select a tab” unless the page was refreshed.

## Cause

The OR upload UI used `ng-if="!associated || !associated._id"`. The cert-only sentinel uses **`_id: -1`**, which is truthy, so the picker was hidden while `hasAssociatedRecord()` correctly treated `-1` as “no training record”.

`selectTR()` also cleared `subtab` when picking UPLOAD A CERT, wiping **Medical** if the user had already chosen it.

## Fix

- `showUploadTabPicker()` — show tab/subtab when no association **or** `isUploadCertChoice()` (`_id === -1`).
- `selectTR()` — set `tab` to `CERT` for cert upload only; **do not** clear `subtab`.

## Files

- `client/app/rot/records/records.controller.js`
- `client/app/rot/records/records.html`

## Deploy

**`grunt build`**

## QA

1. Choose **UPLOAD A CERT** → tab/subtab row stays visible.
2. Select **CERT** + **Medical** → upload works without refresh.
3. Select a real training record → tab picker hides (types come from record).
4. Switch back to **UPLOAD A CERT** → picker returns; choose Medical again.
