'use strict';

/**
 * ROT-compatible Firebase proxy — same query behavior as ~/ROT/server/api/thing/thing.controller.js
 * Used by ROT screens in fraBering (sicHours, records, main) so we do not route through
 * the heavier /api/airplanes/firebaseQuery path.
 */

const admin = require('firebase-admin');
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
    // Pilots have no `date` field — OME/OTZ filter by pilotBase only (ROT used client runQuery).
    if (collectionName === 'flights' || collectionName === 'records') {
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

export async function updateFirebase(req, res) {
  try {
    let collection = req.body.collection;
    let localDoc = req.body.doc;
    let id;
    if (localDoc._id) id = localDoc._id.toString();
    delete localDoc._id;
    let data = await updateDocument(collection, id, localDoc);
    if (data) return res.status(200).json(data);
    return res.status(500).json({message: 'No response from firebase'});
  } catch (err) {
    console.error('rot updateFirebase error', err);
    return res.status(500).json({message: 'ROT firebase update failed'});
  }
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
    let limit = req.body.limit || 50;
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
