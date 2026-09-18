# Issue #44 — Larger training entry area (less scrolling)

## Request

Make the training entry box larger so awkward scrolling is reduced on **Records**.

## Changes

### Training type modal (click **Type** column)

- Wider dialog (`modal-rot-training-select`: ~92% width, max 1280px).
- Taller body (up to **88vh**).
- **Ground** and **Flight** sections in a **two-column flex** layout on wide screens (less vertical scroll inside the modal).
- Inner form no longer capped at 70vh (body scrolls as one unit).

### Records entry row

- Entry table uses **98%** width wrapper with horizontal scroll when needed.
- **Type** cell is a larger clickable panel (min width/height, wrapped text, hover highlight) instead of a single cramped line.

## Files

- `client/components/modal/modal.html`, `modal.css`, `modal.service.js`
- `client/app/rot/records/records.html`, `records.css`

## Deploy

**`grunt build`** (client).

## QA

1. Open a draft record → click **Type** → modal is wide; Ground and Flight appear side-by-side on a desktop monitor with minimal inner scroll.
2. Select several training types → **Type** cell shows wrapped labels in the larger yellow box.
3. Narrow window → sections stack; table still scrolls horizontally if needed.
