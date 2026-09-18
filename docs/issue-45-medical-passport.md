# Issue #45 — Medical / Passport history on Records

## Request

Table of current and previous **medical** and **passport** expirations on **Records**, integrated into the existing training expiration summary — columns **left of Basic Indoc**.

## Implementation

- `rotAppConfig.certDocSummaryColumns`: **Medical**, **Passport** (before `trainingEventKeys` in the table).
- **Medical — Current:** computed expiration from `medicalDate`, `medicalClass`, `dateOfBirth`, and optional `medicalInterval` (same rules as pilot board, without the FIRST→SECOND revert side effect).
- **Passport — Current:** `pilot.passport` (expiration date).
- **Previous rows:** `trainingExpHistory.medicalExp` and `trainingExpHistory.passport` (up to 2 prior values), same Current / Previous / Previous layout as training events.
- History is appended when:
  - **Edit Pilot Training Dates** modal saves (manual),
  - **Save Pilot Assignment** changes medical fields,
  - **Read medical from CERT scan** changes computed expiration.
- Approvers can **restore** a previous passport date, or a previous medical exam snapshot (when the history entry stored `medicalDate` / class).

## Files

- `client/app/rot/rot.constants.js`
- `client/app/rot/records/records.controller.js`
- `client/app/rot/records/records.html`
- `client/app/rot/records/records.css` — slightly narrower cert columns

## Deploy

Client only: **`grunt build`**.

## QA

1. Select pilot with medical + passport on profile → **Medical** and **Passport** appear left of **BasicIndoc**.
2. Change medical date in assignment section → save → prior medical exp appears under **Previous**.
3. Edit passport in training-dates modal → save → prior passport under **Previous**.
4. Click shaded **Previous** medical cell → restores prior exam date/class when logged.
