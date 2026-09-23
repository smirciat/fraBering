'use strict';

/**
 * ROT-compatible Firebase proxy — same query behavior as ~/ROT/server/api/thing/thing.controller.js
 * Used by ROT screens in fraBering (sicHours, records, main) so we do not route through
 * the heavier /api/airplanes/firebaseQuery path.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firebase_db = admin.firestore();

async function getCollection(collectionName) {
  const collectionRef = firebase_db.collection(collectionName);
  return collectionRef.get();
}

/** ROT thing.controller getCollectionQuery — unchanged semantics. */
async function rotGetCollectionQuery(collectionName, limit, parameter, operator, value, timestampBoolean, parameter2, operator2, value2, queryOr) {
  if (timestampBoolean) {
    value = admin.firestore.Timestamp.fromDate(new Date(value));
    if (value2) value2 = admin.firestore.Timestamp.fromDate(new Date(value2));
  }
  const collectionRef = firebase_db.collection(collectionName);
  let querySnapshot;
  let querySnapshot1;
  if (!value2) {
    let query = collectionRef.where(parameter, operator, value);
    // Pilots have no `date` field — OME/OTZ filter by pilotBase only.
    // Per-pilot records: skip orderBy so docs missing `date` still return (sort client-side).
    let useOrderBy = collectionName === 'flights' ||
      (collectionName === 'records' && parameter !== 'pilotNumber');
    if (useOrderBy) {
      query = query.orderBy('date', 'desc');
    }
    querySnapshot = await query.limit(limit).get();
  } else if (queryOr) {
    querySnapshot = await collectionRef.where(parameter, operator, value).limit(limit).get();
    querySnapshot1 = await collectionRef.where(parameter2, operator2, value2).limit(limit).get();
  } else {
    querySnapshot = await collectionRef.where(parameter, operator, value).where(parameter2, operator2, value2).limit(limit).get();
  }
  let mergedData = [];
  querySnapshot.forEach(doc => { mergedData.push(doc); });
  if (querySnapshot1) querySnapshot1.forEach(doc => { mergedData.push(doc); });
  return mergedData;
}

function collectionToArray(result) {
  let array = [];
  if (!result) return array;
  result.forEach(doc => {
    let obj = doc.data();
    obj._id = doc.id;
    array.push(obj);
  });
  return array;
}

function slimFlightForSicHours(f) {
  return {
    _id: f._id,
    dateString: f.dateString,
    acftType: f.acftType,
    acftNumber: f.acftNumber,
    flightNumber: f.flightNumber,
    route: f.route,
    pilot: f.pilot,
    coPilot: f.coPilot,
    flightTime: f.flightTime,
    legArray: (f.legArray || []).map(leg => ({
      sicDayLandings: leg.sicDayLandings,
      sicNightLandings: leg.sicNightLandings,
      sicDayTO: leg.sicDayTO,
      sicNightTO: leg.sicNightTO,
      picDayLandings: leg.picDayLandings,
      picNightLandings: leg.picNightLandings,
      picDayTO: leg.picDayTO,
      picNightTO: leg.picNightTO
    }))
  };
}

function dedupeFlights(flights) {
  let seen = {};
  let out = [];
  flights.forEach(f => {
    let id = f._id;
    if (!id || seen[id]) return;
    seen[id] = true;
    out.push(f);
  });
  return out;
}

export async function firebase(req, res) {
  try {
    let collection = req.body.collection;
    const result = await getCollection(collection);
    let array = collectionToArray(result);
    return res.status(200).json(array);
  } catch (err) {
    console.error('rot firebase error', err);
    return res.status(500).json({message: 'ROT firebase read failed'});
  }
}

async function updateDocument(collection, docId, data) {
  if (!docId) docId = Date.now().toString();
  const docRef = firebase_db.collection(collection).doc(docId);
  try {
    await docRef.set(data, {merge: true});
    const docSnap = await docRef.get();
    let out = docSnap.data();
    out._id = docId;
    return out;
  } catch (error) {
    console.error('rot updateDocument error', error);
    return false;
  }
}

/**
 * Fields FRA may write on pilots. Anything else (courierCurrency, apprCurrency,
 * holdCurrency, and the rest of the flight-log profile) is left untouched.
 * Training-dates and assignment saves used to merge the whole loaded document.
 */
const PILOT_PROFILE_FIELDS = [
  'name', 'legalName', 'pilotBase', 'dateOfHire', 'dateOfBirth',
  'cert', 'certType', 'medicalClass', 'medicalDate', 'medicalInterval',
  'oas', 'passport', 'rus',
  'atp', 'commercial', 'cfi', 'other', 'otherDescription', 'ratings',
  'quals', 'removals',
  'highMinimumsC208', 'highMinimumsC408', 'highMinimumsC212', 'highMinimumsB190', 'highMinimumsBE20',
  'rotArchived', 'isActive',
  'trainingExpHistory',
  'far293a148'
];

const PILOT_EXP_KEYS = [
  'BasicIndoc', 'Hazmat', 'far299', 'far293a', 'far297', 'far297g',
  'C208PIC', 'C208TKS', 'C208Ground', 'C208GOS',
  'B190PIC', 'B190SIC', 'B190Ground', 'B190GOS',
  'BE20PIC', 'BE20Ground', 'BE20GOS',
  'C408PIC', 'C408SIC', 'C408Ground', 'C408GOS',
  'C212PIC', 'C212SIC', 'C212Ground', 'C212GOS',
  'CheckAirmanObs', 'FlightInstructorObs'
];

function pilotWriteAllowlist() {
  const allowed = new Set(PILOT_PROFILE_FIELDS);
  PILOT_EXP_KEYS.forEach(key => {
    allowed.add(key === 'far293a' ? 'far293a148' : key + 'Exp');
  });
  return allowed;
}

/** Training exp stays first-of-month MM/01/YYYY. M/YY and other slash shapes crash Flight Report. */
function storedExpDate(value) {
  if (typeof value !== 'string') return value;
  const parts = value.trim().split('/');
  if (parts.length !== 2 && parts.length !== 3) return value;
  const month = parseInt(parts[0], 10);
  const yearPart = parts.length === 2 ? parts[1] : parts[2];
  let year = parseInt(yearPart, 10);
  if (!month || month < 1 || month > 12 || isNaN(year)) return value;
  if (String(yearPart).length !== 2 && String(yearPart).length !== 4) return value;
  if (year < 100) year += 2000;
  const mm = month < 10 ? '0' + month : String(month);
  return mm + '/01/' + year;
}

/** Full calendar dates. A 2-part string would replace MM/DD/YYYY with month/year. */
const PILOT_CALENDAR_FIELDS = [
  'dateOfHire', 'dateOfBirth', 'medicalDate', 'oas', 'passport', 'rus'
];

function isMonthYearOnly(value) {
  if (typeof value !== 'string') return false;
  return value.trim().split('/').length === 2;
}

function dropCalendarMonthYear(doc, docId) {
  PILOT_CALENDAR_FIELDS.forEach(key => {
    if (!isMonthYearOnly(doc[key])) return;
    console.warn('rot pilots write refused M/YY on calendar field', docId, key, doc[key]);
    delete doc[key];
  });
}

function isExpFieldKey(key) {
  return key === 'far293a148' || /Exp$/.test(key);
}

function normalizePilotExpFields(doc) {
  Object.keys(doc).forEach(key => {
    if (isExpFieldKey(key)) {
      doc[key] = storedExpDate(doc[key]);
      return;
    }
    if (key !== 'trainingExpHistory' || !doc[key] || typeof doc[key] !== 'object') return;
    Object.keys(doc[key]).forEach(expKey => {
      const rows = doc[key][expKey];
      if (!Array.isArray(rows)) return;
      rows.forEach(row => {
        if (row && typeof row.exp === 'string') row.exp = storedExpDate(row.exp);
      });
    });
  });
}

function pickPilotWriteFields(doc, docId) {
  const allowed = pilotWriteAllowlist();
  const out = {};
  const dropped = [];
  Object.keys(doc || {}).forEach(key => {
    if (doc[key] === undefined) return;
    if (!allowed.has(key)) {
      dropped.push(key);
      return;
    }
    out[key] = doc[key];
  });
  normalizePilotExpFields(out);
  dropCalendarMonthYear(out, docId);
  if (dropped.length) {
    console.warn('rot pilots write dropped non-FRA fields', docId, dropped.join(','));
  }
  return out;
}

export async function updateFirebase(req, res) {
  try {
    let collection = req.body.collection;
    let localDoc = req.body.doc;
    let id;
    if (localDoc._id) id = localDoc._id.toString();
    delete localDoc._id;
    if (collection === 'pilots') localDoc = pickPilotWriteFields(localDoc, id);
    let data = await updateDocument(collection, id, localDoc);
    if (data) return res.status(200).json(data);
    return res.status(500).json({message: 'No response from firebase'});
  } catch (err) {
    console.error('rot updateFirebase error', err);
    return res.status(500).json({message: 'ROT firebase update failed'});
  }
}

/** Slim rows for the records pending / missing-file view. Cap so a full scan stays bounded. */
export async function listRecordSummaries(limit) {
  const cap = limit || 8000;
  const snap = await firebase_db.collection('records').limit(cap).get();
  const rows = [];
  snap.forEach(doc => {
    const row = doc.data() || {};
    rows.push({
      _id: doc.id,
      pilotNumber: row.pilotNumber || '',
      name: row.name || '',
      date: row.date || '',
      trainingType: row.trainingType || '',
      trainingTypeArray: Array.isArray(row.trainingTypeArray) ? row.trainingTypeArray : [],
      approved: row.approved === true
    });
  });
  return {rows: rows, truncated: snap.size >= cap};
}

export async function deleteFirebase(req, res) {
  const collection = 'records';
  const docId = req.body.id;
  if (!docId) return res.status(500).json({message: 'No ID in this call'});
  try {
    const docRef = firebase_db.collection(collection).doc(docId);
    await docRef.delete();
    return res.status(200).json('Document Deleted');
  } catch (err) {
    console.error('rot deleteFirebase error', err);
    return res.status(500).json({message: 'Error trying to delete from Firestore'});
  }
}

export async function firebaseQuery(req, res) {
  try {
    let collection = req.body.collection || 'pilots';
    let limit = req.body.limit || (req.body.collection === 'records' ? 5000 : 50);
    let parameter = req.body.parameter || 'pilotEmployeeNumber';
    let operator = req.body.operator || '==';
    let value = req.body.value || '933';
    let timestampBoolean = req.body.timestampBoolean || false;
    let queryOr = req.body.queryOr || false;
    let operator2 = req.body.operator2;
    if (!operator2 && req.body.parameter2) operator2 = '==';
    const result = await rotGetCollectionQuery(
      collection, limit, parameter, operator, value, timestampBoolean,
      req.body.parameter2, operator2, req.body.value2, queryOr
    );
    let array = collectionToArray(result);
    if (collection === 'flights' && queryOr) {
      array = dedupeFlights(array).map(slimFlightForSicHours);
    }
    return res.status(200).json(array);
  } catch (err) {
    console.error('rot firebaseQuery error', err);
    return res.status(500).json({message: 'ROT firebase query failed'});
  }
}
