/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/canledar              ->  index
 * POST    /api/canledar              ->  create
 * GET     /api/canledar/:id          ->  show
 * PUT     /api/canledar/:id          ->  update
 * DELETE  /api/canledar/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Calendar} from '../../sqldb';
const axios = require("axios");
import localEnv from '../../config/local.env.js';
const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firebase_db = admin.firestore();
const ROSTER_SCHEDULES_COLLECTION = 'rosterschedules';
const EMPLOYEES_COLLECTION = 'employees';
const ROSTER_CALENDAR_COLLECTION = 'rostercalendar';
const STAFF_JOB_CATEGORIES = [
  'csa-dispatch',
  'ground-cargo',
  'maintenance',
  'cleaner',
  'office-admin',
  'uncategorized'
];
let todaysRoster=[];

// Employees removed in AcroRoster but still returned by the tenant API
const ROSTER_BLOCKLIST_LAST_NAMES = ['Ulroan'];

function isBlockedRosterEmployee(record) {
  if (!record || !record.employee_full_name) return false;
  const parts = String(record.employee_full_name).trim().split(/\s+/);
  if (!parts.length) return false;
  const lastName = parts[parts.length - 1];
  return ROSTER_BLOCKLIST_LAST_NAMES.some(blocked => blocked.toLowerCase() === lastName.toLowerCase());
}

function filterRosterImport(records) {
  if (!records || !Array.isArray(records)) return [];
  return records.filter(record => !isBlockedRosterEmployee(record));
}

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function saveUpdates(updates) {
  return function(entity) {
    if(entity) {
      return entity.update(updates)
        .then(updated => {
          return updated;
        });
    }
  };
}

function removeEntity(res) {
  return function(entity) {
    if (entity) {
      return entity.destroy()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Calendars
export function index(req, res) {
  return Calendar.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Calendar from the DB
export function show(req, res) {
  return Calendar.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Calendar in the DB
export function create(req, res) {
  return Calendar.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Calendar in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Calendar.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function getFirstAndLast(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return { firstDay, lastDay };
}

export function month(req,res) {
  let date=new Date(req.body.date);
  let firstAndLast=getFirstAndLast(date);
  return Calendar.findAll({
    where: {
        dateObj: {
          $between: [firstAndLast.firstDay, firstAndLast.lastDay]
        }
      }
    }  
  )
  .then(respondWithResult(res))
  .catch(handleError(res));
}

// Deletes a Calendar from the DB
export function destroy(req, res) {
  return Calendar.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

function rosterMonthDocId(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function rosterScheduleDocId(base, dateString) {
  return `${base}-${rosterMonthDocId(dateString)}`;
}

function personKeyFromName(name) {
  return normalizePersonName(name).replace(/\s+/g, '-');
}

function rosterCalendarDocId(base, dateString, personName) {
  return `${base}-${rosterMonthDocId(dateString)}-${personKeyFromName(personName)}`;
}

const ROSTER_BASES = ['OME', 'OTZ', 'UNK'];

function normalizeRequestedBases(body) {
  let bases = [];
  if (body && Array.isArray(body.bases) && body.bases.length) {
    bases = body.bases;
  } else if (body && body.base) {
    bases = [body.base];
  } else {
    bases = ROSTER_BASES.slice();
  }
  return bases
    .map(base => String(base || '').trim().toUpperCase())
    .filter(base => ROSTER_BASES.indexOf(base) > -1)
    .filter((base, index, arr) => arr.indexOf(base) === index);
}

function recordMatchesBaseFilter(record, base) {
  if (!record || !record.location_name) return true;
  const recordBase = locationToBase(record.location_name);
  if (!recordBase) return false;
  return recordBase === base;
}

function filterEventsForPerson(events, personName, base) {
  const target = normalizePersonName(personName);
  return filterRosterImport(events || []).filter(record => {
    if (normalizePersonName(record.employee_full_name) !== target) return false;
    return recordMatchesBaseFilter(record, base);
  });
}

function isAcrorosterShiftEvent(record) {
  if (!record) return false;
  const type = String(record.type || '').toLowerCase();
  if (!type || type === 'shift') return true;
  return false;
}

function inferAcrorosterRequestType(record) {
  const type = String(record.type || '').toLowerCase();
  const label = String(record.label || '').trim().toUpperCase();
  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'B', 'T'];
  if (type.indexOf('time_off') > -1 || type.indexOf('time-off') > -1 || type.indexOf('pto') > -1) {
    return 'time_off';
  }
  if (type.indexOf('work') > -1 || type === 'available' || type.indexOf('request_work') > -1) {
    return 'work';
  }
  if (offCodes.indexOf(label) > -1) return 'time_off';
  if (label && !isAcrorosterShiftEvent(record)) return 'work';
  return null;
}

function expandEventsToDayRecords(events) {
  const result = [];
  spreadAcrorosterEvents(events).forEach(record => {
    const requestType = isAcrorosterShiftEvent(record) ? null : inferAcrorosterRequestType(record);
    result.push({
      day: new Date(record.start_plain_date_time).getUTCDate(),
      label: record.label,
      type: requestType === 'time_off' ? 'time_off_request'
        : requestType === 'work' ? 'work_request'
        : (record.type || 'shift'),
      requestType: requestType || undefined,
      employee_full_name: record.employee_full_name,
      location_name: record.location_name,
      start_plain_date_time: record.start_plain_date_time,
      source: 'acroroster',
      status: requestType ? (record.status || 'approved') : undefined
    });
  });
  return result;
}

function normalizeRequestedDays(body) {
  if (!body) return [];
  if (Array.isArray(body.days) && body.days.length) {
    return body.days
      .map(day => parseInt(day, 10))
      .filter(day => day >= 1 && day <= 31)
      .filter((day, index, arr) => arr.indexOf(day) === index)
      .sort((a, b) => a - b);
  }
  const start = parseInt(body.dayStart != null ? body.dayStart : body.day, 10);
  const end = parseInt(body.dayEnd != null ? body.dayEnd : body.day, 10);
  if (!start || !end) return [];
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const days = [];
  for (let day = from; day <= to; day++) days.push(day);
  return days;
}

async function upsertImportedPersonRequests(dateString, personName, base, importedRequests) {
  const docId = rosterCalendarDocId(base, dateString, personName);
  const ref = firebase_db.collection(ROSTER_CALENDAR_COLLECTION).doc(docId);
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data().requests || []) : [];
  const keptLocal = existing.filter(request => request.source === 'local');
  const byDay = {};
  importedRequests.forEach(request => {
    if (!request || !request.day) return;
    byDay[String(request.day)] = Object.assign({}, request, {
      source: 'acroroster',
      status: request.status || 'approved'
    });
  });
  keptLocal.forEach(request => {
    byDay[String(request.day)] = request;
  });
  const requests = Object.keys(byDay)
    .map(key => byDay[key])
    .sort((a, b) => a.day - b.day);
  await ref.set({
    base,
    monthKey: rosterMonthDocId(dateString),
    personName,
    personKey: personKeyFromName(personName),
    requests,
    importedFrom: 'acroroster',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return requests;
}

async function importAcrorosterRequestsForBases(events, dateString, bases) {
  const byPersonBase = {};
  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'B', 'T'];
  (events || []).forEach(record => {
    if (isBlockedRosterEmployee(record)) return;
    const personName = String(record.employee_full_name || '').trim();
    if (!personName) return;
    const eventBase = locationToBase(record.location_name);
    if (!eventBase || bases.indexOf(eventBase) < 0) return;

    let requestType = null;
    if (!isAcrorosterShiftEvent(record)) {
      requestType = inferAcrorosterRequestType(record);
    } else {
      const label = String(record.label || '').trim().toUpperCase();
      if (offCodes.indexOf(label) > -1) requestType = 'time_off';
    }
    if (!requestType) return;

    const key = `${eventBase}::${normalizePersonName(personName)}`;
    if (!byPersonBase[key]) {
      byPersonBase[key] = { personName, base: eventBase, requests: [] };
    }
    spreadAcrorosterEvents([record]).forEach(dayRecord => {
      const day = new Date(dayRecord.start_plain_date_time).getUTCDate();
      const label = String(dayRecord.label || (requestType === 'time_off' ? 'V' : '8')).trim().toUpperCase();
      byPersonBase[key].requests.push({
        day,
        requestType,
        label: label.substring(0, 4),
        type: requestType === 'time_off' ? 'time_off_request' : 'work_request',
        status: dayRecord.status || 'approved',
        source: 'acroroster',
        updatedAt: new Date().toISOString()
      });
    });
  });

  let people = 0;
  for (const key of Object.keys(byPersonBase)) {
    const entry = byPersonBase[key];
    const deduped = {};
    entry.requests.forEach(request => {
      deduped[String(request.day)] = request;
    });
    await upsertImportedPersonRequests(
      dateString,
      entry.personName,
      entry.base,
      Object.keys(deduped).map(dayKey => deduped[dayKey])
    );
    people++;
  }
  return { people, requestGroups: Object.keys(byPersonBase).length };
}

async function loadLocalPersonCalendarEvents(dateString, personName, base, pilots, employees) {
  const events = [];
  const target = normalizePersonName(personName);
  const pilot = (pilots || []).find(item => normalizePersonName(pilotFullName(item)) === target);
  const employee = (employees || []).find(item => normalizePersonName(item.displayName || pilotFullName(item)) === target);
  let rosterId = null;
  if (pilot && pilot._id) rosterId = `pilot:${pilot._id}`;
  else if (employee && employee._id) rosterId = `employee:${employee._id}`;

  if (rosterId) {
    const docId = rosterScheduleDocId(base, dateString);
    const doc = await firebase_db.collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).get();
    const personDays = doc.exists && doc.data().days ? doc.data().days[rosterId] || {} : {};
    Object.keys(personDays).forEach(dayKey => {
      if (!personDays[dayKey]) return;
      events.push({
        day: parseInt(dayKey, 10),
        label: personDays[dayKey],
        type: 'shift',
        source: 'schedule'
      });
    });
  }

  const calDocId = rosterCalendarDocId(base, dateString, personName);
  const calDoc = await firebase_db.collection(ROSTER_CALENDAR_COLLECTION).doc(calDocId).get();
  if (calDoc.exists) {
    (calDoc.data().requests || []).forEach(request => {
      events.push(Object.assign({}, request, { source: 'local' }));
    });
  }
  return events;
}

const ACRO_NAME_ALIASES = {
  'sophia hobbs': 'sophia evans'
};

function parseFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function normalizePersonName(name) {
  const key = String(name || '').trim().toLowerCase();
  return ACRO_NAME_ALIASES[key] || key;
}

function locationToBase(locationName) {
  if (!locationName) return null;
  const location = String(locationName).split(' ')[0].toUpperCase();
  if (location === 'NOME') return 'OME';
  if (location === 'KOTZEBUE' || location === 'KOTZ') return 'OTZ';
  if (location === 'UNALAKLEET' || location === 'UNK') return 'UNK';
  return null;
}

function isPilotLocation(locationName) {
  if (!locationName) return false;
  const parts = String(locationName).trim().split(/\s+/);
  const position = (parts[1] || '').toUpperCase();
  return position === 'CAPT' || position === 'FO';
}

function buildPilotNameSet(pilots) {
  const names = new Set();
  (pilots || []).forEach(pilot => {
    names.add(normalizePersonName(pilotFullName(pilot)));
    if (pilot.firstName && pilot.lastName) {
      names.add(normalizePersonName(`${pilot.firstName} ${pilot.lastName}`));
    }
  });
  return names;
}

function normalizeJobCategory(value) {
  const key = String(value || '').trim().toLowerCase();
  if (STAFF_JOB_CATEGORIES.indexOf(key) > -1) return key;
  return 'uncategorized';
}

function inferJobCategory(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay) return 'uncategorized';
  if (/dispatch|dispatcher|\bcsa\b|ticket counter|counter open|counter close|customer service|operations control|\boc\b/.test(hay)) {
    return 'csa-dispatch';
  }
  if (/cargo|ground|ramp|baggage|handler|warehouse|loader|freight/.test(hay)) {
    return 'ground-cargo';
  }
  if (/maintenance|mechanic|hangar|\bmx\b|airframe|powerplant|a&p/.test(hay)) {
    return 'maintenance';
  }
  if (/clean|janitor|housekeep|custodial/.test(hay)) {
    return 'cleaner';
  }
  if (/office|admin|account|payroll|assistant|receivable|human resource|\bhr\b|bookkeep/.test(hay)) {
    return 'office-admin';
  }
  return 'uncategorized';
}

function mapAcrorosterEmployeeRecord(record, base) {
  const firstName = (record.first_name || record.firstName || '').trim();
  const lastName = (record.last_name || record.lastName || '').trim();
  const displayName = (record.full_name || record.display_name || record.displayName || `${firstName} ${lastName}`).trim();
  if (!displayName && !firstName && !lastName) return null;
  const parsed = parseFullName(displayName || `${firstName} ${lastName}`);
  let qualifications = record.qualifications || record.qualification || '';
  if (Array.isArray(qualifications)) qualifications = qualifications.join(', ');
  const qualificationText = String(qualifications || '').trim();
  const jobCategory = normalizeJobCategory(
    record.job_category || record.jobCategory || inferJobCategory(`${qualificationText} ${record.location_name || ''} ${record.title || ''}`)
  );
  return {
    firstName: firstName || parsed.firstName,
    lastName: lastName || parsed.lastName,
    displayName: displayName || `${parsed.firstName} ${parsed.lastName}`.trim(),
    base: locationToBase(record.location_name || record.base || record.location) || base,
    employeeNumber: String(record.employee_number || record.employeeNumber || record.emp_number || '').trim(),
    qualifications: qualificationText,
    jobCategory,
    isActive: record.is_active !== false && record.isActive !== false,
    importedFrom: 'acroroster',
    acrorosterEmployeeId: record.id || record._id || record.employee_id || ''
  };
}

function inferEmployeesFromAcrorosterEvents(events, pilots, base) {
  const pilotNames = buildPilotNameSet(pilots);
  const byName = {};

  (events || []).forEach(record => {
    if (isBlockedRosterEmployee(record)) return;
    const fullName = String(record.employee_full_name || '').trim();
    if (!fullName) return;
    if (pilotNames.has(normalizePersonName(fullName))) return;
    if (isPilotLocation(record.location_name)) return;

    const recordBase = locationToBase(record.location_name) || base;
    if (recordBase !== base) return;

    const key = normalizePersonName(fullName);
    if (!byName[key]) {
      const parsed = parseFullName(fullName);
      byName[key] = {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: fullName,
        base: recordBase,
        employeeNumber: '',
        qualificationParts: new Set(),
        eventCount: 0,
        acrorosterEmployeeId: ''
      };
    }
    const entry = byName[key];
    entry.eventCount++;
    if (record.location_name) entry.qualificationParts.add(record.location_name);
    if (record.label) entry.qualificationParts.add(record.label);
    const empNum = record.employee_number || record.employeeNumber;
    if (empNum && !entry.employeeNumber) entry.employeeNumber = String(empNum);
    const acroId = record.employee_id || record.employee_uuid || record.employeeId;
    if (acroId && !entry.acrorosterEmployeeId) entry.acrorosterEmployeeId = String(acroId);
  });

  return Object.values(byName).map(entry => {
    const qualifications = Array.from(entry.qualificationParts).join(', ');
    return {
      firstName: entry.firstName,
      lastName: entry.lastName,
      displayName: entry.displayName,
      base: entry.base,
      employeeNumber: entry.employeeNumber,
      qualifications,
      jobCategory: inferJobCategory(qualifications),
      isActive: true,
      importedFrom: 'acroroster',
      acrorosterEmployeeId: entry.acrorosterEmployeeId,
      sourceEventCount: entry.eventCount
    };
  });
}

function mergeInferredEmployees(directEmployees, inferredEmployees) {
  const merged = {};
  directEmployees.forEach(employee => {
    if (!employee || !employee.displayName) return;
    merged[normalizePersonName(employee.displayName)] = employee;
  });
  inferredEmployees.forEach(employee => {
    const key = normalizePersonName(employee.displayName);
    if (!merged[key]) {
      merged[key] = employee;
      return;
    }
    const existing = merged[key];
    if (!existing.employeeNumber && employee.employeeNumber) existing.employeeNumber = employee.employeeNumber;
    if (!existing.qualifications && employee.qualifications) existing.qualifications = employee.qualifications;
    else if (employee.qualifications && existing.qualifications.indexOf(employee.qualifications) < 0) {
      existing.qualifications = `${existing.qualifications}, ${employee.qualifications}`;
    }
    if (!existing.acrorosterEmployeeId && employee.acrorosterEmployeeId) {
      existing.acrorosterEmployeeId = employee.acrorosterEmployeeId;
    }
    if ((!existing.jobCategory || existing.jobCategory === 'uncategorized') && employee.jobCategory) {
      existing.jobCategory = employee.jobCategory;
    }
    existing.sourceEventCount = (existing.sourceEventCount || 0) + (employee.sourceEventCount || 0);
  });
  return Object.values(merged);
}

async function fetchAcrorosterTable(table) {
  const bodyParameters = { headers: { Authorization: localEnv.ROSTER_TOKEN } };
  const url = `https://fyccqqeiahhzheubvavn.supabase.co/functions/v1/tenant-api-handler?table=${table}`;
  const response = await axios.get(url, bodyParameters);
  return response.data && response.data.data ? response.data.data : [];
}

async function fetchAcrorosterEventsForRange(centerDateString, monthSpan) {
  const span = Math.max(1, Math.min(parseInt(monthSpan, 10) || 1, 12));
  const center = new Date(centerDateString);
  const startOffset = -Math.floor((span - 1) / 2);
  const events = [];
  const monthsLoaded = [];

  for (let i = 0; i < span; i++) {
    const monthDate = new Date(center.getFullYear(), center.getMonth() + startOffset + i, 15);
    const monthEvents = await setRosterMonth(monthDate);
    monthsLoaded.push(rosterMonthDocId(monthDate));
    monthEvents.forEach(record => events.push(record));
  }

  return { events, monthsLoaded, monthSpan: span };
}

async function upsertImportedEmployee(employee) {
  let existingDoc = null;
  if (employee.acrorosterEmployeeId) {
    const byAcroId = await firebase_db.collection(EMPLOYEES_COLLECTION)
      .where('base', '==', employee.base)
      .where('acrorosterEmployeeId', '==', employee.acrorosterEmployeeId)
      .limit(1)
      .get();
    if (!byAcroId.empty) existingDoc = byAcroId.docs[0];
  }
  if (!existingDoc) {
    const byName = await firebase_db.collection(EMPLOYEES_COLLECTION)
      .where('base', '==', employee.base)
      .where('displayName', '==', employee.displayName)
      .limit(1)
      .get();
    if (!byName.empty) existingDoc = byName.docs[0];
  }

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
    return { _id: existingDoc.id, updated: true, displayName: employee.displayName };
  }

  const docRef = firebase_db.collection(EMPLOYEES_COLLECTION).doc();
  payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  await docRef.set(payload);
  return { _id: docRef.id, created: true, displayName: employee.displayName };
}

function pilotFullName(pilot) {
  if (!pilot) return '';
  if (pilot.firstName && pilot.lastName) return `${pilot.firstName} ${pilot.lastName}`;
  return pilot.displayName || '';
}

function acrorosterLabelForGrid(record, pilot) {
  let label = record.label;
  if (label === '8') label = 'C8';
  if (label === '16') {
    label = pilot && pilot.far299Exp ? 'NM' : 'ND';
  }
  return label;
}

function employeeLabelForGrid(record) {
  let label = String(record.label || '').trim();
  if (!label) return '';
  if (label.length > 4) label = label.substring(0, 4);
  return label.toUpperCase();
}

function spreadAcrorosterEvents(events) {
  const arr = [];
  (events || []).forEach(record => {
    arr.push(record);
    const startDate = new Date(record.start_plain_date_time);
    let daysLength = Math.ceil(Math.abs(new Date(record.end_plain_date_time).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    while (daysLength > 1) {
      daysLength--;
      const newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + daysLength);
      const newRecord = Object.assign({}, record);
      newRecord.start_plain_date_time = newDate.toISOString();
      arr.push(newRecord);
    }
  });
  return arr;
}

function acrorosterEventsToScheduleDays(events, pilots, employees) {
  const days = {};
  const pilotByName = {};
  (pilots || []).forEach(pilot => {
    pilotByName[pilotFullName(pilot)] = pilot;
    if (pilotFullName(pilot) === 'Sophia Evans') pilotByName['Sophia Hobbs'] = pilot;
  });
  const employeeByName = {};
  (employees || []).forEach(employee => {
    const displayName = employee.displayName || pilotFullName(employee);
    if (displayName) employeeByName[normalizePersonName(displayName)] = employee;
  });
  spreadAcrorosterEvents(events).forEach(record => {
    if (isBlockedRosterEmployee(record)) return;
    if (record.type && record.type !== 'shift') return;
    const day = new Date(record.start_plain_date_time).getUTCDate();
    const pilot = pilotByName[record.employee_full_name];
    if (pilot && pilot._id) {
      const rosterId = `pilot:${pilot._id}`;
      if (!days[rosterId]) days[rosterId] = {};
      days[rosterId][String(day)] = acrorosterLabelForGrid(record, pilot);
      return;
    }
    if (isPilotLocation(record.location_name)) return;
    const employee = employeeByName[normalizePersonName(record.employee_full_name)];
    if (!employee || !employee._id) return;
    const rosterId = `employee:${employee._id}`;
    if (!days[rosterId]) days[rosterId] = {};
    days[rosterId][String(day)] = employeeLabelForGrid(record);
  });
  return days;
}

export async function rosterPersonMonth(req, res) {
  const personName = req.body.personName;
  const base = req.body.base;
  const source = req.body.source || 'acroroster';
  const dateString = req.body.date || new Date();
  if (!personName || !base) return res.status(400).json({ message: 'personName and base are required' });
  try {
    if (source === 'local') {
      const events = await loadLocalPersonCalendarEvents(
        dateString,
        personName,
        base,
        req.body.pilots || [],
        req.body.employees || []
      );
      return res.status(200).json({ events });
    }
    const monthEvents = await setRosterMonth(dateString);
    const personEvents = filterEventsForPerson(monthEvents, personName, base);
    return res.status(200).json({ events: expandEventsToDayRecords(personEvents) });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load person calendar' });
  }
}

export async function rosterCalendarSave(req, res) {
  const base = req.body.base;
  const personName = req.body.personName;
  const requestType = req.body.requestType;
  const action = req.body.action || 'add';
  const dateString = req.body.date || new Date();
  const days = normalizeRequestedDays(req.body);
  if (!base || !personName || !requestType || !days.length) {
    return res.status(400).json({ message: 'base, personName, requestType, and day/days are required' });
  }
  const defaultLabel = requestType === 'time_off' ? 'V' : '8';
  const eventLabel = String(req.body.label || defaultLabel).trim().toUpperCase();
  const applyToSchedule = req.body.applyToSchedule !== false;
  const rosterId = req.body.rosterId || null;
  const docId = rosterCalendarDocId(base, dateString, personName);
  try {
    const ref = firebase_db.collection(ROSTER_CALENDAR_COLLECTION).doc(docId);
    const snap = await ref.get();
    let requests = snap.exists ? (snap.data().requests || []).slice() : [];
    if (action === 'delete') {
      requests = requests.filter(request => {
        if (days.indexOf(request.day) < 0) return true;
        if (requestType && request.requestType !== requestType) return true;
        if (req.body.label && request.label !== eventLabel) return true;
        return false;
      });
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
          updatedAt: new Date().toISOString()
        });
      });
    }
    requests.sort((a, b) => a.day - b.day);
    await ref.set({
      base,
      monthKey: rosterMonthDocId(dateString),
      personName,
      personKey: personKeyFromName(personName),
      requests,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    let scheduleDays = null;
    if (applyToSchedule && rosterId) {
      const scheduleDocId = rosterScheduleDocId(base, dateString);
      const scheduleRef = firebase_db.collection(ROSTER_SCHEDULES_COLLECTION).doc(scheduleDocId);
      await scheduleRef.set({
        base,
        monthKey: rosterMonthDocId(dateString),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      const updates = {};
      days.forEach(day => {
        const fieldPath = `days.${rosterId}.${day}`;
        if (action === 'delete') {
          updates[fieldPath] = admin.firestore.FieldValue.delete();
        } else {
          updates[fieldPath] = eventLabel;
        }
      });
      if (Object.keys(updates).length) await scheduleRef.update(updates);
      const scheduleSnap = await scheduleRef.get();
      scheduleDays = scheduleSnap.exists && scheduleSnap.data().days
        ? (scheduleSnap.data().days[rosterId] || {})
        : {};
    }

    return res.status(200).json({ requests, days, scheduleDays, rosterId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save calendar request' });
  }
}

export async function rosterMonth(req, res) {
  let dateString=new Date();
  if (req.body.date) dateString=req.body.date;
  const roster=await setRosterMonth(dateString);
  res.status(200).json(roster);
}

export async function rosterScheduleLocal(req, res) {
  let dateString = new Date();
  if (req.body.date) dateString = req.body.date;
  const base = req.body.base;
  if (!base) return res.status(400).json({ message: 'base is required' });
  const docId = rosterScheduleDocId(base, dateString);
  try {
    const doc = await firebase_db.collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).get();
    if (!doc.exists) {
      return res.status(200).json({ days: {}, docId, empty: true });
    }
    const data = doc.data();
    return res.status(200).json({
      days: data.days || {},
      docId,
      empty: !data.days || !Object.keys(data.days).length,
      updatedAt: data.updatedAt || data.importedAt || null
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load local roster schedule' });
  }
}

export async function rosterScheduleSave(req, res) {
  const base = req.body.base;
  const rosterId = req.body.rosterId;
  const day = parseInt(req.body.day, 10);
  let code = req.body.code;
  let dateString = req.body.date || new Date();
  if (!base || !rosterId || !day) {
    return res.status(400).json({ message: 'base, rosterId, and day are required' });
  }
  const docId = rosterScheduleDocId(base, dateString);
  const dayKey = String(day);
  const fieldPath = `days.${rosterId}.${dayKey}`;
  try {
    const docRef = firebase_db.collection(ROSTER_SCHEDULES_COLLECTION).doc(docId);
    await docRef.set({
      base,
      monthKey: rosterMonthDocId(dateString),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (!code) {
      await docRef.update({
        [fieldPath]: admin.firestore.FieldValue.delete()
      });
    } else {
      code = String(code).trim().toUpperCase();
      await docRef.set({
        [fieldPath]: code
      }, { merge: true });
    }
    return res.status(200).json({ saved: true, docId, rosterId, day, code: code || null });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save roster schedule cell' });
  }
}

export async function rosterEmployees(req, res) {
  const base = req.body.base;
  if (!base) return res.status(400).json({ message: 'base is required' });
  try {
    const snapshot = await firebase_db.collection(EMPLOYEES_COLLECTION).where('base', '==', base).get();
    const employees = snapshot.docs.map(doc => Object.assign({ _id: doc.id }, doc.data()));
    return res.status(200).json(employees);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load employees' });
  }
}

export async function rosterEmployeeSave(req, res) {
  const base = req.body.base;
  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();
  if (!base) return res.status(400).json({ message: 'base is required' });
  if (!firstName || !lastName) return res.status(400).json({ message: 'firstName and lastName are required' });
  const payload = {
    base,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    employeeNumber: (req.body.employeeNumber || '').trim(),
    qualifications: (req.body.qualifications || '').trim(),
    jobCategory: normalizeJobCategory(req.body.jobCategory),
    isActive: req.body.isActive !== false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  try {
    let docId = req.body._id;
    if (docId) {
      await firebase_db.collection(EMPLOYEES_COLLECTION).doc(docId).set(payload, { merge: true });
    } else {
      const docRef = firebase_db.collection(EMPLOYEES_COLLECTION).doc();
      docId = docRef.id;
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await docRef.set(payload);
    }
    return res.status(200).json(Object.assign({ _id: docId }, payload));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save employee' });
  }
}

export async function rosterEmployeeDelete(req, res) {
  const docId = req.body._id;
  if (!docId) return res.status(400).json({ message: '_id is required' });
  try {
    await firebase_db.collection(EMPLOYEES_COLLECTION).doc(docId).delete();
    return res.status(200).json({ deleted: true, _id: docId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to delete employee' });
  }
}

export async function rosterEmployeesImportFromAcroroster(req, res) {
  const bases = normalizeRequestedBases(req.body);
  const pilots = req.body.pilots || [];
  let dateString = req.body.date || new Date();
  const monthSpan = req.body.monthSpan || 1;
  if (!bases.length) return res.status(400).json({ message: 'base or bases is required' });

  try {
    const range = await fetchAcrorosterEventsForRange(dateString, monthSpan);
    let employeeTable = [];
    try {
      employeeTable = await fetchAcrorosterTable('employees');
    } catch (tableErr) {
      console.log('AcroRoster employees table unavailable, inferring from schedule events', tableErr.message);
    }

    const results = {
      created: 0,
      updated: 0,
      employees: [],
      bases,
      byBase: {},
      monthsLoaded: range.monthsLoaded,
      monthSpan: range.monthSpan
    };

    for (const base of bases) {
      const directEmployees = employeeTable
        .map(record => mapAcrorosterEmployeeRecord(record, base))
        .filter(record => record && record.base === base);
      const inferredEmployees = inferEmployeesFromAcrorosterEvents(range.events, pilots, base);
      const candidates = mergeInferredEmployees(directEmployees, inferredEmployees);
      const baseResult = { base, created: 0, updated: 0, count: candidates.length };

      for (const employee of candidates) {
        const saved = await upsertImportedEmployee(employee);
        if (saved.created) {
          results.created++;
          baseResult.created++;
        } else {
          results.updated++;
          baseResult.updated++;
        }
        results.employees.push(Object.assign({ base }, saved));
      }
      results.byBase[base] = baseResult;
    }

    return res.status(200).json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to import employees from AcroRoster' });
  }
}

export async function rosterScheduleLocalImport(req, res) {
  let dateString = new Date();
  if (req.body.date) dateString = req.body.date;
  const bases = normalizeRequestedBases(req.body);
  const pilots = req.body.pilots || [];
  if (!bases.length) return res.status(400).json({ message: 'base or bases is required' });

  try {
    const events = await setRosterMonth(dateString);
    const mergedDays = {};
    let employeesCreated = 0;
    let employeesUpdated = 0;
    const baseResults = [];

    for (const base of bases) {
      const docId = rosterScheduleDocId(base, dateString);
      const baseEvents = events.filter(record => locationToBase(record.location_name) === base);
      const inferredEmployees = inferEmployeesFromAcrorosterEvents(baseEvents, pilots, base);
      const savedEmployees = [];
      for (const employee of inferredEmployees) {
        const saved = await upsertImportedEmployee(employee);
        savedEmployees.push(saved);
        if (saved.created) employeesCreated++;
        else employeesUpdated++;
      }
      const employeeDocs = savedEmployees.map(saved => {
        const match = inferredEmployees.find(employee => employee.displayName === saved.displayName);
        return Object.assign({}, match || {}, { _id: saved._id });
      });
      const days = acrorosterEventsToScheduleDays(baseEvents, pilots, employeeDocs);
      Object.keys(days).forEach(rosterId => {
        if (!mergedDays[rosterId]) mergedDays[rosterId] = {};
        Object.assign(mergedDays[rosterId], days[rosterId]);
      });
      const payload = {
        base,
        monthKey: rosterMonthDocId(dateString),
        days,
        importedFrom: 'acroroster',
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await firebase_db.collection(ROSTER_SCHEDULES_COLLECTION).doc(docId).set(payload, { merge: true });
      baseResults.push({
        base,
        docId,
        empty: !Object.keys(days).length,
        dayKeys: Object.keys(days).length,
        employeesCreated: savedEmployees.filter(saved => saved.created).length,
        employeesUpdated: savedEmployees.filter(saved => saved.updated).length
      });
    }

    const requestImport = await importAcrorosterRequestsForBases(events, dateString, bases);

    return res.status(200).json({
      days: mergedDays,
      bases,
      byBase: baseResults,
      empty: !Object.keys(mergedDays).length,
      imported: true,
      employeesCreated,
      employeesUpdated,
      calendarRequestsImported: requestImport.people
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to import roster month into rosterschedules' });
  }
}

// Legacy route names kept for older clients
export const rosterMonthFirebase = rosterScheduleLocal;
export const rosterMonthFirebaseImport = rosterScheduleLocalImport;

export async function rosterDay(req, res) {
  let dateString=new Date();
  if (req.body.dateString) dateString=req.body.dateString;
  const roster=await setRosterDay(dateString);
  res.status(200).json(roster);
}

export async function setRosterMonth(dateString){
  const bodyParameters = {headers: {'Authorization':localEnv.ROSTER_TOKEN} };
  let date=new Date(dateString);
  let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  firstDay.setUTCHours(0, 0, 0, 0);
  lastDay.setUTCHours(0, 0, 0, 0);
  let startDate=firstDay.toISOString();
  let endDate=lastDay.toISOString();
  try{//type=shift restricts response to only working days, not available or requested off
    let response=await axios.get('https://fyccqqeiahhzheubvavn.supabase.co/functions/v1/tenant-api-handler?table=calendar_events&start_plain_date_time='+startDate+'&end_plain_date_time='+endDate, bodyParameters);
    //todaysRoster=response.data.data;
    return filterRosterImport(response.data.data);
  }
  catch(err){
    console.log(err);
    return [];
  }
}

export async function setRosterDay(dateString){
  const bodyParameters = {headers: {'Authorization':localEnv.ROSTER_TOKEN} };
  let date=new Date(dateString);
  let yesterday = new Date(date.getTime());
  yesterday.setDate(date.getDate() - 1);
  yesterday.setUTCHours(23, 0, 0, 0);
  let startDate=yesterday.toISOString();
  let tomorrow = new Date(date.getTime());
  tomorrow.setDate(date.getDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  let endDate=tomorrow.toISOString();
  try{//type=shift restricts response to only working days, not available or requested off
    let response=await axios.get('https://fyccqqeiahhzheubvavn.supabase.co/functions/v1/tenant-api-handler?table=calendar_events&start_plain_date_time='+startDate+'&end_plain_date_time='+endDate+'&type=shift', bodyParameters);
    //todaysRoster=response.data.data;
    return filterRosterImport(response.data.data);
  }
  catch(err){
    console.log(err);
    return [];
  }
}
