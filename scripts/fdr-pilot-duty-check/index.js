'use strict';

/**
 * Check Firebase duty + optional Postgres cache for one FDR pilot.
 *
 *   node -r babel-register scripts/fdr-pilot-duty-check/index.js "ROWE, RUSSELL" 2026
 *   node -r babel-register scripts/fdr-pilot-duty-check/index.js "ROWE, RUSSELL" 2026 --local
 */

require('babel-register')({presets: ['es2015']});
require('babel-polyfill');

const pilotArg = process.argv[2] || 'ROWE, RUSSELL';
const year = parseInt(process.argv[3] || '2026', 10);
const useLocal = process.argv.indexOf('--local') >= 0;

const {loadFirebasePilots} = require('../../server/api/rot/rot.fdr.firebaseQuery.js');
const {matchPilotEmployeeId, buildPilotEmployeeIndex} = require('../../server/api/rot/rot.fdr.pilotMatch.js');
const {computeDutyForEmployeeYear} = require('../../server/api/rot/rot.fdr.duty.js');

async function loadPgDuty(year, pilotName) {
  if (!useLocal) {
    console.log('(Skip Postgres unless --local; on prod, query FdrComputedDuty for year', year, ')');
    return null;
  }
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  const {FdrComputedDuty} = require('../../server/sqldb');
  const {normalizePilotName} = require('../../server/api/rot/rot.fdr.math.js');
  let rows = await FdrComputedDuty.findAll({where: {year, pilotName}});
  if (!rows.length) {
    rows = await FdrComputedDuty.findAll({where: {year}});
    rows = rows.filter(r => normalizePilotName(r.pilotName) === normalizePilotName(pilotName));
  }
  return rows;
}

async function main() {
  let fb = await loadFirebasePilots();
  let idx = buildPilotEmployeeIndex(fb);
  let eid = matchPilotEmployeeId(pilotArg, idx, fb);
  console.log('Pilot:', pilotArg, 'year:', year, 'employeeId:', eid || '(no match)');
  if (!eid) return;

  let duty = await computeDutyForEmployeeYear(eid, year);
  console.log('Firebase duty:', {
    indexDocCount: duty.indexDocCount,
    hasAnyIndex: duty.hasAnyIndex,
    janDaysOff: duty.months[1],
    sepDaysOff: duty.months[9],
    decDaysOff: duty.months[12]
  });

  let rows = await loadPgDuty(year, pilotArg);
  if (rows) {
    console.log('Postgres FdrComputedDuty rows:', rows.length);
    rows.slice(0, 3).forEach(r => {
      console.log(' ', r.month, 'daysOff', r.daysOff, 'claimed', r.claimedCount);
    });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
