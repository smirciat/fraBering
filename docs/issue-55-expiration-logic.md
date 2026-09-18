# Issue #55 — Expiration date logic (approval preview)

## Symptoms

- **far297Exp:** Extending from 8/31/2026 computed **3/3/2027** (JavaScript `setMonth` overflow from Aug 31 + 6 months).
- **far299Exp / far297gExp** with **New base** checked: Used `getExp(baseMonth, …)` → **2/28/2027** while a September check establishing a new base should yield **9/30/2027**.

## Fix (`records.controller.js`)

- **`expEndOfMonthAfterMonths(anchor, n)`** — anchor to end of anchor’s month, then add *n* months to another month-end (no day spill).
- **`computeExpDate`:**
  - **299 / 297g + new base:** end of **check** month + 12 months (not `getExp` from roster base month).
  - **297 + new base:** still uses `getExp` when `baseMonth` is set; extend/initial use EOM math.
  - **All other extend/initial/rebase fallbacks:** EOM month add instead of `setMonth`.

Client-only — **`grunt build`** for prod.

## QA (Brandon-style recurrent)

Approve row with 299, 297, 297g, BE20 PIC; check date in September; new base on 299/297g:

| Event | Expect (approx.) |
|-------|------------------|
| far297Exp | 2/28/2027 (from 8/31/2026 + 6, not 3/3/2027) |
| far299Exp / far297gExp (new base) | 9/30/2027 |
