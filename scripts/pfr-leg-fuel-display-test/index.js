'use strict';

/**
 * PFR leg fuel labels: airport index vs leg index (#36); C208 burnOff1/fuelRemain1 (#38).
 * node scripts/pfr-leg-fuel-display-test/index.js
 */

function pfrLegPlannedBurnLbs(leg, legIndex) {
  if (!leg) return null;
  let burn = Number(leg.burn);
  if (isFinite(burn) && burn > 0) return burn;
  let legNum = (legIndex != null ? legIndex : 0) + 1;
  let burnOff = Number(leg['burnOff' + legNum]);
  if (isFinite(burnOff) && burnOff > 0) return burnOff;
  return 0;
}

function pfrLegEndingFuelLbs(leg, legIndex) {
  if (!leg) return null;
  let legNum = (legIndex != null ? legIndex : 0) + 1;
  let remainKey = 'fuelRemain' + legNum;
  if (leg[remainKey] != null && leg[remainKey] !== '') {
    let remain = Number(leg[remainKey]);
    if (isFinite(remain) && remain >= 0 && remain <= 15000) {
      return Math.round(remain);
    }
  }
  let fuel = Number(leg.takeoffFuel);
  if (!isFinite(fuel) || fuel <= 0) fuel = Number(leg.fuel);
  if (!isFinite(fuel) || fuel <= 0) return null;
  let burn = pfrLegPlannedBurnLbs(leg, legIndex);
  let end = Math.round(fuel - burn);
  if (end < 0 || end > 15000) return null;
  return end;
}

function pfrTakeoffFuelForAirportIndex(pfr, airportIndex, airportCount) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  if (airportIndex !== 0) return null;
  let leg0 = pfr.legArray[0];
  let fuel = Number(leg0.takeoffFuel);
  if (!isFinite(fuel) || fuel <= 0) fuel = Number(leg0.fuel);
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
  return pfrLegEndingFuelLbs(legs[legIdx], legIdx);
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

let caravan = {
  legArray: [
    {fuel: 1495, takeoffFuel: 1495, burnOff1: 302, fuelRemain1: 1193}
  ]
};
assert(pfrTakeoffFuelForAirportIndex(caravan, 0, 2) === 1495, 'C208 takeoffFuel');
assert(pfrEndingFuelForAirportIndex(caravan, 1, 2) === 1193, 'C208 fuelRemain1 at destination');
assert(
  pfrLegEndingFuelLbs({fuel: 1495, burnOff1: 302}, 0) === 1193,
  'C208 burnOff1 when fuelRemain missing'
);

if (failed) process.exit(1);
console.log('All passed.');
