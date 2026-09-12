'use strict';

/**
 * Dump one FDR pilot's Firebase flights for a month (Savanna / Aug 2026 by default).
 *
 *   node -r babel-register scripts/fdr-august-savanna/index.js
 *   node -r babel-register scripts/fdr-august-savanna/index.js "PAULSEN, SAVANNA" 2026 8
 */

require('babel-register')({presets: ['es2015']});
require('babel-polyfill');

const pilotArg = process.argv[2] || 'PAULSEN, SAVANNA';
const year = parseInt(process.argv[3] || '2026', 10);
const month = parseInt(process.argv[4] || '8', 10);

const {loadFirebasePilots} = require('../../server/api/rot/rot.fdr.firebaseQuery.js');
const {matchPilotEmployeeId, buildPilotEmployeeIndex} = require('../../server/api/rot/rot.fdr.pilotMatch.js');
const {
  fetchFlightsForEmployeeYear,
  aggregateHoursByMonth
} = require('../../server/api/rot/rot.fdr.hours.js');

function toDate(raw) {
  if (!raw) return null;
  if (raw && typeof raw.toDate === 'function') return raw.toDate();
  if (raw instanceof Date) return raw;
  return null;
}

function alaskaYmd(date) {
  if (!date) return '';
  try {
    let fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Anchorage',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    let yearP = null;
    let monthP = null;
    let dayP = null;
    fmt.formatToParts(date).forEach(function(p) {
      if (p.type === 'year') yearP = p.value;
      if (p.type === 'month') monthP = p.value;
      if (p.type === 'day') dayP = p.value;
    });
    return yearP + '-' + monthP + '-' + dayP;
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

function jsMonth(date) {
  if (!date) return null;
  return date.getMonth() + 1;
}

function jsYear(date) {
  if (!date) return null;
  return date.getFullYear();
}

function akMonth(date) {
  let ymd = alaskaYmd(date);
  if (!ymd) return null;
  return parseInt(ymd.split('-')[1], 10);
}

function akYear(date) {
  let ymd = alaskaYmd(date);
  if (!ymd) return null;
  return parseInt(ymd.split('-')[0], 10);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function summarize(flights, eid) {
  let keys = {};
  flights.forEach(function(f) {
    Object.keys(f || {}).forEach(function(k) { keys[k] = true; });
  });
  console.log('Sample flight fields:', Object.keys(keys).sort().join(', '));

  let inMonthJs = [];
  let inMonthAk = [];
  flights.forEach(function(f) {
    let d = toDate(f.date);
    if (jsYear(d) === year && jsMonth(d) === month) inMonthJs.push(f);
    if (akYear(d) === year && akMonth(d) === month) inMonthAk.push(f);
  });

  let months = aggregateHoursByMonth(flights);
  console.log('FDR aggregate (JS local date of flight.date), Aug hours:', months[month]);
  console.log('Full-year FDR months:', JSON.stringify(months));
  console.log('Legs in Aug by JS local date:', inMonthJs.length);
  console.log('Legs in Aug by Alaska date:', inMonthAk.length);

  function hoursOf(list) {
    let min = 0;
    list.forEach(function(f) { min += Number(f.flightTime) || 0; });
    return round1(min / 60);
  }

  console.log('Sum flightTime/60 Aug JS-date (no extra dedupe):', hoursOf(inMonthJs));
  console.log('Sum flightTime/60 Aug AK-date (no extra dedupe):', hoursOf(inMonthAk));

  let pic = inMonthAk.filter(function(f) { return String(f.pilotEmployeeNumber) === String(eid) || String(f.pilotEmployeeNumber) === String(parseInt(eid, 10)); });
  let sic = inMonthAk.filter(function(f) { return String(f.coPilotEmployeeNumber) === String(eid) || String(f.coPilotEmployeeNumber) === String(parseInt(eid, 10)); });
  let both = inMonthAk.filter(function(f) {
    let p = String(f.pilotEmployeeNumber);
    let c = String(f.coPilotEmployeeNumber);
    return (p === String(eid) || p === String(parseInt(eid, 10)))
      && (c === String(eid) || c === String(parseInt(eid, 10)));
  });
  console.log('Aug AK PIC legs/hours:', pic.length, hoursOf(pic));
  console.log('Aug AK SIC legs/hours:', sic.length, hoursOf(sic));
  console.log('Aug AK listed PIC and SIC (same emp):', both.length, hoursOf(both));

  let byAc = {};
  inMonthAk.forEach(function(f) {
    let ac = f.aircraft || f.tail || '(none)';
    if (!byAc[ac]) byAc[ac] = {n: 0, min: 0};
    byAc[ac].n += 1;
    byAc[ac].min += Number(f.flightTime) || 0;
  });
  console.log('By aircraft (AK Aug):');
  Object.keys(byAc).sort().forEach(function(ac) {
    console.log(' ', ac, byAc[ac].n, 'legs', round1(byAc[ac].min / 60), 'h');
  });

  let byDay = {};
  inMonthAk.forEach(function(f) {
    let d = alaskaYmd(toDate(f.date)) || f.dateString || '?';
    if (!byDay[d]) byDay[d] = {n: 0, min: 0};
    byDay[d].n += 1;
    byDay[d].min += Number(f.flightTime) || 0;
  });
  console.log('By Alaska day:');
  Object.keys(byDay).sort().forEach(function(d) {
    console.log(' ', d, byDay[d].n, 'legs', round1(byDay[d].min / 60), 'h');
  });

  let timeVals = inMonthAk.map(function(f) { return Number(f.flightTime) || 0; }).sort(function(a, b) { return b - a; });
  console.log('Largest flightTime values (minutes as stored):', timeVals.slice(0, 8).join(', '));

  console.log('\n--- Legs for flight-release cross-check (Alaska August) ---');
  inMonthAk.sort(function(a, b) {
    let da = alaskaYmd(toDate(a.date));
    let db = alaskaYmd(toDate(b.date));
    if (da < db) return -1;
    if (da > db) return 1;
    return (Number(a.flightTime) || 0) - (Number(b.flightTime) || 0);
  }).forEach(function(f) {
    let d = toDate(f.date);
    let seat = '';
    if (String(f.pilotEmployeeNumber) === String(eid) || String(f.pilotEmployeeNumber) === String(parseInt(eid, 10))) seat = 'PIC';
    if (String(f.coPilotEmployeeNumber) === String(eid) || String(f.coPilotEmployeeNumber) === String(parseInt(eid, 10))) {
      seat = seat ? 'PIC+SIC' : 'SIC';
    }
    console.log([
      alaskaYmd(d),
      f.dateString || '',
      f._id,
      f.aircraft || '',
      (f.departure || '') + '-' + (f.destination || ''),
      f.flightTime,
      round1((Number(f.flightTime) || 0) / 60) + 'h',
      seat,
      f.pilotName || '',
      f.coPilotName || ''
    ].join(' | '));
  });
}

async function main() {
  let fb = await loadFirebasePilots();
  let idx = buildPilotEmployeeIndex(fb);
  let eid = matchPilotEmployeeId(pilotArg, idx, fb);
  console.log('Pilot:', pilotArg, 'employeeId:', eid || '(no match)');
  if (!eid) {
    let hits = fb.filter(function(p) {
      return JSON.stringify(p).toUpperCase().indexOf('PAULSEN') >= 0
        || JSON.stringify(p).toUpperCase().indexOf('SAVANNA') >= 0;
    });
    console.log('name hits', hits.length);
    hits.slice(0, 8).forEach(function(p) {
      console.log(' ', p.employeeNumber || p.employeeId || p._id, p.name || p.displayName || p.lastName);
    });
    return;
  }

  let flights = await fetchFlightsForEmployeeYear(eid, year);
  console.log('Year', year, 'flight docs after FDR fetch/dedupe:', flights.length);
  summarize(flights, eid);
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
