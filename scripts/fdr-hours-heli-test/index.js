'use strict';

require('babel-register')({presets: ['es2015']});
require('babel-polyfill');

const {isHelicopterFlight, flightHoursForFdr, aggregateHoursByMonth} = require('../../server/api/rot/rot.fdr.hours.js');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(isHelicopterFlight({isHelicopter: true, acftType: 'Caravan'}), 'isHelicopter flag wins');
assert(isHelicopterFlight({acftType: 'Astar'}), 'Astar is heli');
assert(isHelicopterFlight({acftType: 'Robinson'}), 'Robinson is heli');
assert(!isHelicopterFlight({acftType: 'Caravan', flightTime: 90}), 'Caravan is not heli');

let savannaAug4 = {
  isHelicopter: true,
  acftType: 'Astar',
  flightTime: 600,
  hobbsOut: 142.2,
  hobbsIn: 144.8,
  hobbsTotal: 2.6,
  date: new Date('2026-08-04T18:00:00Z')
};
assert(flightHoursForFdr(savannaAug4) === 2.6, 'heli uses hobbsTotal not 10h flightTime');

let incomplete = {
  isHelicopter: true,
  flightTime: 0,
  hobbsOut: 135.6,
  hobbsIn: undefined,
  hobbsTotal: undefined
};
assert(flightHoursForFdr(incomplete) === 0, 'open PFR with no hobbsIn does not count');

let fw = {acftType: 'Caravan', flightTime: 90, date: new Date('2026-08-04T18:00:00Z')};
assert(Math.abs(flightHoursForFdr(fw) - 1.5) < 0.01, 'airplane still uses flightTime minutes');

let months = aggregateHoursByMonth([savannaAug4, fw, incomplete]);
assert(months[8] === 4.1, 'Aug aggregate heli hobbs + FW 1.5h = 4.1');

if (failed) {
  console.error(failed + ' assertion(s) failed');
  process.exit(1);
}
console.log('All checks passed.');
