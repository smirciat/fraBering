#!/usr/bin/env node
'use strict';

/**
 * One-time migration: Firebase roster config + month meta -> Postgres.
 *
 * Usage (from repo root):
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=minimums
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=monthMeta
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=employees
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js --phase=all
 *   node -r babel-register scripts/migrate-roster-to-postgres/index.js --production
 */

const path = require('path');
const fs = require('fs');

function loadLocalEnv() {
  try {
    const envPath = path.join(__dirname, '../../server/config/local.env.js');
    const local = require(envPath);
    Object.keys(local).forEach(key => {
      if (
        process.env[key] === undefined &&
        local[key] !== undefined &&
        local[key] !== ''
      ) {
        process.env[key] = String(local[key]);
      }
    });
  } catch (e) {
    // local.env.js is optional
  }
}

function parseArgs(argv) {
  const args = { phase: 'all', production: false };
  argv.forEach(arg => {
    if (arg.indexOf('--phase=') === 0) args.phase = arg.slice(8);
    if (arg === '--production') args.production = true;
    if (arg === '--local') args.production = false;
  });
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = args.production ? 'production' : 'development';
}
loadLocalEnv();

const envFile = path.join(
  __dirname,
  '../../server/config/environment',
  process.env.NODE_ENV + '.js'
);
if (!fs.existsSync(envFile)) {
  console.error('Missing Sequelize env file: ' + envFile);
  if (process.env.NODE_ENV === 'development') {
    console.error('Copy server/config/environment/development.sample.js to development.js');
  }
  console.error('Or run with --production if SEQUELIZE_URI is set in local.env.js');
  process.exit(1);
}

require('babel-register');

const admin = require('firebase-admin');
const serviceAccount = require('../../server/firebase.json');
const sqldb = require('../../server/sqldb');
const {
  saveStaffingMinimums,
  minimumRowsFromFirebaseTree
} = require('../../server/api/rosterStaffingMinimum/rosterStaffingMinimum.store');
const {
  setMonthLock
} = require('../../server/api/rosterMonthMeta/rosterMonthMeta.store');
const {
  importScheduleDays
} = require('../../server/api/rosterScheduleCell/rosterScheduleCell.store');
const {
  migratePersonRequestsDoc
} = require('../../server/api/rosterCalendarRequest/rosterCalendarRequest.store');
const {
  migrateEmployeeDoc
} = require('../../server/api/rosterEmployee/rosterEmployee.store');
const {
  ensureRosterEmployeeSchema
} = require('../../server/api/rosterEmployee/rosterEmployee.schema');

const ROSTER_CONFIG_COLLECTION = 'rosterconfig';
const ROSTER_MONTH_META_COLLECTION = 'rostermonthmeta';
const ROSTER_SCHEDULES_COLLECTION = 'rosterschedules';
const ROSTER_CALENDAR_COLLECTION = 'rostercalendar';
const EMPLOYEES_COLLECTION = 'employees';

function initFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
}

async function migrateMinimums(firebaseDb) {
  const snap = await firebaseDb.collection(ROSTER_CONFIG_COLLECTION).doc('staffingMinimums').get();
  if (!snap.exists) {
    console.log('No Firebase staffingMinimums doc found; skipping minimums migration.');
    return { rows: 0 };
  }
  const minimums = snap.data().minimums;
  if (!minimums || typeof minimums !== 'object') {
    console.log('Firebase staffingMinimums doc has no minimums tree; skipping.');
    return { rows: 0 };
  }
  await saveStaffingMinimums(minimums, snap.data().updatedBy || 'migration');
  const rows = minimumRowsFromFirebaseTree(minimums).length;
  console.log(`Migrated staffing minimums (${rows} rows).`);
  return { rows };
}

async function migrateMonthMeta(firebaseDb) {
  const snapshot = await firebaseDb.collection(ROSTER_MONTH_META_COLLECTION).get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    await setMonthLock(
      doc.id,
      !!data.locked,
      data.lockedBy || null
    );
    count++;
    console.log(`Migrated month meta ${doc.id} (locked=${!!data.locked})`);
  }
  if (!count) console.log('No Firebase rostermonthmeta docs found.');
  return { count };
}

function parseScheduleDocId(docId, data) {
  let base = data && data.base;
  let monthKey = data && data.monthKey;
  if (base && monthKey) return { base, monthKey };
  const match = String(docId).match(/^([A-Z]+)-(\d{4}-\d{2})$/);
  if (!match) return null;
  return { base: match[1], monthKey: match[2] };
}

async function migrateSchedules(firebaseDb) {
  const snapshot = await firebaseDb.collection(ROSTER_SCHEDULES_COLLECTION).get();
  let docCount = 0;
  let rowCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const parsed = parseScheduleDocId(doc.id, data);
    if (!parsed) {
      console.log(`Skipping schedule doc with unknown id: ${doc.id}`);
      continue;
    }
    const imported = await importScheduleDays(parsed.base, parsed.monthKey, data.days || {});
    docCount++;
    rowCount += imported;
    console.log(`Migrated schedule ${doc.id} (${imported} cells)`);
  }
  if (!docCount) console.log('No Firebase rosterschedules docs found.');
  return { docCount, rowCount };
}

async function migrateCalendarRequests(firebaseDb) {
  const snapshot = await firebaseDb.collection(ROSTER_CALENDAR_COLLECTION).get();
  let docCount = 0;
  let rowCount = 0;
  for (const doc of snapshot.docs) {
    const imported = await migratePersonRequestsDoc(doc);
    docCount++;
    rowCount += imported;
    console.log(`Migrated calendar ${doc.id} (${imported} requests)`);
  }
  if (!docCount) console.log('No Firebase rostercalendar docs found.');
  return { docCount, rowCount };
}

async function migrateEmployees(firebaseDb) {
  const snapshot = await firebaseDb.collection(EMPLOYEES_COLLECTION).get();
  let docCount = 0;
  for (const doc of snapshot.docs) {
    await migrateEmployeeDoc(doc);
    docCount++;
    console.log(`Migrated employee ${doc.id} (${(doc.data() || {}).displayName || 'unknown'})`);
  }
  if (!docCount) console.log('No Firebase employees docs found.');
  return { docCount };
}

async function main() {
  console.log(`NODE_ENV=${process.env.NODE_ENV}`);
  const firebaseDb = initFirebase();

  await ensureRosterEmployeeSchema(sqldb.sequelize);
  await sqldb.sequelize.sync();

  if (args.phase === 'minimums' || args.phase === 'all') {
    await migrateMinimums(firebaseDb);
  }
  if (args.phase === 'monthMeta' || args.phase === 'all') {
    await migrateMonthMeta(firebaseDb);
  }
  if (args.phase === 'schedules' || args.phase === 'all') {
    await migrateSchedules(firebaseDb);
  }
  if (args.phase === 'calendarRequests' || args.phase === 'all') {
    await migrateCalendarRequests(firebaseDb);
  }
  if (args.phase === 'employees' || args.phase === 'all') {
    await migrateEmployees(firebaseDb);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
