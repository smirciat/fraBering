'use strict';

/**
 * Shared Firestore query helper for FDR (server-side flight aggregation).
 * Mirrors rot.firebase.controller rotGetCollectionQuery without HTTP.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export async function rotGetCollectionQuery(collectionName, limit, parameter, operator, value, timestampBoolean, parameter2, operator2, value2, queryOr) {
  if (timestampBoolean) {
    value = admin.firestore.Timestamp.fromDate(new Date(value));
    if (value2) value2 = admin.firestore.Timestamp.fromDate(new Date(value2));
  }
  const collectionRef = admin.firestore().collection(collectionName);
  let querySnapshot;
  let querySnapshot1;
  if (!value2) {
    let query = collectionRef.where(parameter, operator, value);
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

export async function loadFirebasePilots() {
  let snap = await admin.firestore().collection('pilots').get();
  let list = [];
  snap.forEach(doc => {
    let p = doc.data();
    p._id = doc.id;
    list.push(p);
  });
  return list;
}

/** One query (paginated) for all flights in a calendar year — used by FDR hours rollup. */
export async function fetchFlightsForCalendarYear(year) {
  const db = admin.firestore();
  const col = db.collection('flights');
  const start = admin.firestore.Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0));
  const end = admin.firestore.Timestamp.fromDate(new Date(year + 1, 0, 1, 0, 0, 0));
  let all = [];
  let lastDoc = null;
  for (let page = 0; page < 10; page++) {
    let q = col.where('date', '>=', start).where('date', '<', end).orderBy('date').limit(8000);
    if (lastDoc) q = q.startAfter(lastDoc);
    let snap = await q.get();
    if (snap.empty) break;
    snap.forEach(doc => {
      let f = doc.data();
      f._id = doc.id;
      all.push(f);
    });
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 8000) break;
  }
  return all;
}
