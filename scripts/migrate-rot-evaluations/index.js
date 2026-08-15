#!/usr/bin/env node
'use strict';

/**
 * One-time import of ROT Evaluations Postgres rows into fraBering RotEvaluations.
 *
 * Usage (from repo root):
 *   ROT_SOURCE_URI='postgres://...' node -r babel-register scripts/migrate-rot-evaluations/index.js
 *   node -r babel-register scripts/migrate-rot-evaluations/index.js --production
 *
 * Copy eval PDF attachments (run on prod host after DB import):
 *   mkdir -p server/fileserver/rot/attachments
 *   rsync -av ~/ROT/server/fileserver/attachments/ server/fileserver/rot/attachments/
 *
 * Ongoing PDF backups (prod → vultr + dev): docs/rot-backup-restore.md
 */

import Sequelize from 'sequelize';
import config from '../../server/config/environment';
import localEnv from '../../server/config/local.env.js';

const useProduction = process.argv.indexOf('--production') >= 0;
const envConfig = useProduction ? require('../../server/config/environment/production').default : config;
const sourceUri = process.env.ROT_SOURCE_URI || localEnv.ROT_SOURCE_URI;
const targetUri = envConfig.sequelize.uri;

if (!sourceUri) {
  console.error('Set ROT_SOURCE_URI (ROT Postgres connection) or add to local.env.js');
  process.exit(1);
}

const source = new Sequelize(sourceUri, {logging: false});
const target = new Sequelize(targetUri, envConfig.sequelize.options);

async function main() {
  const [rows] = await source.query('SELECT * FROM "Evaluations" ORDER BY "_id" ASC');
  console.log('Source Evaluations rows:', rows.length);
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
