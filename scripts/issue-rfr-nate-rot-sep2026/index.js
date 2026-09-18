#!/usr/bin/env node

/**
 * Mark Nate ROT batch (issues 42–59) ready_for_review + comment, NO email.
 *
 *   node scripts/issue-rfr-nate-rot-sep2026/index.js
 *   node scripts/issue-rfr-nate-rot-sep2026/index.js --local
 *
 * Verifier email (formatted Gmail): docs/nate-rot-verification-email-2026-09.html
 * See docs/verifier-email-from-html.md (download HTML to Mac → Finder → double-click → copy).
 * Batch handoff: docs/nate-rot-batch-2026-09.md
 */

'use strict';

const http = require('http');
const https = require('https');
const {loadLocalEnv, authHeaders} = require('../issue-auth');

const LOCAL_API_BASE = 'http://localhost:9000';
const PROD_API_BASE = 'https://frat.beringair.com';

const UPDATES = [
  {
    id: 56,
    body: `Ready for your review (deployed pending Andy’s build).

**Legal names on training PDFs**
• Pilots can have a separate **legal name** (as on the FAA certificate) while roster name stays the same.
• Training Records and ROT/Flight Test PDFs use legal name when set.
• **Edit Pilot Training Dates** and the pilot dropdown have fields to set legal name; **Infer from CERT scan** can pull it from the newest medical or certificate scan when the scan is readable.

**Please check:** Pick a pilot with a multi-part legal name, confirm PDFs and records show the full name; try infer from scan if you have a clear CERT upload.`
  },
  {
    id: 59,
    body: `Ready for your review.

**Document date on CERT uploads**
• Uploading **Certificate**, **Annual Resume**, **Driver’s License**, or **Medical** no longer asks for a separate document date in the upload box.
• The system uses the upload date in the file name where needed.

**Please check:** CERT → each of those types → upload flow has no document date step (unless you linked a training record that still needs dates).`
  },
  {
    id: 58,
    body: `Ready for your review.

**Hazmat expiration (24 months)**
• Hazmat on the **HAZ** tab now uses a **24-month** expiration when approving/updating, same as other hazmat handling.

**Please check:** HAZ record approve → expiration month on pilot profile and board looks correct (~24 months from base month).`
  },
  {
    id: 57,
    body: `Ready for your review.

**Hazmat upload & approve**
• Hazmat upload/approve must be tied to a **saved training record** with training types selected (same idea as other approvals).
• Training type checkboxes stay in sync when you use the type picker.

**Please check:** HAZ upload without a linked record should warn; with a proper record, approve updates hazmat expiration.`
  },
  {
    id: 55,
    body: `Ready for your review.

**Expiration date rules**
• Base-month math for **299**, **297**, and **297g** adjusted per your notes (including end-of-month behavior and 297g vs BI).

**Please check:** Approve or edit dates for those items and confirm expirations match what you expect on the summary table and pilot board.`
  },
  {
    id: 54,
    body: `Ready for your review.

**Expiration display (M/YY)**
• Training expiration columns on Records and Pilot Board show **month/year** in a consistent short format.

**Please check:** Spot-check several exp columns — should read like 2/27 not long date strings.`
  },
  {
    id: 53,
    body: `Ready for your review.

**293(a) vs Basic Indoc expiration**
• Approving **BI** no longer incorrectly moves the **293(a)** expiration column.
• Pilot board 293(a) column uses the correct field.

**Please check:** BI-only update should not change 293(a) exp; 293(a) still updates when that training is approved.`
  },
  {
    id: 52,
    body: `Ready for your review.

**Training type picker layout**
• Click **Type** on a record → picker is grouped **Ground** vs **Flight** (easier to find items).

**Please check:** Open picker on a draft row; confirm layout matches how you think about ground vs flight events.`
  },
  {
    id: 51,
    body: `Ready for your review.

**Unaffiliated ROTs**
• Under **BI** tab there is an **Unaffiliated** option with a short description in the file name.
• These uploads do **not** change base month or pilot expirations; they show under that tab’s single-line entry.

**Please check:** Upload an unaffiliated item with a label; confirm it files correctly and does not move training dates.`
  },
  {
    id: 50,
    body: `Ready for your review.

**Medical read from scan**
• After a **CERT Medical** upload, the system tries to read **exam date** and **class** from the scan (server OCR).
• **Read medical from newest CERT scan** button when CERT + Medical is selected.
• Sideways scans: server tries several orientations when ImageMagick is installed on the server.
• If OCR fails, you can still enter date/class manually.

**Please check:** Upload a clear medical scan; confirm profile date/class update or sensible message if scan is poor.`
  },
  {
    id: 49,
    body: `Ready for your review.

**293(a) without aircraft**
• Events like **293(a)** that are not a PIC/SIC checkride no longer require aircraft, N#, or flight time.
• Only real checkride lines require those fields.

**Please check:** 293(a) + check airman, no PIC line → save/approve without aircraft. PIC checkride still asks for aircraft/N#.`
  },
  {
    id: 48,
    body: `Ready for your review.

**Delete bad rows**
• **Delete** removes the correct row even when approved records are hidden from the list.
• Draft rows can be removed before save.

**Please check:** Create a mistake row, delete it; with “hide approved” on, delete should not remove the wrong person’s row.`
  },
  {
    id: 47,
    body: `Ready for your review.

**GOS & General Emergency in type picker**
• **Ground** training (208, 1900, etc.) → nested **GOS**, on by default, can be turned off.
• **BI** → optional **General Emergency (293(a))**, not auto-checked.

**Please check:** 1900 ground → GOS appears checked; uncheck GOS only; BI → GE optional.`
  },
  {
    id: 46,
    body: `Ready for your review.

**Tail numbers by aircraft type**
• N# dropdown on checkrides uses the full fleet list (not only 1900s).
• Choosing **C208** shows **Caravan** tails; **B190** shows 1900 tails, etc.

**Please check:** C208 PIC line → Caravan N-numbers; B190 → 1900 tails.`
  },
  {
    id: 45,
    body: `Ready for your review.

**Medical & passport on summary table**
• **Medical** and **Passport** columns added **left of Basic Indoc** on “All Training Dates,” with Current / Previous rows like other training.
• History updates when you change medical/passport or use medical scan.

**Please check:** Columns visible; change medical in assignment or passport in edit modal → Previous row; restore prior (approver) if needed.`
  },
  {
    id: 44,
    body: `Ready for your review.

**Larger training entry area**
• **Type** column is a bigger click target with wrapped text.
• Training type modal is wider; Ground and Flight side-by-side on a large screen to reduce scrolling.

**Please check:** Pick types on a busy record; confirm less awkward scrolling in the modal.`
  },
  {
    id: 43,
    body: `Ready for your review.

**Archive pilots**
• Approvers can **Archive pilot** (no longer on active lists) or **Restore**.
• **Show archived pilots** checkbox on the pilot selector to open their old records.

**Please check:** Archive someone → gone from list → check “show archived” → view records → restore.`
  },
  {
    id: 42,
    body: `Ready for your review.

**Medical upload / CERT tab**
• Choosing **UPLOAD A CERT** in the training-record dropdown no longer hides the CERT type picker (Medical, Certificate, etc.).
• You can pick **Medical** after UPLOAD A CERT without refreshing the page.

**Please check:** UPLOAD A CERT → Medical → upload; also confirm linking a real training record still hides the extra tab row (by design).`
  }
];

function resolveApiBase() {
  if (process.argv.includes('--local')) return LOCAL_API_BASE;
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  return PROD_API_BASE;
}

function requestJson(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: method,
        headers: Object.assign(
          {'Content-Type': 'application/json'},
          data ? {'Content-Length': Buffer.byteLength(data)} : {},
          headers || {}
        )
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 400) {
            reject(new Error('HTTP ' + res.statusCode + ' ' + method + ' ' + url + ': ' + text));
            return;
          }
          try {
            resolve(text ? JSON.parse(text) : {});
          } catch (e) {
            resolve(text);
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  loadLocalEnv();
  const base = resolveApiBase();
  const auth = await authHeaders(base);
  console.log('Using ' + base + ' (no email)...');

  for (const item of UPDATES) {
    console.log('Issue #' + item.id + '...');
    await requestJson('PATCH', base + '/api/issues/' + item.id, auth.headers, {status: 'ready_for_review'});
    await requestJson('POST', base + '/api/issues/' + item.id + '/comments', auth.headers, {
      body: item.body,
      emailReporter: false
    });
    console.log('  ready_for_review + comment (no email)');
  }

  console.log('Done (' + UPDATES.length + ' issues).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
