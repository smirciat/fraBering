# Nathaniel issues — ranked build queue

_Developer-approved batch from `scripts/issue-bulk-developer-approve`. Regenerate after triage._

**Rank order:** critical → high → medium → low, then newest id within tier.

| Rank | # | Priority | Status | Kind | Title |
|------|---|----------|--------|------|-------|
| 1 | #56 | critical | open | bug | Name Accuracy |
| 2 | #59 | medium | open | bug | Document date |
| 3 | #58 | medium | open | bug | Hazmat 2 year expiration |
| 4 | #57 | medium | open | bug | Hazmat Approval |
| 5 | #55 | medium | open | bug | Expiration Date Logic |
| 6 | #54 | medium | open | feature | Expiration format |
| 7 | #53 | medium | open | bug | 293(a) expiration updated when it shouldn't have |
| 8 | #52 | medium | open | feature | Training selection organization |
| 9 | #51 | medium | open | feature | Unaffiliated ROTs |
| 10 | #50 | medium | open | feature | AI Reads/interprets Medical |
| 11 | #49 | medium | open | bug | 135.293(a)1,4-8 not aircraft specific |
| 12 | #48 | medium | open | bug | Not allowing me to delete erroneous input |
| 13 | #47 | medium | open | feature | GOS option |
| 14 | #46 | medium | open | bug | Only Beech |
| 15 | #45 | medium | open | feature | Medical/Passport |
| 16 | #44 | medium | open | bug | Larger area so less scrolling is needed |
| 17 | #43 | medium | open | feature | Archive Pilots no longer employed |
| 18 | #42 | medium | open | bug | Error uploading medical |
| 19 | #23 | medium | ready_for_review | bug | Trying to rebase when not told to do so |
| 20 | #22 | medium | ready_for_review | bug | Training Records Dates not logging in previous dates |
| 21 | #29 | low | ready_for_review | bug | Duplicate row generation |

## Detail

### 1. #56 — Name Accuracy

- **Priority:** critical · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Conor Rocco Murray
Shawn Michael Thomas Graham

---

### 2. #59 — Document date

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Don't need a document date when selecting Cert, Annual resume, or drivers license.

---

### 3. #58 — Hazmat 2 year expiration

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Hazmat defaults to 1 year expiration Aug 27.  I manually updated expiration Aug 28.

---

### 4. #57 — Hazmat Approval

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

When I hit upload and approve it said it uploaded but did not.  Went down to the entry line and hit approve and it gave me this.  Reading the hazmat paperwork as a full up checkride.

---

### 5. #55 — Expiration Date Logic

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Expiration date logic for .297 must be based on day count.  Calculating 3/3/27 for new expiration.  Back to eliminating days and just using months.  For the 299/297g it isn't understanding that a new base overwrites a future base month.  299/297g should have 9/30/27 as expiration.  Seen this a couple times now.

---

### 6. #54 — Expiration format

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Why don't we just put expiration as 10/27.  Month and year.  All pilot dates expire at the end of the month so day is superfluous.  Unless you can think of a reason to keep it, lets drop the day.  Nice work Andy.

---

### 7. #53 — 293(a) expiration updated when it shouldn't have

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Built an entry and clicked BI and 293(a) then hit save.  Realized I couldn't upload 2 docs and attach them to the same entry, so when back and unclicked 293(a) then hit save again.  Then uploaded and approved BI ROT to BI section.  Somehow the 293(a) expiration was modified as well.  Not sure if this occurred when I hit save the first time (which it should not since no dates are modified until "approved") or if BI and 293(a) are incorrectly tied together.

---

### 8. #52 — Training selection organization

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Organized similar to my post it.  
Wouldn't need sub-options for 297/297g/299

---

### 9. #51 — Unaffiliated ROTs

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Need the ability to upload a ROT to a section without modifying base month.

Example:
Special approach training 

Will go under basic indoc section but will not affect base month and will not expire

Needs to be located under basic indoc section and shown on single line entry for that section

---

### 10. #50 — AI Reads/interprets Medical

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Is it possible for you to force your AI underling to have an option where I just upload the medical and STARR command reads/interprets/calculates expiration?  So I never need to type in any data for medicals, I just upload a picture?

---

### 11. #49 — 135.293(a)1,4-8 not aircraft specific

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Requiring an aircraft; aircraft not required and should not be entered on this flight test form.

---

### 12. #48 — Not allowing me to delete erroneous input

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Not allowing me to delete this 8/3 erroneous entry

---

### 13. #47 — GOS option

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

When I select 1900 ground, 208 ground, etc, I'd like a sub-option for GOS that is defaulted to checked, but can be unchecked.  Virtually all in-house aircraft ground has GOS simultaneously accomplished, so would make the whole process more efficient.

---

### 14. #46 — Only Beech

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

No Van N-numbers listed.  Only beeches it appears.

---

### 15. #45 — Medical/Passport

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Would like a table and history of current/previous medical/passport dates.  It could be built into the current training table.  So just left of Basic Indoc

---

### 16. #44 — Larger area so less scrolling is needed

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Make the training entry box larger so that less awkward scrolling is needed.

---

### 17. #43 — Archive Pilots no longer employed

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Need the ability to archive pilots no longer working here.  I'd like to have the option to do this, then have a selection to view archived pilot records.

---

### 18. #42 — Error uploading medical

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Telling me to select tab for medical upload.  I have "certs" selected.

---

### 19. #23 — Trying to rebase when not told to do so

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Uploading and approving is trying to rebase regardless of being told not to.

---

### 20. #22 — Training Records Dates not logging in previous dates

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Just added a new training record for Dawson.  It did not update the dates automatically in the training record date.  So I "edited the dates."  After doing this the date updated, but it did not update the "previous dates" with the date that was just overridden.

---

### 21. #29 — Duplicate row generation

- **Priority:** low · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

When I hit the "ROT" button to generate a ROT, the program creates a new row with no associated record.  So, I created the record then hit ROT and a ROT was generated.  I corrected the date on the record line then hit ROT again.  Duplicate line then created.  Also, after modifying date in the record line, hitting the ROT button does not generate a ROT with associated dates anymore.

---
