'use strict';

/**
 * Unit checks for FDR duty union + optional live Firebase sample (emp 933).
 * node -r babel-register scripts/fdr-duty-union-test/index.js
 */

require('babel-register')({presets: ['es2015']});
require('babel-polyfill');

const {
  indexDocClaimsDuty,
  mergeClaimedDatesFromIndexDocs,
  computeDaysOffByMonth,
  computeDutyForEmployeeYear
} = require('../../server/api/rot/rot.fdr.duty.js');

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(indexDocClaimsDuty('1105ON', {dutyDayType: {Admin: true}}), 'Admin ON claims');
assert(!indexDocClaimsDuty('1105OFF', {dutyDayType: {}}), 'OFF does not claim');
assert(indexDocClaimsDuty('933-010826-1', {flightTime: 60, dutyDayIsAssigned: false}), 'PFR with time claims');
assert(!indexDocClaimsDuty('933-012626-1', {flightTime: 0, dutyDayIsAssigned: false}), 'empty PFR no claim');

let merged = mergeClaimedDatesFromIndexDocs([
  {id: '1104ON', data: {date: {toDate: () => new Date('2026-09-09T15:00:00Z')}, dutyDayType: {Admin: true}}},
  {id: '1105ON', data: {date: {toDate: () => new Date('2026-09-13T15:00:00Z')}, dutyDayType: {Admin: true}}}
]);
assert(merged['2026-09-09'] && merged['2026-09-13'], 'union merges two ON dates');

let sep = computeDaysOffByMonth(2026, merged, new Date('2026-09-12T20:00:00Z'));
assert(sep.claimedByMonth[9] === 2, 'Sep 2026 claimed count');

async function live933() {
  if (process.env.SKIP_FDR_DUTY_LIVE) {
    console.log('skip live Firebase (SKIP_FDR_DUTY_LIVE)');
    return;
  }
  let duty = await computeDutyForEmployeeYear('933', 2026);
  console.log('live 933 indexDocCount', duty.indexDocCount);
  console.log('live 933 Sep claimed', duty.claimedByMonth[9], 'daysOff', duty.months[9]);
  let has913 = duty.claimedDates.indexOf('2026-09-13') >= 0;
  let has909 = duty.claimedDates.indexOf('2026-09-09') >= 0;
  assert(has909, '933 union includes 2026-09-09 (beta Admin)');
  assert(has913, '933 union includes 2026-09-13 (prod Admin)');
}

live933()
  .then(() => {
    if (failed) {
      console.error(failed + ' assertion(s) failed');
      process.exit(1);
    }
    console.log('All checks passed.');
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
