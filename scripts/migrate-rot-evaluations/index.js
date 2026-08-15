#!/usr/bin/env node
'use strict';

/**
 * One-time import of ROT Evaluations Postgres rows into fraBering RotEvaluations.
 *
 * Usage (from repo root):
 *   ROT_SOURCE_URI='postgres://...' node -r babel-register scripts/migrate-rot-evaluations/index.js
 *   ROT_SOURCE_URI='postgres://...' node -r babel-register scripts/migrate-rot-evaluations/index.js --production
 *
 * Copy eval PDF attachments (run on prod host after DB import):
 *   mkdir -p server/fileserver/rot/attachments
 *   rsync -av ~/ROT/server/fileserver/attachments/ server/fileserver/rot/attachments/
 *
 * Ongoing PDF backups (prod → vultr + dev): docs/rot-backup-restore.md
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

const useProduction = process.argv.indexOf('--production') >= 0;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = useProduction ? 'production' : 'development';
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

const Sequelize = require('sequelize');
const sqldb = require('../../server/sqldb');
const sourceUri = process.env.ROT_SOURCE_URI;

if (!sourceUri) {
  console.error('Set ROT_SOURCE_URI (ROT Postgres connection) or add to local.env.js');
  process.exit(1);
}

const source = new Sequelize(sourceUri, {logging: false});
const target = sqldb.sequelize;

async function main() {
  console.log('NODE_ENV=' + process.env.NODE_ENV);
  console.log('Ensuring RotEvaluations table exists...');
  await sqldb.RotEvaluation.sync();

  const [rows] = await source.query('SELECT * FROM "Evaluations" ORDER BY "_id" ASC');
  console.log('Source Evaluations rows:', rows.length);

  const [existing] = await target.query('SELECT COUNT(*)::int AS count FROM "RotEvaluations"');
  const existingCount = existing[0] && existing[0].count ? existing[0].count : 0;
  if (existingCount > 0) {
    console.error('RotEvaluations already has ' + existingCount + ' rows — aborting to avoid duplicates.');
    console.error('Truncate or drop the table first if you need to re-import.');
    process.exit(1);
  }

  let inserted = 0;
  for (let row of rows) {
    const payload = Object.assign({}, row);
    delete payload._id;
    await target.query(
      `INSERT INTO "RotEvaluations" (${Object.keys(payload).map(k => `"${k}"`).join(', ')})
       VALUES (${Object.keys(payload).map((k, i) => `$${i + 1}`).join(', ')})`,
      {bind: Object.keys(payload).map(k => payload[k])}
    );
    inserted++;
  }
  console.log('Inserted into RotEvaluations:', inserted);
  await source.close();
  await target.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
