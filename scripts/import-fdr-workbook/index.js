#!/usr/bin/env node
'use strict';

/**
 * Import Flight&DutyRecordReport.xls into FDR tables.
 *
 * From repo root:
 *   node -r babel-register scripts/import-fdr-workbook/index.js
 *   node -r babel-register scripts/import-fdr-workbook/index.js --replace
 *
 * Requires server/config/environment/development.js (copy from development.sample.js)
 * and uploads/Flight&DutyRecordReport.xls (or FDR_WORKBOOK_PATH in local.env.js).
 */

const path = require('path');

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

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
loadLocalEnv();

const devConfig = path.join(__dirname, '../../server/config/environment/development.js');
const fs = require('fs');
if (!fs.existsSync(devConfig)) {
  console.error(
    'Missing server/config/environment/development.js — copy from development.sample.js first.'
  );
  process.exit(1);
}

const sqldb = require('../../server/sqldb');
const importMod = require('../../server/api/rot/rot.fdr.import');

const models = {
  FdrPilot: sqldb.FdrPilot,
  FdrDaysOff: sqldb.FdrDaysOff,
  FdrImportHour: sqldb.FdrImportHour
};

const replace = process.argv.indexOf('--replace') >= 0;

sqldb.sequelize.sync()
  .then(() => importMod.importFdrFromWorkbook(models, {replace}))
  .then(result => {
    console.log('FDR import OK', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('FDR import failed', err);
    process.exit(1);
  });
