'use strict';

/**
 * Issue #16 — ETA display matches OFF-time shift.
 * node scripts/eta-display-test/index.js
 */

function minutesFromTimeString(timeStr) {
  if (!timeStr) return 0;
  let s = String(timeStr).trim();
  if (s.indexOf(':') >= 0) {
    let parts = s.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  let digits = s.replace(/\D/g, '');
  if (digits.length === 3) digits = '0' + digits;
  if (digits.length === 4) {
    return parseInt(digits.substring(0, 2), 10) * 60 + parseInt(digits.substring(2, 4), 10);
  }
  return 0;
}

function minutesToHHMM(totalMinutes) {
  let mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function createEtaFromActualDepart(flight) {
  if (!flight || !flight.tfliteDepart || !flight.departTimes || !flight.departTimes.length) return '';
  let diff = minutesFromTimeString(flight.departTimes[flight.departTimes.length - 1]) -
    minutesFromTimeString(flight.departTimes[0]);
  if (diff < 0) diff += 24 * 60;
  return minutesToHHMM(minutesFromTimeString(flight.tfliteDepart) + diff);
}

function displayFinalEta(flight) {
  if (flight.miscObject && flight.miscObject.updatedEta && String(flight.miscObject.updatedEta).trim()) {
    return String(flight.miscObject.updatedEta).trim();
  }
  if (flight.tfliteArrive && String(flight.tfliteArrive).trim()) {
    return String(flight.tfliteArrive).trim();
  }
  if (flight.tfliteDepart) {
    let fromOff = createEtaFromActualDepart(flight);
    if (fromOff) return fromOff;
  }
  return '';
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

let flight = {
  departTimes: ['10:00', '11:30'],
  tfliteDepart: '10:45',
  tfliteArrive: '12:15'
};
assert(displayFinalEta(flight) === '12:15', 'uses tfliteArrive when set');

delete flight.tfliteArrive;
assert(displayFinalEta(flight) === '12:15', 'computes from OFF when arrive missing');

flight.miscObject = { updatedEta: '13:00' };
assert(displayFinalEta(flight) === '13:00', 'manual updatedEta wins');

if (failed) process.exit(1);
console.log('All passed.');
