'use strict';

/**
 * Rewrite Firebase pilot training expirations from M/YY (9/27) back to MM/01/YYYY (09/01/2027).
 * Also rewrites matching strings inside trainingExpHistory and records.priorExpDates.
 *
 *   node scripts/restore-pilot-exp-my-dates/index.js
 *   node scripts/restore-pilot-exp-my-dates/index.js --apply
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../server/firebase.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const apply = process.argv.indexOf('--apply') > -1;

function storedExpDate(value) {
  if (typeof value !== 'string') return value;
  const parts = value.trim().split('/');
  if (parts.length !== 2) return value;
  const month = parseInt(parts[0], 10);
  let year = parseInt(parts[1], 10);
  if (!month || month < 1 || month > 12 || isNaN(year)) return value;
  const yearDigits = String(parts[1]).length;
  if (yearDigits !== 2 && yearDigits !== 4) return value;
  if (year < 100) year += 2000;
  const mm = month < 10 ? '0' + month : String(month);
  return mm + '/01/' + year;
}

function isExpFieldKey(key) {
  return key === 'far293a148' || /Exp$/.test(key);
}

async function restorePilots() {
  const snap = await db.collection('pilots').get();
  let docs = 0;
  let fields = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const patch = {};
    const notes = [];
    Object.keys(data).forEach(key => {
      if (!isExpFieldKey(key)) return;
      const next = storedExpDate(data[key]);
      if (next !== data[key]) {
        patch[key] = next;
        notes.push(key + ' ' + data[key] + ' -> ' + next);
        fields += 1;
      }
    });
    if (data.trainingExpHistory && typeof data.trainingExpHistory === 'object') {
      const history = JSON.parse(JSON.stringify(data.trainingExpHistory));
      let historyChanged = false;
      Object.keys(history).forEach(expKey => {
        const rows = history[expKey];
        if (!Array.isArray(rows)) return;
        rows.forEach(row => {
          if (!row || typeof row.exp !== 'string') return;
          const next = storedExpDate(row.exp);
          if (next !== row.exp) {
            row.exp = next;
            historyChanged = true;
          }
        });
      });
      if (historyChanged) patch.trainingExpHistory = history;
    }
    if (!Object.keys(patch).length) continue;
    docs += 1;
    console.log((apply ? 'WRITE' : 'DRY') + ' pilots/' + doc.id + ' ' + (data.name || '') + ' ' + notes.join('; '));
    if (apply) await doc.ref.set(patch, { merge: true });
  }
  console.log('pilots', docs, 'fields', fields, apply ? 'applied' : 'dry-run');
}

async function restoreRecordSnapshots() {
  const snap = await db.collection('records').get();
  let docs = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const prior = data.priorExpDates;
    if (!prior || typeof prior !== 'object') continue;
    const next = JSON.parse(JSON.stringify(prior));
    let changed = false;
    Object.keys(next).forEach(key => {
      const converted = storedExpDate(next[key]);
      if (converted !== next[key]) {
        next[key] = converted;
        changed = true;
      }
    });
    if (!changed) continue;
    docs += 1;
    console.log((apply ? 'WRITE' : 'DRY') + ' records/' + doc.id + ' priorExpDates');
    if (apply) await doc.ref.set({ priorExpDates: next }, { merge: true });
  }
  console.log('records', docs, apply ? 'applied' : 'dry-run');
}

restorePilots()
  .then(restoreRecordSnapshots)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
