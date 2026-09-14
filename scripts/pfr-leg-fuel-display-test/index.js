'use strict';

/**
 * PFR leg fuel labels: airport index vs leg index (issue #36).
 * node scripts/pfr-leg-fuel-display-test/index.js
 */

function pfrLegEndingFuelLbs(leg) {
  if (!leg) return null;
  let fuel = Number(leg.fuel);
  let burn = Number(leg.burn);
  if (!isFinite(fuel) || fuel <= 0) return null;
  if (!isFinite(burn)) burn = 0;
  let end = Math.round(fuel - burn);
  if (end < 0 || end > 15000) return null;
  return end;
}

function pfrTakeoffFuelForAirportIndex(pfr, airportIndex, airportCount) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  if (airportIndex !== 0) return null;
  let fuel = Number(pfr.legArray[0].fuel);
  if (!isFinite(fuel) || fuel <= 0) return null;
  return Math.round(fuel);
}

function pfrEndingFuelForAirportIndex(pfr, airportIndex, airportCount) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  if (!airportCount || airportIndex <= 0 || airportIndex >= airportCount) return null;
  let legs = pfr.legArray;
  let legIdx = airportIndex - 1;
  if (airportIndex === airportCount - 1) {
    legIdx = legs.length - 1;
  }
  if (legIdx < 0 || legIdx >= legs.length) return null;
  return pfrLegEndingFuelLbs(legs[legIdx]);
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

let pfr = {
  legArray: [
    {fuel: 2600, burn: 400},
    {fuel: -1, burn: 350}
  ]
};
let n = 3;

assert(pfrTakeoffFuelForAirportIndex(pfr, 0, n) === 2600, 'OME depart takeoff');
assert(pfrTakeoffFuelForAirportIndex(pfr, 1, n) === null, 'SVA not takeoff row');
assert(pfrEndingFuelForAirportIndex(pfr, 1, n) === 2200, 'SVA shows leg0 ending not leg1 -1');
assert(pfrEndingFuelForAirportIndex(pfr, 2, n) === null, 'leg1 ending invalid when fuel -1');
assert(pfrTakeoffFuelForAirportIndex(pfr, 2, n) === null, 'final airport no takeoff line');

pfr.legArray[1] = {fuel: 2200, burn: 350};
assert(pfrEndingFuelForAirportIndex(pfr, 2, n) === 1850, 'OME return ending leg1');

if (failed) process.exit(1);
console.log('All passed.');
