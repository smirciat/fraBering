# Issue #49 — 293(a) not aircraft-specific

## Problem

Saving or opening **Flight Test** on a record with **293(a) 1,4-8** (and check airman, no PIC/SIC checkride) failed with: *An aircraft has to be selected if the event is a checkride*.

## Fix

- **`recordRequiresAircraft(record)`** — true only when the record includes a **`*PIC` / `*SIC`** training event and a check airman is set.
- **`persistRecord`** uses that helper (293(a)-only + check airman no longer requires aircraft).
- **Records table** — aircraft, N#, and flight time show **—** when not required.
- **`rotFlightTestItems.needsPopup`** — includes **`far293a`** so the Flight Test items modal opens for 293(a)-only rows.

**Deploy:** `grunt build`.
