# Nathaniel issues — ranked build queue

_Developer-approved batch from `scripts/issue-bulk-developer-approve`. Regenerate after triage._

**Rank order:** critical → high → medium → low, then newest id within tier.

| Rank | # | Priority | Status | Kind | Title |
|------|---|----------|--------|------|-------|
| 1 | #56 | critical | ready_for_review | bug | Name Accuracy |
| 2 | #67 | medium | open | bug | No option to add a/c, flight time for stand alone .299 |
| 3 | #66 | medium | open | bug | 293(a)1,4-8 |
| 4 | #65 | medium | open | feature | Move read medical button |
| 5 | #64 | medium | open | feature | Pending view |
| 6 | #63 | medium | open | feature | Create a new user |
| 7 | #62 | medium | open | bug | Uploading and Approving Passport |
| 8 | #61 | medium | open | bug | Expiration date logic incorrect when creating flight test form |
| 9 | #60 | medium | open | bug | Does not automatically rebase future dates |
| 10 | #59 | medium | ready_for_review | bug | Document date |
| 11 | #58 | medium | ready_for_review | bug | Hazmat 2 year expiration |
| 12 | #57 | medium | ready_for_review | bug | Hazmat Approval |
| 13 | #55 | medium | ready_for_review | bug | Expiration Date Logic |
| 14 | #54 | medium | ready_for_review | feature | Expiration format |
| 15 | #53 | medium | ready_for_review | bug | 293(a) expiration updated when it shouldn't have |
| 16 | #52 | medium | ready_for_review | feature | Training selection organization |
| 17 | #51 | medium | ready_for_review | feature | Unaffiliated ROTs |
| 18 | #50 | medium | ready_for_review | feature | AI Reads/interprets Medical |
| 19 | #49 | medium | ready_for_review | bug | 135.293(a)1,4-8 not aircraft specific |
| 20 | #48 | medium | ready_for_review | bug | Not allowing me to delete erroneous input |
| 21 | #47 | medium | ready_for_review | feature | GOS option |
| 22 | #46 | medium | ready_for_review | bug | Only Beech |
| 23 | #45 | medium | ready_for_review | feature | Medical/Passport |
| 24 | #44 | medium | ready_for_review | bug | Larger area so less scrolling is needed |
| 25 | #43 | medium | ready_for_review | feature | Archive Pilots no longer employed |
| 26 | #42 | medium | ready_for_review | bug | Error uploading medical |
| 27 | #23 | medium | ready_for_review | bug | Trying to rebase when not told to do so |
| 28 | #22 | medium | ready_for_review | bug | Training Records Dates not logging in previous dates |
| 29 | #29 | low | ready_for_review | bug | Duplicate row generation |

## Detail

### 1. #56 — Name Accuracy

- **Priority:** critical · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Conor Rocco Murray
Shawn Michael Thomas Graham

---

### 2. #67 — No option to add a/c, flight time for stand alone .299

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON
---

### 3. #66 — 293(a)1,4-8

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Found where this was located.  This is technically a "flight test" so could you move it to the right side under flight and have it as its own section?  Nice work Andy.

---

### 4. #65 — Move read medical button

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

In the area that you upload and approve, when I select medical, I want the option to only be upload, read, approve.  Or something similar.  So all I need to do for a medical is scan it then press one button and it reads/uploads med date, but would also like a "expiration, new base" type popup so I can see it performed the function correctly and if it didn't I can modify it right there on the spot like base month.

---

### 5. #64 — Pending view

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Would like a way to view all "pending" or "not yet approved" training records in the system.  Also, I way to see all approved records not associated with a document.  This shouldn't happen but I feel like we probably have some in the system already.

---

### 6. #63 — Create a new user

- **Priority:** medium · **Status:** open · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

trying to build accounts for the new SICs.  Thought I saw a way to do this, but it did not.  It would be nice to be able to create a new user and then that's either pushed or synced with flight report.

---

### 7. #62 — Uploading and Approving Passport

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Gave me an error when I tried to upload and approve passport.  I was able to upload the passport but without approving it, the dates were not changed in the pilot board.

---

### 8. #61 — Expiration date logic incorrect when creating flight test form

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

screen shot of what STARR command created vs what Timmy Time created.  Timmy's is accurate.

---

### 9. #60 — Does not automatically rebase future dates

- **Priority:** medium · **Status:** open · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

293(b) for the caravan did not want to rebase Adam.  All others appeared to work accurately.

---

### 10. #59 — Document date

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Don't need a document date when selecting Cert, Annual resume, or drivers license.

---

### 11. #58 — Hazmat 2 year expiration

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Hazmat defaults to 1 year expiration Aug 27.  I manually updated expiration Aug 28.

---

### 12. #57 — Hazmat Approval

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

When I hit upload and approve it said it uploaded but did not.  Went down to the entry line and hit approve and it gave me this.  Reading the hazmat paperwork as a full up checkride.

---

### 13. #55 — Expiration Date Logic

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Expiration date logic for .297 must be based on day count.  Calculating 3/3/27 for new expiration.  Back to eliminating days and just using months.  For the 299/297g it isn't understanding that a new base overwrites a future base month.  299/297g should have 9/30/27 as expiration.  Seen this a couple times now.

---

### 14. #54 — Expiration format

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Why don't we just put expiration as 10/27.  Month and year.  All pilot dates expire at the end of the month so day is superfluous.  Unless you can think of a reason to keep it, lets drop the day.  Nice work Andy.

---

### 15. #53 — 293(a) expiration updated when it shouldn't have

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Built an entry and clicked BI and 293(a) then hit save.  Realized I couldn't upload 2 docs and attach them to the same entry, so when back and unclicked 293(a) then hit save again.  Then uploaded and approved BI ROT to BI section.  Somehow the 293(a) expiration was modified as well.  Not sure if this occurred when I hit save the first time (which it should not since no dates are modified until "approved") or if BI and 293(a) are incorrectly tied together.

---

### 16. #52 — Training selection organization

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Organized similar to my post it.  
Wouldn't need sub-options for 297/297g/299

---

### 17. #51 — Unaffiliated ROTs

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Need the ability to upload a ROT to a section without modifying base month.

Example:
Special approach training 

Will go under basic indoc section but will not affect base month and will not expire

Needs to be located under basic indoc section and shown on single line entry for that section

---

### 18. #50 — AI Reads/interprets Medical

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Is it possible for you to force your AI underling to have an option where I just upload the medical and STARR command reads/interprets/calculates expiration?  So I never need to type in any data for medicals, I just upload a picture?

---

### 19. #49 — 135.293(a)1,4-8 not aircraft specific

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Requiring an aircraft; aircraft not required and should not be entered on this flight test form.

---

### 20. #48 — Not allowing me to delete erroneous input

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Not allowing me to delete this 8/3 erroneous entry

---

### 21. #47 — GOS option

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

When I select 1900 ground, 208 ground, etc, I'd like a sub-option for GOS that is defaulted to checked, but can be unchecked.  Virtually all in-house aircraft ground has GOS simultaneously accomplished, so would make the whole process more efficient.

---

### 22. #46 — Only Beech

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

No Van N-numbers listed.  Only beeches it appears.

---

### 23. #45 — Medical/Passport

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Would like a table and history of current/previous medical/passport dates.  It could be built into the current training table.  So just left of Basic Indoc

---

### 24. #44 — Larger area so less scrolling is needed

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Make the training entry box larger so that less awkward scrolling is needed.

---

### 25. #43 — Archive Pilots no longer employed

- **Priority:** medium · **Status:** ready_for_review · **Kind:** feature
- **Reporter:** NATHANIEL OLSON

Need the ability to archive pilots no longer working here.  I'd like to have the option to do this, then have a selection to view archived pilot records.

---

### 26. #42 — Error uploading medical

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Telling me to select tab for medical upload.  I have "certs" selected.

---

### 27. #23 — Trying to rebase when not told to do so

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Uploading and approving is trying to rebase regardless of being told not to.

---

### 28. #22 — Training Records Dates not logging in previous dates

- **Priority:** medium · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

Just added a new training record for Dawson.  It did not update the dates automatically in the training record date.  So I "edited the dates."  After doing this the date updated, but it did not update the "previous dates" with the date that was just overridden.

---

### 29. #29 — Duplicate row generation

- **Priority:** low · **Status:** ready_for_review · **Kind:** bug
- **Reporter:** NATHANIEL OLSON

When I hit the "ROT" button to generate a ROT, the program creates a new row with no associated record.  So, I created the record then hit ROT and a ROT was generated.  I corrected the date on the record line then hit ROT again.  Duplicate line then created.  Also, after modifying date in the record line, hitting the ROT button does not generate a ROT with associated dates anymore.

---
