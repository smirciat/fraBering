'use strict';

import {rotGetCollectionQuery} from './rot.fdr.firebaseQuery.js';
import {roundHour, num} from './rot.fdr.math.js';
import {getCachedHours, setCachedHours} from './rot.fdr.cache.js';

/** Prefer Firestore `date` (same field as year-scoped queries); fall back to dateString. */
function flightDateParts(flight) {
  if (!flight) return {year: null, month: null};
  let raw = flight.date;
  if (raw && typeof raw.toDate === 'function') {
    let d = raw.toDate();
    return {year: d.getFullYear(), month: d.getMonth() + 1};
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return {year: raw.getFullYear(), month: raw.getMonth() + 1};
  }
  if (flight.dateString) {
    let d = new Date(flight.dateString);
    if (!Number.isNaN(d.getTime())) {
      return {year: d.getFullYear(), month: d.getMonth() + 1};
    }
  }
  return {year: null, month: null};
}

function flightCalendarYear(flight) {
  return flightDateParts(flight).year;
}

function flightMonth(flight) {
  return flightDateParts(flight).month;
}

/** FDR plan: all aircraft with positive flightTime (minutes). */
function flightCountsForAggregation(flight) {
  if (!flight) return false;
  if (num(flight.flightTime) <= 0) return false;
  return true;
}

const EMPLOYEE_FETCH_TIMEOUT_MS = 55000;

function emptyMonthHours() {
  let months = {};
  for (let m = 1; m <= 12; m++) months[m] = null;
  return months;
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('fdr_firebase_timeout:' + label));
    }, ms);
    promise.then(
      val => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(val);
      },
      err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function collectionToFlights(result) {
  let out = [];
  if (!result) return out;
  result.forEach(doc => {
    let f = doc.data();
    f._id = doc.id;
    out.push(f);
  });
  return out;
}

function uniqueEmployeeIds(employeeIds) {
  let seen = {};
  let list = [];
  (employeeIds || []).forEach(id => {
    if (id === null || id === undefined || String(id) === '') return;
    let s = String(id);
    if (seen[s]) return;
    seen[s] = true;
    list.push(s);
  });
  return list;
}

function storeMonthsForEmployee(out, employeeId, months) {
  let key = String(employeeId);
  out[key] = months;
  if (/^\d+$/.test(key)) {
    out[String(parseInt(key, 10))] = months;
  }
}

function aggregateFlightsByEmployee(flights, year, idSet) {
  let out = {};
  (flights || []).forEach(f => {
    if (flightCalendarYear(f) !== year) return;
    if (!flightCountsForAggregation(f)) return;
    let mo = flightMonth(f);
    if (!mo) return;
    let hours = num(f.flightTime) / 60;
    ['pilotEmployeeNumber', 'coPilotEmployeeNumber'].forEach(field => {
      let raw = f[field];
      if (raw === null || raw === undefined) return;
      let s = String(raw);
      if (!idSet[s] && (!/^\d+$/.test(s) || !idSet[String(parseInt(s, 10))])) return;
      let key = idSet[s] ? s : String(parseInt(s, 10));
      if (!out[key]) {
        out[key] = {};
        for (let m = 1; m <= 12; m++) out[key][m] = 0;
      }
      out[key][mo] += hours;
    });
  });
  Object.keys(out).forEach(key => {
    for (let m = 1; m <= 12; m++) {
      if (out[key][m] > 0) out[key][m] = roundHour(out[key][m]);
      else out[key][m] = null;
    }
  });
  return out;
}

export async function fetchFlightsForEmployeeYear(employeeId, year) {
  let id = String(employeeId);
  let limit = 8000;
  let merged = await rotGetCollectionQuery(
    'flights', limit, 'pilotEmployeeNumber', '==', id, false,
    'coPilotEmployeeNumber', '==', id, true
  );
  let flights = collectionToFlights(merged);
  if (!flights.length && /^\d+$/.test(id)) {
    let idNum = parseInt(id, 10);
    let mergedNum = await rotGetCollectionQuery(
      'flights', limit, 'pilotEmployeeNumber', '==', idNum, false,
      'coPilotEmployeeNumber', '==', idNum, true
    );
    flights = collectionToFlights(mergedNum);
  }
  let seen = {};
  return flights.filter(f => {
    if (!f._id || seen[f._id]) return false;
    seen[f._id] = true;
    return flightCalendarYear(f) === year;
  });
}

export function aggregateHoursByMonth(flights) {
  let months = {};
  for (let m = 1; m <= 12; m++) months[m] = 0;
  (flights || []).forEach(f => {
    if (!flightCountsForAggregation(f)) return;
    let mo = flightMonth(f);
    if (!mo) return;
    months[mo] += num(f.flightTime) / 60;
  });
  for (let m = 1; m <= 12; m++) {
    if (months[m] > 0) months[m] = roundHour(months[m]);
    else months[m] = null;
  }
  return months;
}

async function computeHoursForEmployeesParallel(employeeIds, year, concurrency) {
  let ids = uniqueEmployeeIds(employeeIds);
  let out = {};
  let index = 0;

  async function worker() {
    while (index < ids.length) {
      let i = index;
      index += 1;
      let eid = ids[i];
      let months;
      try {
        let flights = await withTimeout(
          fetchFlightsForEmployeeYear(eid, year),
          EMPLOYEE_FETCH_TIMEOUT_MS,
          eid
        );
        months = aggregateHoursByMonth(flights);
      } catch (err) {
        console.log('fdr hours fetch failed', year, eid, err && err.message);
        months = emptyMonthHours();
      }
      storeMonthsForEmployee(out, eid, months);
    }
  }

  let n = Math.min(concurrency || 1, ids.length) || 1;
  let workers = [];
  for (let w = 0; w < n; w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

/**
 * Indexed per-employee flight queries (same pattern as ROT SIC hours).
 * Avoids scanning the entire calendar year in Firestore.
 */
export function mergeCachedHours(year, partial) {
  let existing = getCachedHours(year) || {};
  let merged = Object.assign({}, existing);
  Object.keys(partial || {}).forEach(key => {
    merged[key] = partial[key];
  });
  setCachedHours(year, merged);
  return merged;
}

export async function computeHoursForEmployeeIds(employeeIds, year, concurrency) {
  return computeHoursForEmployeesParallel(employeeIds, year, concurrency);
}

/** @deprecated Prefer batched compute via computeFdrYearHours */
export async function computeHoursByEmployeeForYear(employeeIds, year) {
  let cached = getCachedHours(year);
  if (cached) return cached;

  let out = await computeHoursForEmployeesParallel(employeeIds, year, 5);
  setCachedHours(year, out);
  return out;
}

export {aggregateFlightsByEmployee};
