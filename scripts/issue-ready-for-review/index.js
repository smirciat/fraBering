#!/usr/bin/env node

/**
 * Mark issues ready_for_review, post a shipped comment, and email the reporter.
 *
 *   node scripts/issue-ready-for-review/index.js
 *   node scripts/issue-ready-for-review/index.js --local
 *
 * Auth: ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD in server/config/local.env.js
 * (admin user — same pattern as export-team-backlog fallback).
 */

'use strict';

const path = require('path');
const http = require('http');
const https = require('https');

const LOCAL_API_BASE = 'http://localhost:9000';
const PROD_API_BASE = 'https://frat.beringair.com';

function loadLocalEnv() {
  try {
    const local = require(path.join(__dirname, '../../server/config/local.env.js'));
    Object.keys(local).forEach((key) => {
      if (process.env[key] === undefined && local[key] !== undefined && local[key] !== '') {
        process.env[key] = String(local[key]);
      }
    });
  } catch (e) {
    // optional
  }
}

loadLocalEnv();

const UPDATES = [
  {
    id: 25,
    body: `Shipped in dev — ready for your review.

Addresses overdue standby-charter time popups (#25):

• Takeflite OFF/land times now import into intermediate village arrival/departure fields when available (each tf() sync, ~1 min). Manual dispatcher entries are never overwritten.
• Popups only for **enroute** standby charters missing intermediate times **45+ min** past estimate — not origin/final.
• Modal copy clarifies: intermediate villages only; Takeflite fills OFF when logged there.
• **Dismiss for today** hides that specific stop (not the whole flight). Max 2 reminders per flight per session; 15 min cooldown.
• Standby charter detection is now **ground-time only** (45+ min scheduled on the ground at a village) — multi-leg and long-block rules removed (see #13).

Please verify as dispatch: on a live standby charter with Takeflite OFF logged at a village, confirm Flight Release → Amendments shows the time and the popup does not repeat for that stop.`
  },
  {
    id: 13,
    body: `Update shipped in dev — ready for your review.

Standby charter follow-ups from your latest comments:

• **BRG594 false flag fixed** — removed 6+ leg and total block-time rules. Standby Charter now flags only when a charter has **45+ minutes scheduled on the ground** at an intermediate village (arrival to departure at that stop). Multi-leg flights moving most of the time stay plain Charter.
• **BRG702 / 703 ETA** — HHMM without colons (e.g. 1257, 1432) now parses correctly; fixes bogus Updated ETA like 03:03. Intermediate departure recalculates Updated ETA on save.
• **FPL strip** — upper En Route ETA line now uses Updated ETA when set (not only the lower time row).
• Takeflite OFF/land import for intermediate stops (same as #25).

Please verify: BRG703-style round-robin with long ground time at UNK still shows Standby Charter and intermediate fields; BRG594-style multi-leg should not. On an active enroute standby, enter intermediate times and confirm Updated ETA on board and in Flight Release.`
  },
  {
    id: 16,
    body: `Update shipped in dev — ready for your review.

Per your feedback on Updated ETA:

• Flight Release now shows **ETA 10:50** (planned final) with prompt **Update the ETA?** and HH:MM input below — inside Amendments.
• **Flight terminated away from base** checkbox removed per your note (use Takeflite status + Amendments text for rare cases).
• **WBB 1150 → 1247 fix** — createETA now handles 24hr local wrap and HHMM entry without colons.

Please verify on an enroute flight: open Flight Release → Amendments, confirm ETA label/readout, enter updated ETA, save, reopen modal and confirm board strip shows updated time.`
  },
  {
    id: 26,
    body: `Shipped — ready for your review.

• **N62AR** (sold) and **N644CH** (overhaul) marked inactive in Firebase.
• HEL fleet sidebar and navbar aircraft list filter \`isInactive\` tails.

Please verify on HEL status view: neither tail appears in the right-hand fleet list. Script added for future retirements: \`node scripts/mark-aircraft-inactive/index.js NxxXX\`.`
  },
  {
    id: 17,
    body: `Partial update shipped in dev — ready for your review (with caveat).

**Shipped in this build**
• Ground Services helicopter fuel: single-tank Fill To, FOB, ADD (prior pass).
• HEL status board cards now show fuel summary via the same logic (gal / hrs / fuel request string) instead of blank "—hrs LA:".

**Still open — waiting on Flight Report investigation**
• Fuel and Load Available remain blank on many HEL status board rows when Flight Report has not synced fuel/weight to Firebase (old app version, duplicate plan without fuel, etc.). Left-click a card → browser console shows raw flight/heliSource for troubleshooting.
• Helicopter Load Available on the status board depends on weight fields on the Firebase PFR; we are **not changing fraBering further** until we confirm what Flight Report is (or is not) sending.

Please verify Ground Services and HEL board on a flight with fuel entered on a current FR build. If fuel is on the iPad but blank here, send PFR id from console — we'll trace on the Flight Report side.`
  }
];

function resolveApiBase() {
  if (process.argv.includes('--local')) {
    return LOCAL_API_BASE;
  }
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }
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
  const email = process.env.ISSUES_EXPORT_EMAIL;
  const password = process.env.ISSUES_EXPORT_PASSWORD;
  if (!email || !password) {
    throw new Error('Set ISSUES_EXPORT_EMAIL + ISSUES_EXPORT_PASSWORD in server/config/local.env.js');
  }

  const base = resolveApiBase();
  console.log('Logging in to ' + base + '...');
  const login = await requestJson('POST', base + '/auth/local', {}, {email, password});
  if (!login.token) {
    throw new Error('Login succeeded but no token returned');
  }
  const headers = {authorization: 'Bearer ' + login.token};

  for (const item of UPDATES) {
    console.log('Issue #' + item.id + '...');
    await requestJson('PATCH', base + '/api/issues/' + item.id, headers, {status: 'ready_for_review'});
    await requestJson('POST', base + '/api/issues/' + item.id + '/comments', headers, {
      body: item.body,
      emailReporter: true
    });
    console.log('  ready_for_review + comment emailed');
  }

  console.log('Done (' + UPDATES.length + ' issues).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
