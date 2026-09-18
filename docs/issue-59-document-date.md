# Issue #59 — Document date on CERT uploads

**Reporter:** Nathaniel Olson · **Priority:** medium

## Problem

Uploading CERT **Certificate**, **Annual resume**, or **Drivers license** should not require picking a document date.

## Fix

On `/rot/records` upload (when not linking to an existing training row):

- Hide **Document Date** for CERT subtypes: `Certificate`, `Annual-Resume`, `Drivers-License`.
- Filename segment `{MMDDYYYY}` uses **upload day** instead.
- **Medical** and **Passport** still show document date (medical still updates pilot `medicalDate` on upload).

## Verify

1. CERT → Certificate → no date picker; upload succeeds; filename contains today’s date.
2. CERT → Medical → date picker still shown; medical date behavior unchanged.
3. Link upload to an existing training record → still uses that row’s date in filename.
