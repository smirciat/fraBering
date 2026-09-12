'use strict';

import {num} from './rot.fdr.math.js';
import {fetchFlightsForEmployeeYear} from './rot.fdr.hours.js';
import {
  timestampToAlaskaYmd,
  alaskaCalendarYear,
  alaskaTodayParts,
  fdrTabYearIsAvailable,
  filterFdrTabYears,
  snapshotTodayForFdrYear,
  formatSnapshotTodayAk,
  parseLooseYmd
} from './rot.fdr.calendar.js';

export {
  timestampToAlaskaYmd,
  alaskaCalendarYear,
  fdrTabYearIsAvailable,
  filterFdrTabYears,
  snapshotTodayForFdrYear,
  formatSnapshotTodayAk,
  parseLooseYmd,
  alaskaTodayParts
};

const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const INDEX_COLLECTIONS = ['flightIndex', 'flightIndexBeta'];
const FETCH_TIMEOUT_MS = 115000;

/** True when this flightIndex doc claims a calendar duty day (prod ∪ beta). */
export function indexDocClaimsDuty(docId, data) {
  if (!data) return false;
  let id = String(docId || '');
  if (/OFF$/.test(id)) return false;
  if (data.dutyDayIsAssigned) return true;

  let types = data.dutyDayType || {};
  let hasType = Object.keys(types).some(k => types[k]);
  if (/ON$/.test(id) && hasType) return true;

  if (/^\d+-/.test(id)) {
    if (num(data.flightTime) > 0) return true;
    if (hasType) return true;
  }
  return false;
}

export function mergeClaimedDatesFromIndexDocs(docs) {
  let dates = {};
  (docs || []).forEach(item => {
    let docId = item.id || item._id;
    let data = item.data || item;
    if (!indexDocClaimsDuty(docId, data)) return;
    let ymd = timestampToAlaskaYmd(data.date);
    if (ymd) dates[ymd] = true;
  });
  return dates;
}

/** Positive-time PFR days count as duty (flightIndex can lag backup). */
export function mergeClaimedDatesFromFlights(flights, year) {
  let dates = {};
  let yearPrefix = String(year) + '-';
  (flights || []).forEach(f => {
    if (!f || num(f.flightTime) <= 0) return;
    let ymd = timestampToAlaskaYmd(f.date);
    if (ymd && ymd.indexOf(yearPrefix) === 0) dates[ymd] = true;
  });
  return dates;
}

export function mergeDutyClaimedDates(indexDocs, flights, year) {
  let dates = mergeClaimedDatesFromIndexDocs(indexDocs);
  let fromFlights = mergeClaimedDatesFromFlights(flights, year);
  Object.keys(fromFlights).forEach(ymd => {
    dates[ymd] = true;
  });
  return dates;
}

function daysInCalendarMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** True when this date (in the FDR sheet year) is before the snapshot "today" for that year. */
export function isDateElapsedForDaysOff(ymd, fdrYear, asOfDate) {
  let snap = snapshotTodayForFdrYear(fdrYear, asOfDate);
  if (!snap) return false;
  let parts = String(ymd || '').split('-');
  if (parts.length !== 3) return false;
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);
  if (!y || !m || !d || y !== fdrYear) return false;
  if (m > snap.month) return false;
  if (m < snap.month) return true;
  return d < snap.day;
}

function auditableDaysInMonth(fdrYear, month, asOfDate) {
  let snap = snapshotTodayForFdrYear(fdrYear, asOfDate);
  if (!snap) return null;
  let dim = daysInCalendarMonth(fdrYear, month);
  if (month > snap.month) return null;
  if (month < snap.month) return dim;
  return Math.max(0, snap.day - 1);
}

function countClaimedInMonth(claimedDates, fdrYear, month, asOfDate) {
  let prefix = fdrYear + '-' + String(month).padStart(2, '0') + '-';
  let n = 0;
  Object.keys(claimedDates || {}).forEach(ymd => {
    if (ymd.indexOf(prefix) !== 0) return;
    if (!isDateElapsedForDaysOff(ymd, fdrYear, asOfDate)) return;
    n += 1;
  });
  return n;
}

/**
 * Snapshot days off for a month (not a permanent ledger), using snapshot "today"
 * inside the FDR sheet year (see snapshotTodayForFdrYear). Elapsed days in month
 * minus distinct elapsed duty dates (index ∪ beta ∪ flights w/ time). Today and
 * later dates in that month are undetermined — not counted as days off.
 * @returns {{ months: Object.<number, number|null>, claimedByMonth: Object.<number, number> }}
 */
export function computeDaysOffByMonth(year, claimedDates, asOfDate) {
  asOfDate = asOfDate || new Date();
  let snap = snapshotTodayForFdrYear(year, asOfDate);
  if (!snap) {
    let months = {};
    let claimedByMonth = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = null;
      claimedByMonth[m] = 0;
    }
    return {months, claimedByMonth, sheetYearNotStarted: true};
  }
  let months = {};
  let claimedByMonth = {};
  for (let m = 1; m <= 12; m++) {
    let auditable = auditableDaysInMonth(year, m, asOfDate);
    if (auditable === null) {
      months[m] = null;
      claimedByMonth[m] = countClaimedInMonth(claimedDates, year, m, asOfDate);
      continue;
    }
    let claimed = countClaimedInMonth(claimedDates, year, m, asOfDate);
    claimedByMonth[m] = claimed;
    let off = auditable - claimed;
    if (off < 0) off = 0;
    months[m] = off;
  }
  return {months, claimedByMonth};
}

function collectionToIndexDocs(snap) {
  let out = [];
  if (!snap) return out;
  snap.forEach(doc => {
    out.push({id: doc.id, data: doc.data()});
  });
  return out;
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('fdr_duty_timeout:' + label));
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

export async function fetchFlightIndexDocsForEmployee(employeeId) {
  let eid = String(employeeId);
  let db = admin.firestore();
  let pilotRef = db.collection('pilots').doc(eid);
  let merged = [];

  for (let i = 0; i < INDEX_COLLECTIONS.length; i++) {
    let colName = INDEX_COLLECTIONS[i];
    let snap = await withTimeout(
      pilotRef.collection(colName).get(),
      FETCH_TIMEOUT_MS,
      eid + ':' + colName
    );
    merged = merged.concat(collectionToIndexDocs(snap));
  }
  return merged;
}

export async function computeDutyForEmployeeYear(employeeId, year, asOfDate) {
  let docs = await fetchFlightIndexDocsForEmployee(employeeId);
  let flights = await fetchFlightsForEmployeeYear(employeeId, year);
  let claimedInYear = mergeDutyClaimedDates(docs, flights, year);
  let fromIndexOnly = mergeClaimedDatesFromIndexDocs(docs);
  let yearPrefix = String(year) + '-';
  let indexDatesInYear = Object.keys(fromIndexOnly).filter(ymd => ymd.indexOf(yearPrefix) === 0);
  let flightOnlyDates = Object.keys(claimedInYear).filter(ymd => {
    return ymd.indexOf(yearPrefix) === 0 && !fromIndexOnly[ymd];
  });
  let hasAnyIndex = docs.length > 0;
  let flightDutyDatesInYear = Object.keys(mergeClaimedDatesFromFlights(flights, year)).length;
  let realAsOf = asOfDate || new Date();
  let snap = snapshotTodayForFdrYear(year, realAsOf);
  let result = computeDaysOffByMonth(year, claimedInYear, realAsOf);
  return {
    months: result.months,
    claimedByMonth: result.claimedByMonth,
    claimedDates: Object.keys(claimedInYear).sort(),
    sheetYearNotStarted: !!result.sheetYearNotStarted,
    indexDocCount: docs.length,
    flightDutyDatesInYear,
    flightOnlyDutyDates: flightOnlyDates.length,
    dutySnapshotAk: result.sheetYearNotStarted ? null : formatSnapshotTodayAk(snap),
    hasAnyIndex,
    hasDutySignal: hasAnyIndex || flightDutyDatesInYear > 0
  };
}
