'use strict';

import localEnv from '../../config/local.env.js';
import {
  rosterMonthKeyFromDate,
  rosterScheduleDocId
} from '../rosterScheduleCell/rosterScheduleCell.store';
import {
  emitScheduleCellChange,
  emitScheduleBulkChange
} from '../rosterScheduleCell/rosterScheduleCell.events';
import {
  emitCalendarRequestChange,
  emitCalendarRequestBulkChange
} from '../rosterCalendarRequest/rosterCalendarRequest.events';
import {
  emitEmployeeSave,
  emitEmployeeRemove,
  emitEmployeeBulkChange
} from '../rosterEmployee/rosterEmployee.events';
import {
  personKeyFromName as calendarPersonKeyFromName
} from '../rosterCalendarRequest/rosterCalendarRequest.store';

const ROSTER_CONFIG_COLLECTION = 'rosterconfig';
const ROSTER_MONTH_META_COLLECTION = 'rostermonthmeta';
const ROSTER_SCHEDULES_COLLECTION = 'rosterschedules';
const ROSTER_CALENDAR_COLLECTION = 'rostercalendar';
const EMPLOYEES_COLLECTION = 'employees';

function usePostgresStore() {
  const store = String(process.env.ROSTER_DATA_STORE || localEnv.ROSTER_DATA_STORE || 'firebase').toLowerCase();
  return store === 'postgres' || store === 'pg' || store === 'sql';
}

function getFirebaseDb() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = require('../../firebase.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
}

function monthDatesForBulkScheduleLoad(centerDateString, monthKeys) {
  if (monthKeys && monthKeys.length) {
    return monthKeys.map(key => {
      const parts = String(key).split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!year || !month) return null;
      return new Date(year, month - 1, 1);
    }).filter(Boolean);
  }
  const center = new Date(centerDateString);
  return [
    new Date(center.getFullYear(), center.getMonth() - 1, 1),
    new Date(center.getFullYear(), center.getMonth(), 1),
    new Date(center.getFullYear(), center.getMonth() + 1, 1)
  ];
}

export function rosterUsesPostgres() {
  return usePostgresStore();
}

function broadcastScheduleCell(base, monthKey, rosterId, day, code) {
  emitScheduleCellChange({
    base,
    monthKey,
    rosterId,
    day: parseInt(day, 10),
    code: code || null,
    updatedAt: new Date().toISOString()
  });
}

function broadcastScheduleBulk(monthKey, bases, base) {
  const baseList = bases && bases.length ? bases.slice() : (base ? [base] : []);
  emitScheduleBulkChange({
    monthKey,
    bases: baseList,
    updatedAt: new Date().toISOString()
  });
}

function rosterCalendarDocId(base, dateString, personName) {
  return `${base}-${rosterMonthKeyFromDate(dateString)}-${calendarPersonKeyFromName(personName)}`;
}

function broadcastCalendarRequestChange(payload) {
  emitCalendarRequestChange(Object.assign({
    updatedAt: new Date().toISOString()
  }, payload));
}

function broadcastCalendarRequestBulk(monthKey, bases, base) {
  const baseList = bases && bases.length ? bases.slice() : (base ? [base] : []);
  emitCalendarRequestBulkChange({
    monthKey,
    bases: baseList,
    updatedAt: new Date().toISOString()
  });
}

function applyCalendarRequestMutation(existingRequests, params) {
  const {
    days,
    action,
    requestType,
    eventLabel,
    isModeration,
    isSuperAdmin,
    requesterName,
    reviewerName,
    filterLabel
  } = params;
  let requests = (existingRequests || []).slice();
  let scheduleApplyLabel = eventLabel;
  let scheduleApplyAction = action;

  if (action === 'delete') {
    requests = requests.filter(request => {
      if (days.indexOf(request.day) < 0) return true;
      if (requestType && request.requestType !== requestType) return true;
      if (filterLabel && request.label !== eventLabel) return true;
      if (!isSuperAdmin) {
        if (request.source !== 'local' || request.status !== 'pending') return true;
      }
      return false;
    });
  } else if (isModeration) {
    requests = requests.map(request => {
      if (days.indexOf(request.day) < 0) return request;
      if (requestType && request.requestType !== requestType) return request;
      const next = Object.assign({}, request, {
        status: action === 'approve' ? 'approved' : 'denied',
        updatedAt: new Date().toISOString(),
        reviewedBy: reviewerName
      });
      if (!scheduleApplyLabel || scheduleApplyLabel === '8' || scheduleApplyLabel === 'V') {
        scheduleApplyLabel = next.label || scheduleApplyLabel;
      }
      return next;
    });
    scheduleApplyAction = action === 'approve' ? 'add' : 'delete';
  } else {
    requests = requests.filter(request => days.indexOf(request.day) < 0);
    days.forEach(day => {
      requests.push({
        day,
        requestType,
        label: eventLabel,
        type: requestType === 'time_off' ? 'time_off_request' : 'work_request',
        status: 'pending',
        source: 'local',
        updatedAt: new Date().toISOString(),
        requestedBy: requesterName
      });
    });
  }
  requests.sort((a, b) => a.day - b.day);
  return { requests, scheduleApplyLabel, scheduleApplyAction };
}

async function loadFirebaseCalendarRequestRows(monthKey, bases) {
  const snapshots = await Promise.all(bases.map(base =>
    getFirebaseDb().collection(ROSTER_CALENDAR_COLLECTION)
      .where('monthKey', '==', monthKey)
      .where('base', '==', base)
      .get()
  ));
  const rows = [];
  snapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const data = doc.data() || {};
      (data.requests || []).forEach(request => {
        rows.push({
          base: data.base,
          monthKey: data.monthKey,
          personName: data.personName,
          personKey: data.personKey || calendarPersonKeyFromName(data.personName),
          rosterId: data.rosterId || null,
          day: request.day,
          requestType: request.requestType,
          label: request.label,
          type: request.type,
          status: request.status,
          source: request.source,
          requestedBy: request.requestedBy,
          reviewedBy: request.reviewedBy,
          updatedAt: request.updatedAt || null
        });
      });
    });
  });
  return rows;
}

async function listFirebasePersonRequests(base, monthKey, personName) {
  const docId = rosterCalendarDocId(base, new Date(monthKey.split('-')[0], parseInt(monthKey.split('-')[1], 10) - 1, 1), personName);
  const snap = await getFirebaseDb().collection(ROSTER_CALENDAR_COLLECTION).doc(docId).get();
  if (!snap.exists) return [];
  return (snap.data().requests || []).slice();
}

async function replaceFirebasePersonRequests(base, monthKey, personName, personKey, rosterId, requests) {
  const admin = require('firebase-admin');
  const parts = monthKey.split('-');
  const dateString = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  const docId = rosterCalendarDocId(base, dateString, personName);
  await getFirebaseDb().collection(ROSTER_CALENDAR_COLLECTION).doc(docId).set({
    base,
    monthKey,
    personName,
    personKey,
    rosterId: rosterId || null,
    requests: requests || [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return requests || [];
}

export async function getMonthMeta(monthKey) {
  if (usePostgresStore()) {
    const store = require('../rosterMonthMeta/rosterMonthMeta.store');
    return store.getMonthMeta(monthKey);
  }
  const snap = await getFirebaseDb().collection(ROSTER_MONTH_META_COLLECTION).doc(monthKey).get();
  if (!snap.exists) return { locked: false };
  return snap.data() || { locked: false };
}

export async function setMonthLock(monthKey, locked, lockedBy) {
  if (usePostgresStore()) {
    const store = require('../rosterMonthMeta/rosterMonthMeta.store');
    return store.setMonthLock(monthKey, locked, lockedBy);
  }
  const admin = require('firebase-admin');
  await getFirebaseDb().collection(ROSTER_MONTH_META_COLLECTION).doc(monthKey).set({
    monthKey,
    locked: locked === true,
    lockedAt: locked ? new Date().toISOString() : null,
    lockedBy: locked ? (lockedBy || null) : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return {
    monthKey,
    locked: locked === true
  };
}

export async function getStaffingMinimums() {
  if (usePostgresStore()) {
    const store = require('../rosterStaffingMinimum/rosterStaffingMinimum.store');
    return store.getStaffingMinimums();
  }
  const snap = await getFirebaseDb().collection(ROSTER_CONFIG_COLLECTION).doc('staffingMinimums').get();
  if (!snap.exists) return null;
  const data = snap.data();
  return data && data.minimums ? data.minimums : null;
}

export async function saveStaffingMinimums(minimums, updatedBy) {
  if (usePostgresStore()) {
    const store = require('../rosterStaffingMinimum/rosterStaffingMinimum.store');
    return store.saveStaffingMinimums(minimums, updatedBy);
  }
  const admin = require('firebase-admin');
  await getFirebaseDb().collection(ROSTER_CONFIG_COLLECTION).doc('staffingMinimums').set({
    minimums,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: updatedBy || null
  }, { merge: true });
  return true;
}

export async function loadScheduleLocal(base, dateString) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  const docId = rosterScheduleDocId(base, dateString);
  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    const result = await store.loadScheduleForBaseMonth(base, monthKey);
    return Object.assign({ docId }, result);
  }
  const doc = await getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).get();
  if (!doc.exists) {
    return { days: {}, docId, empty: true, updatedAt: null };
  }
  const data = doc.data();
  return {
    days: data.days || {},
    docId,
    empty: !data.days || !Object.keys(data.days).length,
    updatedAt: data.updatedAt || data.importedAt || null
  };
}

export async function loadScheduleBulk(dateString, bases, monthKeysInput) {
  const monthDates = monthDatesForBulkScheduleLoad(dateString, monthKeysInput);
  const seenMonths = {};
  const monthKeys = [];
  monthDates.forEach(monthDate => {
    const monthKey = rosterMonthKeyFromDate(monthDate);
    if (seenMonths[monthKey]) return;
    seenMonths[monthKey] = true;
    monthKeys.push(monthKey);
  });

  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    const scheduleDaysByMonth = await store.loadScheduleBulk(monthKeys, bases);
    let empty = true;
    monthKeys.forEach(monthKey => {
      const monthDays = scheduleDaysByMonth[monthKey];
      if (monthDays && Object.keys(monthDays).length) empty = false;
    });
    return {
      scheduleDaysByMonth,
      empty,
      monthKeys: Object.keys(scheduleDaysByMonth)
    };
  }

  const loads = [];
  monthKeys.forEach(monthKey => {
    const parts = monthKey.split('-');
    const monthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    bases.forEach(base => {
      loads.push({
        monthKey,
        docId: rosterScheduleDocId(base, monthDate)
      });
    });
  });
  const docs = await Promise.all(loads.map(item =>
    getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(item.docId).get()
      .then(doc => ({ item, doc }))
  ));
  const scheduleDaysByMonth = {};
  let empty = true;
  docs.forEach(({ item, doc }) => {
    if (!scheduleDaysByMonth[item.monthKey]) scheduleDaysByMonth[item.monthKey] = {};
    if (!doc.exists) return;
    const days = (doc.data() && doc.data().days) ? doc.data().days : {};
    if (days && Object.keys(days).length) empty = false;
    Object.assign(scheduleDaysByMonth[item.monthKey], days);
  });
  return {
    scheduleDaysByMonth,
    empty,
    monthKeys: Object.keys(scheduleDaysByMonth)
  };
}

export async function saveScheduleCell(base, dateString, rosterId, day, code) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  const docId = rosterScheduleDocId(base, dateString);
  let savedCode = null;
  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    savedCode = await store.saveScheduleCell(base, monthKey, rosterId, day, code);
  } else {
    const admin = require('firebase-admin');
    const dayKey = String(day);
    const fieldPath = `days.${rosterId}.${dayKey}`;
    const docRef = getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(docId);
    await docRef.set({
      base,
      monthKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (!code) {
      await docRef.update({
        [fieldPath]: admin.firestore.FieldValue.delete()
      });
    } else {
      savedCode = String(code).trim().toUpperCase();
      await docRef.set({
        [fieldPath]: savedCode
      }, { merge: true });
    }
  }
  broadcastScheduleCell(base, monthKey, rosterId, day, savedCode);
  return {
    saved: true,
    docId,
    rosterId,
    day,
    code: savedCode
  };
}

export async function applyScheduleCells(base, dateString, rosterId, days, code, action) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  let personDays = {};
  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    personDays = await store.applyScheduleCells(base, monthKey, rosterId, days, code, action);
  } else {
    const admin = require('firebase-admin');
    const scheduleDocId = rosterScheduleDocId(base, dateString);
    const scheduleRef = getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(scheduleDocId);
    await scheduleRef.set({
      base,
      monthKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    const updates = {};
    const shouldDelete = action === 'delete' || action === 'deny';
    (days || []).forEach(day => {
      const fieldPath = `days.${rosterId}.${day}`;
      updates[fieldPath] = shouldDelete
        ? admin.firestore.FieldValue.delete()
        : String(code || '').trim().toUpperCase();
    });
    if (Object.keys(updates).length) await scheduleRef.update(updates);
    const scheduleSnap = await scheduleRef.get();
    personDays = scheduleSnap.exists && scheduleSnap.data().days
      ? (scheduleSnap.data().days[rosterId] || {})
      : {};
  }
  const shouldDelete = action === 'delete' || action === 'deny';
  (days || []).forEach(day => {
    broadcastScheduleCell(
      base,
      monthKey,
      rosterId,
      day,
      shouldDelete ? null : String(code || '').trim().toUpperCase()
    );
  });
  return personDays;
}

export async function getPersonScheduleDays(base, dateString, rosterId) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    return store.getPersonScheduleDays(base, monthKey, rosterId);
  }
  const docId = rosterScheduleDocId(base, dateString);
  const doc = await getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).get();
  if (!doc.exists) return {};
  return ((doc.data().days || {})[rosterId]) || {};
}

export async function importScheduleDays(base, dateString, days) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  const docId = rosterScheduleDocId(base, dateString);
  let rowCount = 0;
  if (usePostgresStore()) {
    const store = require('../rosterScheduleCell/rosterScheduleCell.store');
    rowCount = await store.importScheduleDays(base, monthKey, days);
  } else {
    const admin = require('firebase-admin');
    await getFirebaseDb().collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).set({
      base,
      monthKey,
      days,
      importedFrom: 'acroroster',
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    rowCount = Object.keys(days || {}).length;
  }
  broadcastScheduleBulk(monthKey, null, base);
  return { docId, rowCount };
}

export async function loadCalendarRequestRows(monthKey, bases) {
  if (usePostgresStore()) {
    const store = require('../rosterCalendarRequest/rosterCalendarRequest.store');
    return store.loadCalendarRequestRows(monthKey, bases);
  }
  return loadFirebaseCalendarRequestRows(monthKey, bases);
}

export async function loadPersonCalendarRequestRows(monthKey, bases, personNames) {
  const personKeys = (personNames || [])
    .map(name => calendarPersonKeyFromName(name))
    .filter((key, index, arr) => key && arr.indexOf(key) === index);
  if (usePostgresStore()) {
    const store = require('../rosterCalendarRequest/rosterCalendarRequest.store');
    return store.loadPersonRequestRows(monthKey, bases, personKeys);
  }
  const rows = await loadFirebaseCalendarRequestRows(monthKey, bases);
  return rows.filter(row => personKeys.indexOf(row.personKey) > -1);
}

export async function mutateCalendarRequests(params) {
  const {
    base,
    dateString,
    personName,
    rosterId,
    days,
    action,
    requestType,
    eventLabel,
    isModeration,
    isSuperAdmin,
    requesterName,
    reviewerName,
    filterLabel
  } = params;
  const monthKey = rosterMonthKeyFromDate(dateString);
  const personKey = calendarPersonKeyFromName(personName);
  let existing = [];
  if (usePostgresStore()) {
    const store = require('../rosterCalendarRequest/rosterCalendarRequest.store');
    existing = await store.listPersonRequests(base, monthKey, personKey);
  } else {
    existing = await listFirebasePersonRequests(base, monthKey, personName);
  }
  const mutation = applyCalendarRequestMutation(existing, {
    days,
    action,
    requestType,
    eventLabel,
    isModeration,
    isSuperAdmin,
    requesterName,
    reviewerName,
    filterLabel
  });
  if (usePostgresStore()) {
    const store = require('../rosterCalendarRequest/rosterCalendarRequest.store');
    await store.replacePersonRequests(
      base,
      monthKey,
      personName,
      personKey,
      rosterId,
      mutation.requests
    );
  } else {
    await replaceFirebasePersonRequests(
      base,
      monthKey,
      personName,
      personKey,
      rosterId,
      mutation.requests
    );
  }
  broadcastCalendarRequestChange({
    monthKey,
    base,
    personName,
    personKey,
    rosterId: rosterId || null,
    action
  });
  return mutation;
}

export async function upsertImportedPersonRequests(dateString, personName, base, importedRequests) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  const personKey = calendarPersonKeyFromName(personName);
  let requests = [];
  if (usePostgresStore()) {
    const store = require('../rosterCalendarRequest/rosterCalendarRequest.store');
    const existing = await store.listPersonRequests(base, monthKey, personKey);
    requests = await store.importPersonRequests(
      base,
      monthKey,
      personName,
      personKey,
      null,
      importedRequests,
      existing
    );
  } else {
    const docId = rosterCalendarDocId(base, dateString, personName);
    const ref = getFirebaseDb().collection(ROSTER_CALENDAR_COLLECTION).doc(docId);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data().requests || []) : [];
    const keptLocal = existing.filter(request => request.source === 'local');
    const byDay = {};
    (importedRequests || []).forEach(request => {
      if (!request || !request.day) return;
      if (request.requestType === 'work') return;
      byDay[String(request.day)] = Object.assign({}, request, {
        source: 'acroroster',
        status: request.status || 'approved'
      });
    });
    keptLocal.forEach(request => {
      byDay[String(request.day)] = request;
    });
    requests = Object.keys(byDay)
      .map(key => byDay[key])
      .sort((a, b) => a.day - b.day);
    const admin = require('firebase-admin');
    await ref.set({
      base,
      monthKey,
      personName,
      personKey,
      requests,
      importedFrom: 'acroroster',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  broadcastCalendarRequestChange({
    monthKey,
    base,
    personName,
    personKey,
    action: 'import'
  });
  return requests;
}

export async function importCalendarRequestsBulk(dateString, bases) {
  const monthKey = rosterMonthKeyFromDate(dateString);
  broadcastCalendarRequestBulk(monthKey, bases, null);
}

function broadcastEmployeeSave(employee) {
  emitEmployeeSave(employee);
}

function broadcastEmployeeRemove(employee) {
  emitEmployeeRemove(employee);
}

function broadcastEmployeeBulk(bases) {
  emitEmployeeBulkChange({
    bases: bases || [],
    updatedAt: new Date().toISOString()
  });
}

async function upsertFirebaseImportedEmployee(employee) {
  let existingDoc = null;
  if (employee.acrorosterEmployeeId) {
    const byAcroId = await getFirebaseDb().collection(EMPLOYEES_COLLECTION)
      .where('base', '==', employee.base)
      .where('acrorosterEmployeeId', '==', employee.acrorosterEmployeeId)
      .limit(1)
      .get();
    if (!byAcroId.empty) existingDoc = byAcroId.docs[0];
  }
  if (!existingDoc) {
    const byName = await getFirebaseDb().collection(EMPLOYEES_COLLECTION)
      .where('base', '==', employee.base)
      .where('displayName', '==', employee.displayName)
      .limit(1)
      .get();
    if (!byName.empty) existingDoc = byName.docs[0];
  }
  if (!existingDoc && employee.importedFrom === 'acroroster') {
    const byNameAnyBase = await getFirebaseDb().collection(EMPLOYEES_COLLECTION)
      .where('displayName', '==', employee.displayName)
      .limit(10)
      .get();
    byNameAnyBase.docs.forEach(doc => {
      if (existingDoc) return;
      const data = doc.data() || {};
      if (data.importedFrom && data.importedFrom !== 'acroroster') return;
      existingDoc = doc;
    });
  }

  const admin = require('firebase-admin');
  const payload = Object.assign({}, employee, {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastImportedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  delete payload._id;

  if (existingDoc) {
    const existing = existingDoc.data();
    if (existing.jobCategory && existing.jobCategory !== 'uncategorized') {
      payload.jobCategory = existing.jobCategory;
    }
    await existingDoc.ref.set(payload, { merge: true });
    await pruneFirebaseCrossBaseEmployeeDuplicates(employee.displayName, employee.base, existingDoc.id);
    return { _id: existingDoc.id, updated: true, displayName: employee.displayName };
  }

  const docRef = getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc();
  payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  await docRef.set(payload);
  await pruneFirebaseCrossBaseEmployeeDuplicates(employee.displayName, employee.base, docRef.id);
  return { _id: docRef.id, created: true, displayName: employee.displayName };
}

async function pruneFirebaseCrossBaseEmployeeDuplicates(displayName, keepBase, keepId) {
  if (!displayName || !keepBase || !keepId) return 0;
  const snapshot = await getFirebaseDb().collection(EMPLOYEES_COLLECTION)
    .where('displayName', '==', displayName)
    .get();
  if (snapshot.empty) return 0;
  const batch = getFirebaseDb().batch();
  let removed = 0;
  snapshot.docs.forEach(doc => {
    if (doc.id === keepId) return;
    const data = doc.data() || {};
    if (data.importedFrom && data.importedFrom !== 'acroroster') return;
    if (data.base === keepBase) return;
    batch.delete(doc.ref);
    removed++;
  });
  if (removed) await batch.commit();
  return removed;
}

export async function loadEmployees(bases) {
  if (usePostgresStore()) {
    const { ensureRosterEmployeeSchema } = require('../rosterEmployee/rosterEmployee.schema');
    await ensureRosterEmployeeSchema(require('../../sqldb').sequelize);
    const store = require('../rosterEmployee/rosterEmployee.store');
    return store.listEmployeesByBases(bases);
  }
  const snapshots = await Promise.all(bases.map(base =>
    getFirebaseDb().collection(EMPLOYEES_COLLECTION).where('base', '==', base).get()
  ));
  const employees = [];
  snapshots.forEach((snapshot, index) => {
    const base = bases[index];
    snapshot.docs.forEach(doc => {
      employees.push(Object.assign({ _id: doc.id, base: doc.data().base || base }, doc.data()));
    });
  });
  return employees;
}

export async function saveEmployeeRecord(payload) {
  let saved = null;
  if (usePostgresStore()) {
    const store = require('../rosterEmployee/rosterEmployee.store');
    saved = await store.saveEmployee(payload);
  } else {
    const admin = require('firebase-admin');
    const body = Object.assign({}, payload, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    let docId = payload._id;
    if (docId) {
      await getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc(docId).set(body, { merge: true });
    } else {
      const docRef = getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc();
      docId = docRef.id;
      body.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await docRef.set(body);
    }
    const snap = await getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc(docId).get();
    saved = Object.assign({ _id: docId }, snap.data() || body);
  }
  if (saved) broadcastEmployeeSave(saved);
  return saved;
}

export async function deleteEmployeeRecord(docId) {
  let removed = { _id: docId };
  let deleted = false;
  if (usePostgresStore()) {
    const store = require('../rosterEmployee/rosterEmployee.store');
    const existing = await store.getEmployeeById(docId);
    if (existing) removed = existing;
    deleted = await store.deleteEmployee(docId);
  } else {
    const ref = getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc(docId);
    const snap = await ref.get();
    if (snap.exists) removed = Object.assign({ _id: docId }, snap.data());
    await ref.delete();
    deleted = true;
  }
  if (deleted) broadcastEmployeeRemove(removed);
  return deleted;
}

export async function upsertImportedEmployee(employee, options) {
  const silent = options && options.silent === true;
  let saved = null;
  if (usePostgresStore()) {
    const store = require('../rosterEmployee/rosterEmployee.store');
    saved = await store.upsertImportedEmployee(employee);
    if (!silent) {
      const row = await store.getEmployeeById(saved._id);
      if (row) broadcastEmployeeSave(row);
    }
  } else {
    saved = await upsertFirebaseImportedEmployee(employee);
    if (!silent) {
      const snap = await getFirebaseDb().collection(EMPLOYEES_COLLECTION).doc(saved._id).get();
      if (snap.exists) broadcastEmployeeSave(Object.assign({ _id: saved._id }, snap.data()));
    }
  }
  return saved;
}

export async function importEmployeesBulk(bases) {
  broadcastEmployeeBulk(bases);
}
