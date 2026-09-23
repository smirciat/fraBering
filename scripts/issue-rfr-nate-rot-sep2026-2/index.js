#!/usr/bin/env node

/**
 * Mark Nate ROT batch #2 (issues 60–67) ready_for_review + comment, NO email.
 *
 *   node scripts/issue-rfr-nate-rot-sep2026-2/index.js
 *   node scripts/issue-rfr-nate-rot-sep2026-2/index.js --local
 *
 * Summary email (do not send from this script): docs/nate-rot-verification-email-2026-09-2.txt
 */

'use strict';

const http = require('http');
const https = require('https');
const {loadLocalEnv, authHeaders} = require('../issue-auth');

const LOCAL_API_BASE = 'http://localhost:9000';
const PROD_API_BASE = 'https://frat.beringair.com';

const UPDATES = [
  {
    id: 60,
    body: `Ready for your review (on today's deploy).

**293(b) rebase**
• PIC/SIC checkride expirations (Caravan, 1900, King Air, Sky Courier, Casa) now rebase from the check date: end of that month, plus 12 months.
• They no longer follow the old base-month table that left the Caravan a month off.

**Please check:** Re-approve or preview a 293(b) PIC/SIC (Adam Baker / C208 was the example). Proposed expiration should land on the check month, not a month early. Cancel the preview if you only want to look.`
  },
  {
    id: 61,
    body: `Ready for your review (on today's deploy).

**Flight Test PDF expirations**
• Flight Test form dates now use the same expiration as the pilot profile and the approval preview, not the old calculator alone.

**Please check:** On a saved checkride row, set the aircraft, open Flight Test, and compare the PDF dates to the pilot board. They should match (month/year).`
  },
  {
    id: 62,
    body: `Ready for your review (on today's deploy).

**Passport upload and approve**
• CERT → Passport no longer needs a training record.
• Set Document Date to the passport expiration (full date), choose the PDF, then Upload and Approve.
• That writes the passport date on the pilot profile.

**Please check:** Passport upload and approve updates the passport date on the board. The stored date stays a full calendar date.`
  },
  {
    id: 63,
    body: `Ready for your review (on today's deploy).

**New pilot**
• Training Records has a **New pilot** button (the name list still has **new** as well).
• Enter the roster name, the employee number (digits), and a base (OME, OTZ, or HEL), then Confirm/Save.
• That creates the pilot on the shared list Flight Report uses. It does not copy another pilot's training history.

**Please check:** Add one new SIC with their real employee number and base. They should appear in the pilot list. Do not reuse a number that already exists.`
  },
  {
    id: 64,
    body: `Ready for your review (on today's deploy).

**Pending records and missing documents**
• On Training Records, open **Pending records and missing documents**.
• First list: every saved training record that is not approved yet, across pilots.
• Second list: approved records that have no uploaded file tied to that record.
• Click a row to open that pilot.

**Please check:** Both lists look right against pilots you know. A file counts as attached when its name includes that record.`
  },
  {
    id: 65,
    body: `Ready for your review (on today's deploy).

**Medical upload, read, and approve**
• CERT → Medical: **Read medical from newest CERT scan**, then **Upload and Approve** (no training record required).
• After upload and approve, a preview shows the exam date and computed expiration so you can correct it before it sticks.

**Please check:** Scan or read a medical, Upload and Approve, and confirm the preview matches the certificate before you accept it.`
  },
  {
    id: 66,
    body: `Ready for your review (on today's deploy).

**293(a) 1,4-8 placement**
• In the training-type picker, **General Emergency (293(a) 1,4-8)** is on the **Flight** side, as its own row, not under Basic Indoc.

**Please check:** Type on a draft row → Flight side → General Emergency is at the top.`
  },
  {
    id: 67,
    body: `Ready for your review (on today's deploy).

**Aircraft and flight time on a standalone 299**
• A row with **299**, **297**, or **297g** (even without a PIC/SIC checkride) now asks for tail number and flight time.
• Checkrides still ask for those too.

**Please check:** A 299-only record shows N# and hours. A ground-only record does not.`
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
      emailReporter: false,
      emailDeveloper: false
    });
    console.log('  ready_for_review + comment (no email)');
  }

  console.log('Done (' + UPDATES.length + ' issues).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
