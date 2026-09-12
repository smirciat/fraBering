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
  mergeClaimedDatesFromFlights,
  mergeDutyClaimedDates,
  computeDaysOffByMonth,
  computeDutyForEmployeeYear,
  snapshotTodayForFdrYear,
  fdrTabYearIsAvailable,
  filterFdrTabYears,
  parseLooseYmd,
  alaskaTodayParts,
  countOnDatesInYear,
  isDutyCalendarSparse
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

let sepSnap = computeDaysOffByMonth(2026, merged, new Date('2026-09-12T20:00:00Z'));
assert(sepSnap.claimedByMonth[9] === 1, 'Sep 12 snapshot: only elapsed claim 9/9 counts (not 9/13)');
assert(sepSnap.months[9] === 10, 'Sep 12 snapshot: 11 elapsed days minus 1 duty = 10 days off');

let sepDuty = computeDaysOffByMonth(2026, {
  '2026-09-02': true,
  '2026-09-11': true,
  '2026-09-12': true,
  '2026-09-23': true
}, new Date('2026-09-12T20:00:00Z'));
assert(sepDuty.months[9] === 9, 'Sep 12: 9/2 and 9/11 duty; 9/12 and 9/23 not elapsed → 11−2=9 off');
assert(sepDuty.months[10] === null, 'October undetermined on Sep 12 snapshot');

let sepClosed = computeDaysOffByMonth(2026, {
  '2026-09-11': true,
  '2026-09-12': true,
  '2026-09-23': true
}, new Date('2026-09-30T12:00:00Z'));
assert(sepClosed.months[9] === 26, 'Sep 30 snapshot: 29 elapsed (excl. today) minus 3 duty = 26 days off');
assert(!mergeClaimedDatesFromIndexDocs([{id: '99OFF', data: {date: {toDate: () => new Date('2026-09-12T15:00:00Z')}}}])['2026-09-12'],
  'OFF doc does not claim duty on that date');

let flightMerge = mergeDutyClaimedDates([], [{
  date: {toDate: () => new Date('2026-09-23T18:00:00Z')},
  flightTime: 60
}], 2026);
assert(flightMerge['2026-09-23'], 'flight with time claims 9/23 duty');
assert(!flightMerge['2026-09-11'], 'no flight does not claim 9/11');

assert(parseLooseYmd('2026-09-12') === '2026-09-12', 'ISO ymd parse');
assert(parseLooseYmd('09/12/2026') === '2026-09-12', 'US date year is last, not first token');
assert(parseLooseYmd('12/09/2026') === '2026-12-09', 'US 12/09/2026 is Dec 9, not year 12');
assert(!parseLooseYmd('12-09-12'), 'two-digit year is rejected');
let akSep = alaskaTodayParts(new Date('2026-09-12T20:00:00Z'));
assert(akSep.year === 2026, 'Alaska parts year is 2026 not 12');
assert(akSep.month === 9, 'Alaska parts month is September');
assert(snapshotTodayForFdrYear(2027, new Date('2026-09-12T20:00:00Z')) === null,
  '2027 sheet before Jan 1 2027 has no snapshot');
assert(!fdrTabYearIsAvailable(2027, new Date('2026-09-12T20:00:00Z')), '2027 tab hidden before 2027');
assert(fdrTabYearIsAvailable(2026, new Date('2026-09-12T20:00:00Z')), '2026 tab visible in 2026');
assert(fdrTabYearIsAvailable(2027, new Date('2027-01-01T12:00:00Z')), '2027 tab visible on Jan 1 2027 AK');
assert(filterFdrTabYears([2025, 2026, 2027], new Date('2026-09-12T20:00:00Z')).join() === '2025,2026',
  'meta years exclude future sheet year');
let future = computeDaysOffByMonth(2027, {'2027-01-15': true}, new Date('2026-12-31T20:00:00Z'));
assert(future.sheetYearNotStarted && future.months[1] === null, '2027 sheet in 2026: all months blank');

let emptyClaims = computeDaysOffByMonth(2026, {}, new Date('2026-09-12T20:00:00Z'));
assert(emptyClaims.months[1] === 31, 'Jan with no duty claims is full month off');
assert(emptyClaims.months[9] === 11, 'Sep 12 snapshot: 11 elapsed days, 0 duty → 11 off');
assert(emptyClaims.months[10] === null, 'Oct still undetermined');

assert(isDutyCalendarSparse(0), '0 ON dates is sparse');
assert(isDutyCalendarSparse(5), '5 ON dates is sparse (Patrik-style)');
assert(!isDutyCalendarSparse(10), '10 ON dates is enough');
assert(countOnDatesInYear([
  {id: '898ON', data: {date: {toDate: () => new Date('2026-01-19T15:00:00Z')}}},
  {id: '898OFF', data: {date: {toDate: () => new Date('2026-01-20T15:00:00Z')}}},
  {id: '898-011926-1', data: {date: {toDate: () => new Date('2026-01-19T15:00:00Z')}}}
], 2026) === 1, 'only ON docs count toward calendar');

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
