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
import config from '../../config/environment';
import * as rosterDataStore from '../rosterDataStore';
const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firebase_db = admin.firestore();
const STAFF_JOB_CATEGORIES = [
  'csa-dispatch',
  'ground-cargo',
  'maintenance',
  'cleaner',
  'office-admin',
  'helicopter',
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

function rosterRoleIndex(role) {
  return (config.userRoles || []).indexOf(role || 'guest');
}

function isRosterSuperAdmin(user) {
  return !!(user && user.role === 'superadmin');
}

function isRosterUser(user) {
  return rosterRoleIndex(user && user.role) >= rosterRoleIndex('user');
}

function rosterForbidden(res, message) {
  return res.status(403).json({ message: message || 'Forbidden' });
}

function assertRosterSuperAdmin(req, res) {
  if (!isRosterSuperAdmin(req.user)) {
    rosterForbidden(res, 'Superadmin required');
    return false;
  }
  return true;
}

async function getRosterMonthMeta(monthKey) {
  return rosterDataStore.getMonthMeta(monthKey);
}

async function assertRosterMonthWritable(req, res, dateString) {
  if (isRosterSuperAdmin(req.user)) return true;
  const monthKey = rosterMonthDocId(dateString);
  const meta = await getRosterMonthMeta(monthKey);
  if (meta.locked) {
    rosterForbidden(res, 'This month is locked');
    return false;
  }
  return true;
}

function assertOwnPersonOrSuperAdmin(req, res, personName) {
  if (isRosterSuperAdmin(req.user)) return true;
  const userName = req.user && req.user.name ? String(req.user.name).trim() : '';
  if (!userName || !personNamesMatch(userName, personName)) {
    rosterForbidden(res, 'You can only change your own calendar');
    return false;
  }
  return true;
}

function rosterIdBelongsToUser(rosterId, user, pilots, employees) {
  if (!rosterId || !user || !user.name) return false;
  if (String(rosterId).indexOf('pilot:') === 0) {
    const pilotId = String(rosterId).slice(6);
    const pilot = (pilots || []).find(item => item._id === pilotId);
    if (!pilot) return false;
    return personNamesMatch(pilotFullName(pilot), user.name);
  }
  if (String(rosterId).indexOf('employee:') === 0) {
    const employeeId = String(rosterId).slice(9);
    const employee = (employees || []).find(item => item._id === employeeId);
    if (!employee) return false;
    const displayName = employee.displayName || pilotFullName(employee);
    return personNamesMatch(displayName, user.name);
  }
  return false;
}

function rosterMonthDocId(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function personKeyFromName(name) {
  return normalizePersonName(name).replace(/\s+/g, '-');
}

const ROSTER_BASES = ['OME', 'OTZ', 'UNK', 'HELI'];

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

function filterEventsForPerson(events, personName, base, pilots) {
  return filterRosterImport(events || []).filter(record => {
    if (!personRecordMatchesName(record.employee_full_name, personName, pilots)) return false;
    if (base) return recordMatchesBaseFilter(record, base);
    return true;
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
  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'O', 'B'];
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

function isAcrorosterWorkCalendarRequest(request) {
  if (!request || String(request.source || '').toLowerCase() !== 'acroroster') return false;
  const label = String(request.label || '').trim().toUpperCase();
  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'O', 'B'];
  if (offCodes.indexOf(label) > -1) return false;
  return request.requestType === 'work' ||
    request.type === 'work_request' ||
    label === '8' ||
    label === 'C8';
}

async function upsertImportedPersonRequests(dateString, personName, base, importedRequests) {
  return rosterDataStore.upsertImportedPersonRequests(
    dateString,
    personName,
    base,
    importedRequests
  );
}

async function importAcrorosterRequestsForBases(events, dateString, bases, pilots) {
  const byPersonBase = {};
  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'O', 'B'];
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
    if (requestType === 'work') return;

    const key = `${eventBase}::${normalizePersonName(personName)}`;
    if (!byPersonBase[key]) {
      byPersonBase[key] = {
        personName: canonicalPersonName(personName, pilots, []),
        base: eventBase,
        requests: []
      };
    }
    spreadAcrorosterEvents([record]).forEach(dayRecord => {
      const day = new Date(dayRecord.start_plain_date_time).getUTCDate();
      const label = String(dayRecord.label || (requestType === 'time_off' ? 'V' : '8')).trim().toUpperCase();
      if (requestType === 'work') {
        const existing = byPersonBase[key].requests.find(item => item.day === day);
        if (existing && existing.requestType === 'time_off') return;
      }
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
    const byDay = {};
    entry.requests.forEach(request => {
      const existing = byDay[request.day];
      if (!existing) {
        byDay[request.day] = request;
        return;
      }
      if (request.requestType === 'time_off') byDay[request.day] = request;
      else if (existing.requestType !== 'time_off') byDay[request.day] = request;
    });
    entry.requests = Object.keys(byDay).map(dayKey => byDay[dayKey]);
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

async function loadLocalPersonCalendarEvents(dateString, personName, pilots, employees, rosterId, bases, options) {
  const opts=options || {};
  const monthLocked=!!opts.monthLocked;
  const events = [];
  const basesToLoad = bases && bases.length ? bases : ROSTER_BASES;
  const pilot = findPilotByName(personName, pilots);
  const employee = findEmployeeByName(personName, employees);
  let resolvedRosterId = rosterId || null;
  if (!resolvedRosterId) {
    if (pilot && pilot._id) resolvedRosterId = `pilot:${pilot._id}`;
    else if (employee && employee._id) resolvedRosterId = `employee:${employee._id}`;
  }
  const canonicalName = pilot
    ? pilotFullName(pilot)
    : (employee ? (employee.displayName || pilotFullName(employee)) : personName);
  const calendarNames = [];
  if (canonicalName) calendarNames.push(canonicalName);
  if (personName && calendarNames.indexOf(personName) < 0) calendarNames.push(personName);

  const offCodes = ['V', 'RA', 'RV', 'RO', 'RP', 'O', 'B'];
  const workPlaceholders = ['8', 'C8'];

  function inferRequestTypeFromRecord(request) {
    if (!request) return null;
    const label = String(request.label || '').trim().toUpperCase();
    if (offCodes.indexOf(label) > -1) return 'time_off';
    if (workPlaceholders.indexOf(label) > -1) return 'work';
    if (request.requestType === 'time_off' || request.type === 'time_off_request') return 'time_off';
    if (request.requestType === 'work' || request.type === 'work_request') return 'work';
    return null;
  }

  const calendarRequestsByDay = {};
  const seenCalKeys = {};
  const monthKey = rosterMonthDocId(dateString);
  const requestRows = await rosterDataStore.loadPersonCalendarRequestRows(
    monthKey,
    basesToLoad,
    calendarNames
  );
  requestRows.forEach(row => {
    const request = {
      day: row.day,
      requestType: row.requestType,
      label: row.label,
      type: row.type,
      status: row.status,
      source: row.source,
      updatedAt: row.updatedAt,
      requestedBy: row.requestedBy,
      reviewedBy: row.reviewedBy
    };
    const status = String(request.status || 'pending').toLowerCase();
    if (monthLocked && status !== 'approved') return;
    const key = `${row.base}:${request.day}:${request.requestType}:${request.label}`;
    if (seenCalKeys[key]) return;
    seenCalKeys[key] = true;
    const dayKey = String(request.day);
    if (!calendarRequestsByDay[dayKey] || status === 'approved') {
      calendarRequestsByDay[dayKey] = request;
    }
    events.push(Object.assign({}, request, {
      source: request.source || 'local',
      status,
      base: row.base
    }));
  });

  if (resolvedRosterId) {
    for (const loadBase of basesToLoad) {
      const personDays = await rosterDataStore.getPersonScheduleDays(
        loadBase,
        dateString,
        resolvedRosterId
      );
      Object.keys(personDays).forEach(dayKey => {
        if (!personDays[dayKey]) return;
        const label = String(personDays[dayKey]).trim().toUpperCase();
        const dayRequest = calendarRequestsByDay[dayKey] || null;
        if (monthLocked) {
          if (dayRequest) {
            const reqStatus = String(dayRequest.status || 'pending').toLowerCase();
            if (reqStatus !== 'approved') return;
          }
        } else if (dayRequest) {
          const reqStatus = String(dayRequest.status || 'pending').toLowerCase();
          const reqType = inferRequestTypeFromRecord(dayRequest);
          if (reqStatus === 'pending') {
            if (reqType === 'time_off') return;
            if (reqType === 'work' && workPlaceholders.indexOf(label) > -1) return;
          }
          if (reqStatus === 'denied') return;
        }
        events.push({
          day: parseInt(dayKey, 10),
          label: personDays[dayKey],
          type: 'shift',
          source: 'schedule',
          base: loadBase
        });
      });
    }
  }

  return events;
}

const ACRO_NAME_ALIASES = {
  'sophia hobbs': 'sophia evans'
};

const ROSTER_NAME_ALIASES = {
  'donald showalter': 'keith showalter',
  'donald keith showalter': 'keith showalter',
  'timothy kunkel': 'tim kunkel',
  'michael k evans': 'mike k evans',
  'michael k. evans': 'mikey evans',
  'michael r evans': 'mike r evans',
  'michael r. evans': 'mike r evans',
  'jacob larson': 'jake larson',
  'nik la croix': 'nikolas lacroix',
  'conor  murray': 'conor murray',
  'josh bryant': 'joshua bryant'
};

function normalizeRosterLookupName(name) {
  let key = normalizePersonName(name);
  key = key.replace(/\(/g, ' ').replace(/\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (ROSTER_NAME_ALIASES[key]) return ROSTER_NAME_ALIASES[key];
  return key;
}

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

function parsePersonNameParts(name) {
  let raw = String(name || '').trim();
  let middleFromParen = '';
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch) {
    middleFromParen = parenMatch[1].trim();
    raw = raw.replace(/\([^)]+\)/g, ' ').trim();
  }
  const tokens = raw.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  if (!tokens.length) return { first: '', middle: '', last: '' };
  if (tokens.length === 1) return { first: tokens[0], middle: middleFromParen, last: tokens[0] };
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  let middle = middleFromParen;
  if (!middle && tokens.length > 2) middle = tokens.slice(1, -1).join(' ');
  return { first, middle, last };
}

function middleNameKey(middle) {
  if (!middle) return '';
  return String(middle).replace(/\./g, '').trim().toLowerCase().charAt(0);
}

function personNamesMatch(a, b) {
  const na = normalizeRosterLookupName(a);
  const nb = normalizeRosterLookupName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const pa = parsePersonNameParts(na);
  const pb = parsePersonNameParts(nb);
  if (pa.last !== pb.last) return false;
  const firstA = pa.first.toLowerCase();
  const firstB = pb.first.toLowerCase();
  if (firstA !== firstB && firstA.charAt(0) !== firstB.charAt(0)) return false;
  const midA = middleNameKey(pa.middle);
  const midB = middleNameKey(pb.middle);
  if (midA && midB && midA !== midB) return false;
  return true;
}

function findPilotByName(personName, pilots) {
  if (!personName) return null;
  const matches = (pilots || []).filter(pilot => personNamesMatch(pilotFullName(pilot), personName));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const exact = matches.find(pilot => {
      return normalizeRosterLookupName(pilotFullName(pilot)) === normalizeRosterLookupName(personName);
    });
    return exact || null;
  }
  return null;
}

function findEmployeeByName(personName, employees) {
  if (!personName) return null;
  return (employees || []).find(employee => {
    const displayName = employee.displayName || pilotFullName(employee);
    return personNamesMatch(displayName, personName);
  }) || null;
}

function personRecordMatchesName(recordName, personName, pilots) {
  if (personNamesMatch(recordName, personName)) return true;
  const pilot = findPilotByName(personName, pilots);
  if (!pilot) return false;
  return personNamesMatch(recordName, pilotFullName(pilot));
}

function canonicalPersonName(personName, pilots, employees) {
  const pilot = findPilotByName(personName, pilots);
  if (pilot) return pilotFullName(pilot);
  const employee = findEmployeeByName(personName, employees);
  if (employee) return employee.displayName || pilotFullName(employee);
  return personName;
}

function buildPilotNameLookup(pilots) {
  const lookup = {};
  (pilots || []).forEach(pilot => {
    const fullName = pilotFullName(pilot);
    if (!fullName) return;
    lookup[fullName] = pilot;
    lookup[normalizeRosterLookupName(fullName)] = pilot;
    if (pilot.firstName && pilot.lastName) {
      lookup[`${pilot.firstName[0]}. ${pilot.lastName}`] = pilot;
      lookup[normalizeRosterLookupName(`${pilot.firstName[0]}. ${pilot.lastName}`)] = pilot;
      lookup[`Mike ${pilot.lastName}`] = pilot;
      lookup[`Mikey ${pilot.lastName}`] = pilot;
      lookup[normalizeRosterLookupName(`Mike ${pilot.lastName}`)] = pilot;
      lookup[normalizeRosterLookupName(`Mikey ${pilot.lastName}`)] = pilot;
    }
    if (fullName === 'Sophia Evans') lookup['Sophia Hobbs'] = pilot;
  });
  return lookup;
}

function findPilotByRecordName(recordName, pilots) {
  if (!recordName) return null;
  const lookup = buildPilotNameLookup(pilots);
  if (lookup[recordName]) return lookup[recordName];
  const normalized = normalizeRosterLookupName(recordName);
  if (lookup[normalized]) return lookup[normalized];
  if (lookup[recordName]) return lookup[recordName];
  return findPilotByName(recordName, pilots);
}

function locationToBase(locationName) {
  if (!locationName) return null;
  const location = String(locationName).split(' ')[0].toUpperCase();
  if (location === 'NOME') return 'OME';
  if (location === 'KOTZEBUE' || location === 'KOTZ') return 'OTZ';
  if (location === 'UNALAKLEET' || location === 'UNK') return 'UNK';
  if (location === 'HELICOPTER' || location === 'HELI') return 'HELI';
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
  if (/helicopter|\bheli\b/.test(hay)) {
    return 'helicopter';
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
  const mappedBase = locationToBase(record.location_name || record.base || record.location);
  if (!mappedBase || mappedBase !== base) return null;
  return {
    firstName: firstName || parsed.firstName,
    lastName: lastName || parsed.lastName,
    displayName: displayName || `${parsed.firstName} ${parsed.lastName}`.trim(),
    base: mappedBase,
    employeeNumber: String(record.employee_number || record.employeeNumber || record.emp_number || '').trim(),
    qualifications: qualificationText,
    jobCategory,
    isActive: record.is_active !== false && record.isActive !== false,
    importedFrom: 'acroroster',
    acrorosterEmployeeId: record.id || record._id || record.employee_id || ''
  };
}

function pickCanonicalEmployeeBase(baseCounts) {
  const bases = Object.keys(baseCounts || {});
  if (!bases.length) return null;
  bases.sort((a, b) => {
    const diff = (baseCounts[b] || 0) - (baseCounts[a] || 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
  return bases[0];
}

function normalizeInferOptions(baseOrOptions) {
  if (typeof baseOrOptions === 'string') {
    return { bases: [baseOrOptions], onlyBases: [baseOrOptions] };
  }
  const options = baseOrOptions || {};
  return {
    bases: options.bases || null,
    onlyBases: options.onlyBases || null
  };
}

function inferEmployeesFromAcrorosterEvents(events, pilots, baseOrOptions) {
  const options = normalizeInferOptions(baseOrOptions);
  const basesFilter = options.bases;
  const onlyBases = options.onlyBases;
  const pilotNames = buildPilotNameSet(pilots);
  const byName = {};

  (events || []).forEach(record => {
    if (isBlockedRosterEmployee(record)) return;
    const fullName = String(record.employee_full_name || '').trim();
    if (!fullName) return;
    if (pilotNames.has(normalizePersonName(fullName))) return;
    if (isPilotLocation(record.location_name)) return;

    const recordBase = locationToBase(record.location_name);
    if (!recordBase) return;
    if (basesFilter && basesFilter.indexOf(recordBase) < 0) return;

    const key = normalizePersonName(fullName);
    if (!byName[key]) {
      const parsed = parseFullName(fullName);
      byName[key] = {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: fullName,
        baseCounts: {},
        qualificationParts: new Set(),
        employeeNumber: '',
        acrorosterEmployeeId: ''
      };
    }
    const entry = byName[key];
    entry.baseCounts[recordBase] = (entry.baseCounts[recordBase] || 0) + 1;
    entry.qualificationParts.add(record.location_name);
    if (record.label) entry.qualificationParts.add(record.label);
    const empNum = record.employee_number || record.employeeNumber;
    if (empNum && !entry.employeeNumber) entry.employeeNumber = String(empNum);
    const acroId = record.employee_id || record.employee_uuid || record.employeeId;
    if (acroId && !entry.acrorosterEmployeeId) entry.acrorosterEmployeeId = String(acroId);
  });

  return Object.values(byName).map(entry => {
    const canonicalBase = pickCanonicalEmployeeBase(entry.baseCounts);
    if (!canonicalBase) return null;
    if (onlyBases && onlyBases.indexOf(canonicalBase) < 0) return null;
    const qualifications = Array.from(entry.qualificationParts).join(', ');
    return {
      firstName: entry.firstName,
      lastName: entry.lastName,
      displayName: entry.displayName,
      base: canonicalBase,
      employeeNumber: entry.employeeNumber,
      qualifications,
      jobCategory: inferJobCategory(qualifications),
      isActive: true,
      importedFrom: 'acroroster',
      acrorosterEmployeeId: entry.acrorosterEmployeeId,
      sourceEventCount: entry.baseCounts[canonicalBase] || 0
    };
  }).filter(Boolean);
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
  const employeeByName = {};
  (employees || []).forEach(employee => {
    const displayName = employee.displayName || pilotFullName(employee);
    if (displayName) employeeByName[normalizePersonName(displayName)] = employee;
  });
  spreadAcrorosterEvents(events).forEach(record => {
    if (isBlockedRosterEmployee(record)) return;
    if (record.type && record.type !== 'shift') return;
    const day = new Date(record.start_plain_date_time).getUTCDate();
    const pilot = findPilotByRecordName(record.employee_full_name, pilots);
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
  const pilots = req.body.pilots || [];
  if (!personName) return res.status(400).json({ message: 'personName is required' });
  try {
    if (source === 'local') {
      const events = await loadLocalPersonCalendarEvents(
        dateString,
        personName,
        pilots,
        req.body.employees || [],
        req.body.rosterId,
        normalizeRequestedBases(req.body),
        { monthLocked: req.body.monthLocked === true }
      );
      return res.status(200).json({ events });
    }
    const monthEvents = await setRosterMonth(dateString);
    const allBases = req.body.allBases === true;
    const personEvents = filterEventsForPerson(monthEvents, personName, allBases ? null : base, pilots);
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
  if (!base || !personName || !days.length) {
    return res.status(400).json({ message: 'base, personName, and day/days are required' });
  }
  const isModeration = action === 'approve' || action === 'deny';
  if (!isModeration && action !== 'delete' && !requestType) {
    return res.status(400).json({ message: 'requestType is required' });
  }
  const defaultLabel = requestType === 'time_off' ? 'V' : '8';
  const eventLabel = String(req.body.label || defaultLabel).trim().toUpperCase();
  const applyToSchedule = req.body.applyToSchedule !== false;
  const rosterId = req.body.rosterId || null;
  try {
    if (!(await assertRosterMonthWritable(req, res, dateString))) return;
    if (isModeration) {
      if (!assertRosterSuperAdmin(req, res)) return;
    } else if (!assertOwnPersonOrSuperAdmin(req, res, personName)) return;

    const mutation = await rosterDataStore.mutateCalendarRequests({
      base,
      dateString,
      personName,
      rosterId,
      days,
      action,
      requestType,
      eventLabel,
      isModeration,
      isSuperAdmin: isRosterSuperAdmin(req.user),
      requesterName: req.user.name || req.user.email,
      reviewerName: req.user.name || req.user.email,
      filterLabel: req.body.label
    });
    const requests = mutation.requests;
    let scheduleApplyLabel = mutation.scheduleApplyLabel;
    let scheduleApplyAction = mutation.scheduleApplyAction;

    let scheduleDays = null;
    const shouldApplySchedule = rosterId && (
      action === 'delete' ? applyToSchedule !== false
        : isModeration ? true
        : (isRosterSuperAdmin(req.user) && applyToSchedule)
    );
    if (shouldApplySchedule) {
      scheduleDays = await rosterDataStore.applyScheduleCells(
        base,
        dateString,
        rosterId,
        days,
        scheduleApplyLabel,
        scheduleApplyAction === 'delete' || action === 'deny' ? 'delete' : 'add'
      );
    }

    return res.status(200).json({ requests, days, scheduleDays, rosterId, action });
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
  try {
    const result = await rosterDataStore.loadScheduleLocal(base, dateString);
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load local roster schedule' });
  }
}

export async function rosterScheduleLocalBulk(req, res) {
  const dateString = req.body.date || new Date();
  const bases = normalizeRequestedBases(req.body);
  if (!bases.length) return res.status(400).json({ message: 'base or bases is required' });
  const monthKeys = Array.isArray(req.body.monthKeys) && req.body.monthKeys.length ?
    req.body.monthKeys.map(key => String(key).trim()) :
    null;
  try {
    const result = await rosterDataStore.loadScheduleBulk(dateString, bases, monthKeys);
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load local roster schedules' });
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
  try {
    if (!(await assertRosterMonthWritable(req, res, dateString))) return;
    if (!isRosterSuperAdmin(req.user)) {
      const pilots = req.body.pilots || [];
      const employees = req.body.employees || [];
      if (!rosterIdBelongsToUser(rosterId, req.user, pilots, employees)) {
        return rosterForbidden(res, 'You can only edit your own schedule row');
      }
    }
    const result = await rosterDataStore.saveScheduleCell(base, dateString, rosterId, day, code);
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save roster schedule cell' });
  }
}

export async function rosterCalendarMonthIndex(req, res) {
  const dateString = req.body.date || new Date();
  const bases = normalizeRequestedBases(req.body);
  const pilots = req.body.pilots || [];
  const employees = req.body.employees || [];
  const monthKey = rosterMonthDocId(dateString);
  const requestsByRosterId = {};
  try {
    const rows = await rosterDataStore.loadCalendarRequestRows(monthKey, bases);
    rows.forEach(row => {
      const personName = row.personName;
      let rosterId = row.rosterId || null;
      if (!rosterId) {
        const pilot = findPilotByName(personName, pilots);
        if (pilot && pilot._id) rosterId = `pilot:${pilot._id}`;
        else {
          const employee = findEmployeeByName(personName, employees);
          if (employee && employee._id) rosterId = `employee:${employee._id}`;
        }
      }
      if (!rosterId) return;
      const request = {
        day: row.day,
        requestType: row.requestType,
        label: row.label,
        type: row.type,
        status: row.status,
        source: row.source,
        updatedAt: row.updatedAt,
        requestedBy: row.requestedBy,
        reviewedBy: row.reviewedBy
      };
      if (isAcrorosterWorkCalendarRequest(request)) return;
      const dayKey = String(request.day);
      if (!requestsByRosterId[rosterId]) requestsByRosterId[rosterId] = {};
      if (!requestsByRosterId[rosterId][dayKey]) requestsByRosterId[rosterId][dayKey] = [];
      requestsByRosterId[rosterId][dayKey].push(request);
    });
    return res.status(200).json({ requestsByRosterId, monthKey });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load calendar request index' });
  }
}

export async function rosterStaffingMinimumsGet(req, res) {
  try {
    const minimums = await rosterDataStore.getStaffingMinimums();
    return res.status(200).json({ minimums: minimums || null });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load staffing minimums' });
  }
}

export async function rosterStaffingMinimumsSave(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
  const minimums = req.body.minimums;
  if (!minimums || typeof minimums !== 'object') {
    return res.status(400).json({ message: 'minimums object is required' });
  }
  try {
    await rosterDataStore.saveStaffingMinimums(
      minimums,
      req.user.name || req.user.email
    );
    return res.status(200).json({ saved: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save staffing minimums' });
  }
}

export async function rosterMonthMeta(req, res) {
  const dateString = req.body.date || new Date();
  const monthKey = rosterMonthDocId(dateString);
  try {
    const meta = await getRosterMonthMeta(monthKey);
    return res.status(200).json({
      monthKey,
      locked: !!meta.locked,
      lockedAt: meta.lockedAt || null,
      lockedBy: meta.lockedBy || null
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load roster month metadata' });
  }
}

export async function rosterMonthLock(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
  const dateString = req.body.date || new Date();
  const locked = req.body.locked === true;
  const monthKey = rosterMonthDocId(dateString);
  try {
    const result = await rosterDataStore.setMonthLock(
      monthKey,
      locked,
      req.user.name || req.user.email
    );
    return res.status(200).json({ monthKey: result.monthKey, locked: result.locked });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to update month lock' });
  }
}

export async function rosterEmployees(req, res) {
  const bases = normalizeRequestedBases(req.body);
  if (!bases.length) return res.status(400).json({ message: 'base or bases is required' });
  try {
    const employees = await rosterDataStore.loadEmployees(bases);
    return res.status(200).json(employees);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to load employees' });
  }
}

export async function rosterEmployeeSave(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
  const base = req.body.base;
  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();
  if (!base) return res.status(400).json({ message: 'base is required' });
  if (!firstName || !lastName) return res.status(400).json({ message: 'firstName and lastName are required' });
  const payload = {
    _id: req.body._id,
    base,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    employeeNumber: (req.body.employeeNumber || '').trim(),
    qualifications: (req.body.qualifications || '').trim(),
    jobCategory: normalizeJobCategory(req.body.jobCategory),
    isActive: req.body.isActive !== false
  };
  try {
    const saved = await rosterDataStore.saveEmployeeRecord(payload);
    return res.status(200).json(saved);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to save employee' });
  }
}

export async function rosterEmployeeDelete(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
  const docId = req.body._id;
  if (!docId) return res.status(400).json({ message: '_id is required' });
  try {
    await rosterDataStore.deleteEmployeeRecord(docId);
    return res.status(200).json({ deleted: true, _id: docId });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to delete employee' });
  }
}

export async function rosterEmployeesImportFromAcroroster(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
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

    const inferredAll = inferEmployeesFromAcrorosterEvents(range.events, pilots, { bases });

    for (const base of bases) {
      const directEmployees = employeeTable
        .map(record => mapAcrorosterEmployeeRecord(record, base))
        .filter(record => record && record.base === base);
      const inferredEmployees = inferredAll.filter(employee => employee.base === base);
      const candidates = mergeInferredEmployees(directEmployees, inferredEmployees);
      const baseResult = { base, created: 0, updated: 0, count: candidates.length };

      for (const employee of candidates) {
        const saved = await rosterDataStore.upsertImportedEmployee(employee, { silent: true });
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

    await rosterDataStore.importEmployeesBulk(bases);

    return res.status(200).json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Failed to import employees from AcroRoster' });
  }
}

export async function rosterScheduleLocalImport(req, res) {
  if (!assertRosterSuperAdmin(req, res)) return;
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
    const inferredAll = inferEmployeesFromAcrorosterEvents(events, pilots, { bases });
    const savedEmployeesByName = {};

    for (const employee of inferredAll) {
      const saved = await rosterDataStore.upsertImportedEmployee(employee, { silent: true });
      savedEmployeesByName[normalizePersonName(employee.displayName)] = Object.assign({}, employee, { _id: saved._id });
      if (saved.created) employeesCreated++;
      else employeesUpdated++;
    }

    await rosterDataStore.importEmployeesBulk(bases);

    for (const base of bases) {
      const baseEvents = events.filter(record => locationToBase(record.location_name) === base);
      const employeeDocs = inferredAll
        .filter(employee => employee.base === base)
        .map(employee => savedEmployeesByName[normalizePersonName(employee.displayName)])
        .filter(Boolean);
      const days = acrorosterEventsToScheduleDays(baseEvents, pilots, employeeDocs);
      Object.keys(days).forEach(rosterId => {
        if (!mergedDays[rosterId]) mergedDays[rosterId] = {};
        Object.assign(mergedDays[rosterId], days[rosterId]);
      });
      const importResult = await rosterDataStore.importScheduleDays(base, dateString, days);
      baseResults.push({
        base,
        docId: importResult.docId,
        empty: !Object.keys(days).length,
        dayKeys: Object.keys(days).length,
        scheduleRows: importResult.rowCount
      });
    }

    const requestImport = await importAcrorosterRequestsForBases(events, dateString, bases, pilots);
    await rosterDataStore.importCalendarRequestsBulk(dateString, bases);

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
