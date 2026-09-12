'use strict';

import {num} from './rot.fdr.math.js';

const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const INDEX_COLLECTIONS = ['flightIndex', 'flightIndexBeta'];
const FETCH_TIMEOUT_MS = 115000;

/** Calendar date in America/Anchorage as YYYY-MM-DD */
export function timestampToAlaskaYmd(raw) {
  if (!raw) return null;
  let date;
  if (raw && typeof raw.toDate === 'function') {
    date = raw.toDate();
  } else if (raw instanceof Date) {
    date = raw;
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Anchorage',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

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

function alaskaTodayParts(asOfDate) {
  let d = asOfDate || new Date();
  let ymd = timestampToAlaskaYmd(d);
  if (!ymd) return {year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate()};
  let parts = ymd.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
}

function daysInCalendarMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function auditableDaysInMonth(year, month, asOfDate) {
  let dim = daysInCalendarMonth(year, month);
  let today = alaskaTodayParts(asOfDate);
  if (year > today.year) return null;
  if (year < today.year) return dim;
  if (month > today.month) return null;
  if (month < today.month) return dim;
  return today.day;
}

function countClaimedInMonth(claimedDates, year, month) {
  let prefix = year + '-' + String(month).padStart(2, '0') + '-';
  let n = 0;
  Object.keys(claimedDates || {}).forEach(ymd => {
    if (ymd.indexOf(prefix) === 0) n += 1;
  });
  return n;
}

/** @returns {{ months: Object.<number, number|null>, claimedByMonth: Object.<number, number> }} */
export function computeDaysOffByMonth(year, claimedDates, asOfDate) {
  let months = {};
  let claimedByMonth = {};
  for (let m = 1; m <= 12; m++) {
    let auditable = auditableDaysInMonth(year, m, asOfDate);
    if (auditable === null) {
      months[m] = null;
      claimedByMonth[m] = countClaimedInMonth(claimedDates, year, m);
      continue;
    }
    let claimed = countClaimedInMonth(claimedDates, year, m);
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
  let claimedAll = mergeClaimedDatesFromIndexDocs(docs);
  let yearPrefix = String(year) + '-';
  let claimedInYear = {};
  Object.keys(claimedAll).forEach(ymd => {
    if (ymd.indexOf(yearPrefix) === 0) claimedInYear[ymd] = true;
  });
  let hasAnyIndex = docs.length > 0;
  let result = computeDaysOffByMonth(year, claimedInYear, asOfDate);
  return {
    months: result.months,
    claimedByMonth: result.claimedByMonth,
    claimedDates: Object.keys(claimedInYear).sort(),
    indexDocCount: docs.length,
    hasAnyIndex
  };
}
