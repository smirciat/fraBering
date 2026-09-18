# Issue #53 — 293(a) expiration updated with BI-only approval

## Symptom

User saved a record with BI + 293(a), then removed 293(a) and saved again. After upload/approve of **BI only**, **`far293a148`** on the pilot profile changed as well.

## Cause

`setExp('BI')` set `expKeyAlt='far293a148'`. `buildExpPreviewRows` / `applyExpUpdates` wrote the same expiration to **both** `BasicIndocExp` and `far293a148` whenever Basic Indoc was approved, even when `far293a` was not on the record.

## Fix

- **`setExp`:** BI tab updates **`BasicIndocExp` only** (no `expKeyAlt`).
- **293(a) alone:** still uses tab `293A` → `far293a148` when `far293a` is in `trainingTypeArray`.
- **Pilot board:** 293(a) column uses **`far293a148Short`** (was incorrectly bound to `BasicIndocExpShort`).
- **`processPilots`:** build `*Short` display fields for M/YY (`2`-part) training exp strings.

Save without approve does not touch pilot expirations (unchanged).

**Deploy:** `grunt build`.
