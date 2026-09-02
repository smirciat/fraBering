# Issue #23 — Records redesign (handoff for bering-dev)

**Issue:** [#23 Trying to rebase when not told to do so](https://frat.beringair.com/issues)  
**Reporter:** Nathaniel Olson  
**Status:** `needs_clarification` (reporter replied last — **Reporter replied** badge should show in list)  
**Code:** `client/app/rot/records/` (`records.controller.js`, `records.html`)  
**Firebase:** `records` collection + pilot exp on `pilots`  
**As of:** 2026-09-02 — pick up on **bering-dev** (`~/fraBering`)

---

## Why this doc exists

Conversation in Cursor (resBering workspace) scoped a **Tier A** quick-fix pass and a **Tier B** “training session” redesign for ROT Records. Nate agreed the binder-era spreadsheet flow is worse than paper and is open to a new approach. This file is the handoff so work continues on **fraBering / bering-dev** without re-deriving context.

---

## Thread summary (issue #23)

### Original bug

Upload and Approve was **rebasing expiration** even when **New Base = false** (used training date instead of extending current exp).

### Shipped fix (dev/prod — verify with Nate)

- **New Base = false** → extend current exp by interval (e.g. Aug 2027 → Aug 2028); training date only when no prior exp.
- **New Base = true** → rebase from base month / training date (confirm if within normal window).
- Removed misleading prompt that could rebase when New Base was false.

### Nate’s follow-up (product direction)

> Current approach works for hard copies and binders but doesn’t translate to the training records program — almost more work than paper. Open to a **completely new, streamlined approach**; paper and binders seem preferable today.

Also: **Save** seemed to disappear on 8/17 Sara Cubbage row — actually hidden unless **Include Previously Approved** is toggled (known UX bug).

---

## Andy’s responses posted on #23 so far

1. **Acknowledged** rebase is tricky with multiple base months per processing — may need rethink.
2. **Shipped** rebase fix + asked Nate to retry Sara Cubbage / 8/17 B190SIC with New Base false.
3. **“Lets work on this”** after Nate’s redesign comment.
4. **Long clarification request** (8 numbered questions) — excerpt:

| # | Topic | Question (short) |
|---|--------|------------------|
| 1 | Routine recurrent | Minimum happy path? What steps are pure overhead? |
| 2 | Roles | Keep Kaleb upload + Nate/Fen approve separate? |
| 3 | New Base | Rebase vs extend — **per event** on same checkride? |
| 4 | Multi-event ride | How often B190 PIC + ground + 299 together? One approve action? |
| 5 | Paper vs digital | What PDFs/binders still required? What to drop/auto-generate? |
| 6 | Approve without re-upload | Plain **Approve** on saved rows when PDF already uploaded? |
| 7 | Boards vs Records | Combined view or separate with synced exp only? |
| 8 | Audit | Current + 2 Previous enough, or full change log per event? |

5. Asked Nate to **retry Sara Cubbage** case to confirm immediate bug fix while scoping redesign.
6. Noted **save disappears** = unapproved rows hidden by default — on fix list.

**Not yet posted:** commitment reply below (Tier A + B). Post when ready.

---

## Draft reply to Nate (post on #23 next)

```sh
# Preview body only
node scripts/post-issue-23-reply/index.js --dry-run

# Post on #23 (emails Nate)
node scripts/post-issue-23-reply/index.js

# Post without email
node scripts/post-issue-23-reply/index.js --no-email
```

Body is extracted automatically from the `markdown` code block below — do not paste placeholders or the whole doc.

```markdown
Nate — thanks again for the straight talk. We're treating this as product direction, not just a one-off bug.

**Plan (two phases):**

**Phase 1 — quick wins (next deploys)**  
- Pending/draft queue so saved rows don't "disappear" (no more hunting **Include Previously Approved**).  
- **Approve** on a saved row when the PDF is already on file (not only Upload and Approve).  
- One shared upload flow for Kaleb and approvers (same screen, role gates the buttons).  
- **Single expiration preview** before approve: every event on the row shows current → new (extend vs rebase per event, not one New Base flag for the whole row).

**Phase 2 — "training session" (bigger redesign)**  
- One **checkride session** per ride: pilot, date, instructor, check airman, events completed, PDF attached once, then **one approve** updates all relevant expirations.  
- Kaleb can save a **draft** and submit; you/Fen **approve** when ready.  
- We'll build this **above** the legacy table first so you can compare without losing today's workflow until you sign off.

**Not in scope for now:** merging OME/OTZ pilot boards into Records (we can revisit after Phase 2 soaks).

Your answers to the numbered questions still help — bullet replies are fine. Even partial answers on **routine recurrent (1)**, **roles (2)**, and **multi-event rides (4)** are enough to start Phase 2 mockups.

When you have a minute, please still retry the **Sara Cubbage / 8/17 B190SIC** case with **New Base = false** so we know the immediate rebase fix is good on your end.
```

After posting, consider `needs_clarification` until Nate answers, or `in_progress` if Andy starts Tier A without waiting.

---

## Redesign tiers (reference)

### Tier A — Stop the bleeding (days)

| Item | Detail |
|------|--------|
| Pending queue | Default list = draft / awaiting approval; approved in separate tab or filter |
| Approve without re-upload | Button on row when PDF exists on disk |
| Unified upload UI | Remove duplicate Nate vs Kaleb sections; `isApprover()` / uploader gates |
| Exp preview modal | One dialog: all `trainingTypeArray` events, suggested extend/rebase per line |
| Per-event rebase rules | Default: has current exp + recurrent → extend; initial / no exp / explicit rebase → rebase |

**Key code today:** `add()`, `approve()`, `updateExp()`, `computeExpDate()`, `getAssociatedRecord()`, `recordFilter` (approved visibility).

### Tier B — Training session (target)

Replace “spreadsheet row + associate + upload” with one **session** object per checkride.

### Tier C — Due board drives Records (later)

OME/OTZ upcoming events → start session from due item. **Do not promise** until Tier B validated.

---

## Session object shape (Firebase)

### Design goals

- One document per checkride session (not one row per binder line).
- Multiple **events** on same session (B190 PIC, 297, 299, ground, …).
- **Per-event** extend vs rebase (not one `newBaseMonth` on whole row).
- **Status** workflow: draft → submitted → approved.
- **Backward compatible:** legacy `records` docs keep working; new docs use `schemaVersion: 2` or `kind: 'session'`.

### Proposed Firestore document (`records` collection)

```javascript
{
  _id: '<firebase id>',           // existing pattern
  schemaVersion: 2,
  kind: 'session',                // legacy rows omit or kind: 'legacy'

  // Pilot
  pilotId: '<pilot _id>',
  pilotNumber: '<emp id>',
  name: 'Sara Cubbage',

  // Session header
  checkDate: '8/17/2026',         // display string (keep locale pattern)
  dateObj: Timestamp,             // existing query field
  trainingType: 'recurrent',      // initial | recurrent | transition | …
  aircraft: 'B190PIC',            // primary aircraft for checkride
  baseMonth: 'August',
  instructor: '…',
  checkAirman: '…',
  result: 'Satisfactory',
  additionalInstruction: '',
  outcome: '',

  // Events on this session (replaces trainingTypeArray + boolean flags on row)
  events: [
    {
      key: 'B190PIC',             // maps to typeToTab() / setExp()
      tab: 'B190',
      seat: 'PIC',
      expKey: 'B190PICExp',       // pilot profile field
      expMonths: 12,              // from setExp timeframe
      action: 'extend',           // 'extend' | 'rebase' | 'manual' — approver can override
      priorExp: '8/1/2027',       // snapshot at approve time
      newExp: '8/1/2028',         // computed preview; written on approve
    },
    {
      key: 'far299',
      tab: '299',
      action: 'extend',
      priorExp: '…',
      newExp: '…'
    }
  ],

  // Files (one drop zone per session)
  attachments: [
    {
      storedName: '…_B190_Recurrent_PIC_….pdf',
      originalName: 'scan.pdf',
      uploadedAt: ISO,
      uploadedBy: 'email@…'
    }
  ],

  // Workflow
  status: 'draft',              // draft | submitted | approved
  approved: false,                // keep for recordFilter compat during migration
  approvedAt: null,
  approvedBy: null,
  submittedAt: null,
  submittedBy: null,
  createdAt: ISO,
  createdBy: 'email@…',
  updatedAt: ISO,

  // Rollback (existing pattern)
  priorExpDates: { B190PICExp: '…', … },  // snapshot before approve

  // Legacy PDF flags (optional denorm for quarterly report / ROT buttons)
  far297: true,
  far299: true,
  B190PIC: true
}
```

### Mapping from legacy row

| Legacy field | Session field |
|--------------|---------------|
| `trainingTypeArray[]` | `events[].key` |
| `newBaseMonth` (row-level) | `events[].action` per line |
| `approved` | `status === 'approved'` |
| `associated` upload picker | session `attachments` + `status` |
| `displayArray(record)` / type modal | `events` list in UI |

### API / code touchpoints

- `POST /api/rot/updateFirebase` `{ collection: 'records', doc }` — same transport.
- `approve()` → session approve: set status, `priorExpDates`, apply all `events[].newExp` to pilot in **one** Firebase write + history (`trainingExpHistory`).
- `recordFilter` / `buildRecordsChoice()` — include `status !== 'approved'` in default queue.
- Quarterly report query — include `kind: 'session'` or keep reading legacy shape.

---

## Wireframe — “New checkride” panel (Tier B)

Add **above** legacy table on `/rot/records` (parallel run; legacy table stays until sign-off).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ROT Records — [Pilot: Sara Cubbage ▼]                    [+ New checkride]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PENDING (3)          │  NEW CHECKRIDE (draft)                               │
│ ─────────────────    │  ─────────────────────────────────────────────────── │
│ • 8/17 B190 — draft  │  Check date: [8/17/2026]   Type: [Recurrent ▼]       │
│ • 9/02 C208 — submit │  Aircraft:   [B190PIC ▼]   Base month: [August ▼]    │
│ • 8/01 BE20 — submit │  Instructor: [▼]          Check airman: [▼]          │
│                      │  Result: [Satisfactory ▼]                             │
│ [Show approved ▼]    │                                                      │
│                      │  Events on this ride (check all that apply):         │
│                      │  ☑ B190 PIC   ☑ 135.299   ☐ 135.297   ☐ B190 Ground │
│                      │                                                      │
│                      │  Expiration preview (before approve):                │
│                      │  ┌──────────┬────────────┬────────────┬──────────┐   │
│                      │  │ Event    │ Current    │ New        │ Action   │   │
│                      │  ├──────────┼────────────┼────────────┼──────────┤   │
│                      │  │ B190 PIC │ Aug 2027   │ Aug 2028   │ extend ▼│   │
│                      │  │ 135.299  │ Jun 2027   │ Jun 2028   │ extend ▼│   │
│                      │  └──────────┴────────────┴────────────┴──────────┘   │
│                      │                                                      │
│                      │  PDF: [Drop file or click to choose]  scan.pdf ✓     │
│                      │                                                      │
│                      │  [Save draft]  [Submit for approval]                 │
│                      │  (Approver only) [Approve & update expirations]      │
└─────────────────────────────────────────────────────────────────────────────┘
│ Legacy table (collapsed by default?) … existing wide grid …                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Role behavior

| Role | Save draft | Submit | Approve |
|------|------------|--------|---------|
| Kaleb (uploader) | ✓ | ✓ | — |
| Nate / Fen (approver) | ✓ | ✓ | ✓ |

### Tier A-only wireframe tweaks (before full panel)

- Add **Pending** list + **Approve** button on legacy row.
- Replace multiple `confirm()` in `updateExp()` with one **preview modal**.

---

## Implementation order (suggested on bering-dev)

1. **Post draft reply** on #23 (section above).
2. **Tier A**
   - [ ] Default filter: show unapproved / pending first; rename toggle copy.
   - [ ] `approve(record)` without requiring file input if PDF already linked.
   - [ ] Exp preview modal in `approve()` / `updateExp()`.
   - [ ] Per-event action in preview (stretch: still on legacy row via `trainingTypeArray`).
3. **Tier B spike**
   - [ ] `rot-session` component or top panel in `records.html`.
   - [ ] Create/read `schemaVersion: 2` docs.
   - [ ] Session approve writes pilot exp + history in one pass.
4. **Nate validation** — one real checkride on session UI; keep legacy table as fallback.
5. **Update #23** → `ready_for_review` when Tier A shipped; close when Nate signs off on direction for Tier B.

---

## Commands (bering-dev)

```sh
cd ~/fraBering

# Post Nate reply on #23 (extracts draft from this doc automatically)
node scripts/post-issue-23-reply/index.js --dry-run   # preview
node scripts/post-issue-23-reply/index.js             # post + email

# Other issue comments
node scripts/issue-comment/index.js <id> [--status STATUS] [--no-email]

# Refresh backlog export after issue updates
node scripts/export-team-backlog/index.js

# Deploy after code changes
grunt build && grunt babel:server && pm2 restart fraBering
```

Auth: `ISSUES_EXPORT_EMAIL` + `ISSUES_EXPORT_PASSWORD` in `server/config/local.env.js`.

---

## Related docs

- `docs/rot-integration-plan.md` — Records slice (Phase 4), file paths
- `docs/team-backlog.md` — #23 full thread export
- `client/app/rot/records/records.controller.js` — `computeExpDate`, `approve`, `add`, `update`

---

## Open decisions (need Nate or Andy)

- [ ] Collapse legacy table by default when session panel exists?
- [ ] `submitted` status email to approvers?
- [ ] Migrate old rows to sessions or only new entries?
- [ ] Tier C (boards integration) — explicitly deferred
