/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/airplanes              ->  index
 * POST    /api/airplanes              ->  create
 * GET     /api/airplanes/:id          ->  show
 * PUT     /api/airplanes/:id          ->  update
 * DELETE  /api/airplanes/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Airplane} from '../../sqldb';
import {releaseFieldSet} from '../todaysFlight/releaseMerge.js';
let io;
const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
//initialize admin SDK using serciceAcountKey
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const firebase_db = admin.firestore();
let unsub,unsubPilots;
export let previousPfrs=[];
export let allFlights=[];
export let firebaseFlights=[];
export let firebasePilots=[];
export let firebaseAircraft=[];

export function setupSocket(socketio){
  io=socketio;
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

// Gets a list of Airplanes
export function index(req, res) {
  return Airplane.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Airplane from the DB
export function show(req, res) {
  return Airplane.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Airplane in the DB
export function create(req, res) {
  return Airplane.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Airplane in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Airplane.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Airplane from the DB
export function destroy(req, res) {
  return Airplane.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

function fSort(flights,dateString){
  if (dateString) flights=flights.filter(flight=>flight.dateString===dateString);
  return flights.sort((a,b)=>{
    if (a.dateString!==b.dateString) return new Date(b.dateString)-new Date(a.dateString);
    if (!a.legArray) return -1;
    if (!b.legArray) return 1;
    let aArr=JSON.parse(JSON.stringify(a.legArray));
    let bArr=JSON.parse(JSON.stringify(b.legArray));
    let aNow=aArr.pop();
    let bNow=bArr.pop();
    let aOnTime;
    let aOffTime;
    let bOnTime;
    let bOffTime;
    if (aNow) {
      aOnTime=aNow.onTime;
      if (aOnTime) aOnTime=aOnTime._seconds;
      aOffTime=aNow.offTime;
      if (aOffTime) aOffTime=aOffTime._seconds;
    }
    if (bNow) {
      bOnTime=bNow.onTime;
      if (bOnTime) bOnTime=bOnTime._seconds;
      bOffTime=bNow.offTime;
      if (bOffTime) bOffTime=bOffTime._seconds;
    }
    while (aNow&&!aOnTime){
      if (aOffTime) aOnTime=aOffTime;
      else {
        if (!aArr||aArr.length===0) {
          aNow=undefined;
          break;
        }
        aNow=aArr.pop();
        if (!aNow) break;
        aOnTime=aNow.onTime;
        aOffTime= aNow.offTime;
        if (aOnTime) aOnTime=aOnTime._seconds;
        if (aOffTime) aOffTime=aOffTime._seconds;
      }
    }
    while (bNow&&!bOnTime){
      if (bOffTime) bOnTime=bOffTime;
      else {
        if (!bArr||bArr.length===0) {
          bNow=undefined;
          break;
        }
        bNow=bArr.pop();
        if (!bNow) break;
        bOnTime=bNow.onTime;
        bOffTime= bNow.offTime;
        if (bOnTime) bOnTime=bOnTime._seconds;
        if (bOffTime) bOffTime=bOffTime._seconds;
      }
    }
    if (aOnTime&&bOnTime) return bOnTime-aOnTime;
    if (!aOnTime&&!bOnTime) return 0;
    if (!aOnTime) return -1;
    if (!bOnTime) return 1;
    return 0;
  });
}

async function getDocument(collectionName, documentId) {
  let data={};
  const docRef = firebase_db.collection(collectionName).doc(documentId);
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    data=doc.data();
    data._id=documentId;
    console.log('Document data:', doc.data());
  }
  return data;
}

export async function getCollectionQuery(collectionName,limit,parameter,operator,value,timestampBoolean,parameter2,operator2,value2,queryOr,minDateParameter,minDateOperator,minDateValue,minDateTimestamp) {
  try {
    for (let s of [collectionName,limit,parameter,operator,value,timestampBoolean]){
      console.log(s);
    }
    if (timestampBoolean) {
      value=admin.firestore.Timestamp.fromDate(new Date(value));
      if (value2) value2=admin.firestore.Timestamp.fromDate(new Date(value2));
    }
    let minDateFilter=null;
    if (minDateParameter && minDateValue) {
      minDateFilter=minDateTimestamp
        ? admin.firestore.Timestamp.fromDate(new Date(minDateValue))
        : minDateValue;
    }
    const collectionRef = firebase_db.collection(collectionName);
    let date1,date2,date3;
    let querySnapshot, querySnapshot1, querySnapshot2;
    if (collectionName==='releases') {
      querySnapshot = await collectionRef.where(parameter, operator , value).where(parameter2, operator2 , value2).limit(limit).get();
    }
    else {
      if (!value2) querySnapshot = await collectionRef.where(parameter, operator , value).orderBy('date', 'desc').limit(limit).get();
      else if (queryOr) {
        let q1 = collectionRef.where(parameter, operator , value);
        let q2 = collectionRef.where(parameter2, operator2 , value2);
        if (minDateFilter) {
          q1 = q1.where(minDateParameter, minDateOperator || '>=', minDateFilter);
          q2 = q2.where(minDateParameter, minDateOperator || '>=', minDateFilter);
        }
        [querySnapshot, querySnapshot1] = await Promise.all([
          q1.limit(limit).get(),
          q2.limit(limit).get()
        ]);
      }
      else querySnapshot = await collectionRef.where(parameter, operator , value).where(parameter2, operator2 , value2).orderBy('date', 'desc').limit(limit).get();
    }
    if (parameter==="false"){//"dateString")  {
      date3=new Date(value);
      date2=new Date(value);
      date1=new Date(value);
      date2.setDate(date2.getDate() - 1);
      date1.setDate(date1.getDate() - 2);
      date2=date2.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      date1=date1.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      querySnapshot1 = await collectionRef.where(parameter, operator , date1).orderBy('date', 'desc').limit(limit).get();
      querySnapshot2 = await collectionRef.where(parameter, operator , date2).orderBy('date', 'desc').limit(limit).get();
    }
    let mergedData=[];
    let seenDocIds={};
    function pushDoc(doc) {
      if (queryOr && seenDocIds[doc.id]) return;
      if (queryOr) seenDocIds[doc.id]=true;
      mergedData.push(doc);
    }
    if (querySnapshot1){
      querySnapshot1.forEach((doc1) => {
        pushDoc(doc1);
      });
    }
    if (querySnapshot2){
      querySnapshot2.forEach((doc2) => {
        pushDoc(doc2);
      });
    }
    querySnapshot.forEach((doc) => {
      pushDoc(doc);
    });
    return mergedData;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

function attachReleaseToFlightDoc(doc, releaseDocs) {
  const release = (releaseDocs || []).map(releaseDoc => (
    Object.assign({}, releaseDoc.data(), { _id: releaseDoc.id })
  ));
  return Object.assign({}, doc.data(), {
    _id: doc.id,
    firestoreId: doc.id,
    release: release
  });
}

export async function getCollectionDateWithSub(collectionName,limit,date) {
  try {
    const collectionRef = firebase_db.collection(collectionName);
    const querySnapshot = await collectionRef.where('dateString','==',formatDate(date)).limit(limit).get();

    const results = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const releaseSnapshot = await doc.ref.collection('release').get();
        return attachReleaseToFlightDoc(doc, releaseSnapshot.docs);
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

export async function getCollectionDate(collectionName,limit,date) {
  try {
    const collectionRef = firebase_db.collection(collectionName);
    const querySnapshot = await collectionRef.where('dateString','==',formatDate(date)).limit(limit).get();

    querySnapshot.forEach((doc) => {
      //console.log(doc.id, '=>', doc.data());
    });
    return querySnapshot;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

export async function getCollectionLimited(collectionName,limit) {
  try {
    const collectionRef = firebase_db.collection(collectionName);
    const querySnapshot = await collectionRef.orderBy('date', 'desc').limit(limit).get();

    querySnapshot.forEach((doc) => {
      //console.log(doc.id, '=>', doc.data());
    });
    return querySnapshot;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

async function getCollection(collectionName) {
  try {
    const collectionRef = firebase_db.collection(collectionName);
    const querySnapshot = await collectionRef.get();

    querySnapshot.forEach((doc) => {
      //console.log(doc.id, '=>', doc.data());
    });
    return querySnapshot;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

async function updateDocumentSub(collection,docId,data) {
   if (!docId) {
     console.error('updateDocumentSub missing docId');
     return false;
   }
   let docRef = firebase_db.collection(collection).doc(String(docId));
   try {
     await docRef.collection("release").doc("releaseStatus").set(data,{merge:true});
     return true;
   } catch (error) {
     console.error('Error updating release subcollection:', String(docId), error);
     return false;
   }
}

async function updateDocument(collection,docId,data) {
   let docRef;
   if (docId) {
     docRef = firebase_db.collection(collection).doc(docId);
     try {
       await docRef.set(data,{merge:true});
       console.log('Document successfully updated!');
       return data;
     } catch (error) {
       console.error('Error updating document:', error);
       return {resp:'failure'};
     }
   }
   else {
     docRef = firebase_db.collection(collection).doc();
     try {
       await docRef.set(data);
       console.log('Document successfully created!');
       return data;
     } catch (error) {
       console.error('Errorcreating document:', error);
       return {resp:'failure'};
     }
   }
}

export async function setPreviousPfrs(){
  previousPfrs=await firebaseLimited({body:{collection:'flights',limit:500}});
  previousPfrs=previousPfrs.filter(pfr=>{
    return pfr.dateString!==formatDate(new Date());
  });
  const querySnapshot = await firebase_db.collection('flights').where('dateString','==',formatDate()).get();
  firebaseFlights=collectionToArray(querySnapshot);
}

export function observePilots() {
  try {
    if (unsubPilots) unsubPilots();//clear any previous observer
    const fbQuery = firebase_db.collection('pilots');
    unsubPilots=fbQuery.onSnapshot(querySnapshot=>{
      firebasePilots=collectionToArray(querySnapshot);
    });
  }
  catch(err) {console.log(err)}
}

export function observe() {
  let dateString=formatDate();
  try {
    if (unsub) unsub();//clear any previous observer
    const fbQuery = firebase_db.collection('flights').where('dateString','==',dateString);
    unsub=fbQuery.onSnapshot(async querySnapshot=>{
      const results = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const releaseSnapshot = await doc.ref.collection('release').get();
          return attachReleaseToFlightDoc(doc, releaseSnapshot.docs);
        })
      );
      
      allFlights=results;
      firebaseFlights=fSort(allFlights,dateString);
      //emit socket message with updated firebaseFLights
      try {
        io.emit('firebaseFlights',allFlights);
      }
      catch(err) {
        console.log(err);
      }
      //update current location of an aircraft based on new completed pfr
      if (firebaseAircraft.length===0) return;
      for (let flight of firebaseFlights){
        let index = firebaseAircraft.map(e => e._id).indexOf(flight.acftNumber);
        if (index>-1) {
          if (flight.legArray&&flight.legArray.length&&flight.legArray[flight.legArray.length-1]&&firebaseAircraft[index].currentAirport!==flight.legArray[flight.legArray.length-1].arr) {
            if (!firebaseAircraft[index].recentlyUpdated) {
              firebaseAircraft[index].currentAirportRelease=flight.legArray[flight.legArray.length-1].arr;
              updateDocument('aircraft', firebaseAircraft[index]._id, {currentAirportRelease:firebaseAircraft[index].currentAirportRelease});
            }
          }
          firebaseAircraft[index].recentlyUpdated=true;
        }
      }
      console.log('***********************');
      console.log('Length of Array is:' + firebaseFlights.length);
    }, (error) => {
      console.log('Firebase Observer Error!!!!!!!!!!!!!!!!!!!!!!!');
      console.log(error);
      
      
    });
    
    return;
  } catch (error) {
    console.error('Error getting collection:', error);
  }
}

function collectionToArray(result){
  let array=[];
  result.forEach(doc=>{
    let obj=doc.data();
    obj._id=doc.id;
    array.push(obj);
  });
  return array;
}

export async function firebaseDoc(req,res){
  let collection=req.body.collection||'flights';
  let documentId=req.body._id||'759-051725-1';
  try {
    const result=await getDocument(collection,documentId);
    return res.status(200).json(result);
  } catch(err){
    console.log(err);
    return res.status(500).json(err);
  }
}

export async function firebase(req,res){
  let collection=req.body.collection;
  const result=await getCollection(collection);
  let array=collectionToArray(result);
  //console.log(array);
  return res.status(200).json(array);
}

export async function firebaseQueryFunction(collection,limit,parameter,operator,value,timestampBoolean){
  const result=await getCollectionQuery(collection,limit,parameter,operator,value,timestampBoolean);
  return collectionToArray(result);
}

function formatDate(date) {
  if (!date) date=new Date();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2); // Get last two digits of the year
  return `${mm}/${dd}/${yy}`;
}

export async function firebaseHeliRelease(req,res){
  console.log(req.body)
  if (!req.body.flight||!req.body.flight._id) return res.status(500).json('need flight!');
  const id=req.body.flight._id;
  delete req.body.flight._id;
  try {
    const response=await updateDocumentSub('flights', id, req.body.flight);
    if (response) return res.status(200).json('Updated Firebase Sub-Collection');
    else return res.status(500).json('Firebase Update Failed');
  }
  catch(err){
    console.log(err);
    return res.status(500).json('Firebase Update Failed');
  }
  
}

/** Mobile Ground Services — heli Fueled checkbox (release subcollection). */
export async function patchHeliGroundFuel(docId, fields) {
  if (!docId) return false;
  const data = {};
  if (Object.prototype.hasOwnProperty.call(fields, 'fueled')) {
    data.fueled = fields.fueled === true || fields.fueled === 'true';
    if (!data.fueled) {
      data.fueledBy = null;
      data.fueledTimestamp = null;
    } else {
      data.fueledBy = fields.fueledBy || null;
      data.fueledTimestamp =
        fields.fueledTimestamp ||
        new Date().toLocaleTimeString('en-US', { timeStyle: 'short' });
    }
  }
  if (!Object.keys(data).length) return false;
  return updateDocumentSub('flights', String(docId), data);
}

function isLikelyPfrDocId(id) {
  if (id === undefined || id === null || id === '') return false;
  let s = String(id);
  if (s === 'undefined' || s === 'null') return false;
  if (/^\d+$/.test(s) && s.length < 10) return false;
  return true;
}

function livePfrDocId(pfr) {
  if (!pfr) return null;
  if (isLikelyPfrDocId(pfr.firestoreId)) return String(pfr.firestoreId);
  if (isLikelyPfrDocId(pfr._id)) return String(pfr._id);
  if (isLikelyPfrDocId(pfr.id)) return String(pfr.id);
  if (isLikelyPfrDocId(pfr.pfrNum)) return String(pfr.pfrNum);
  return null;
}

function flightDateString(flight) {
  if (!flight || !flight.date) return formatDate(new Date());
  let d = new Date(flight.date);
  if (isNaN(d.getTime())) return formatDate(new Date());
  return formatDate(d);
}

/** Same matching tf() uses to attach a PFR — live Firestore docs, not the modal stub. */
export function matchLivePfr(flight) {
  if (!flight) return null;
  let ds = flightDateString(flight);
  let pools = [];
  function addPool(arr) {
    if (!arr || !arr.length) return;
    for (let i = 0; i < arr.length; i++) pools.push(arr[i]);
  }
  addPool(allFlights);
  addPool(firebaseFlights);
  addPool(previousPfrs);
  let seen = {};
  let fallback = null;
  for (let i = 0; i < pools.length; i++) {
    let pfr = pools[i];
    let pfrId = livePfrDocId(pfr);
    if (!pfr || !pfrId || seen[pfrId]) continue;
    seen[pfrId] = true;
    if (pfr.isArchived) continue;
    if (pfr.dateString && pfr.dateString !== ds) continue;
    if (String(pfr.acftNumber || '') !== String(flight.aircraft || '')) continue;
    let matchFlightNum = String(pfr.flightNumber) === String(flight.flightNum);
    if (pfr.flightNumber && String(pfr.flightNumber).charAt(0) === '9' &&
        (flight.operation === 'Training' || flight.operation === 'Test' || flight.operation === 'Ferry')) {
      matchFlightNum = true;
    }
    if (!matchFlightNum) continue;
    let display = flight.pilotObject && flight.pilotObject.displayName;
    if (display && pfr.pilot && pfr.pilot !== display) {
      if (!fallback) fallback = pfr;
      continue;
    }
    return pfr;
  }
  return fallback;
}

function asFirestoreDate(val) {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try { return val.toDate(); } catch (err) { return null; }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 931 dispatch-only shape: metadata always; signatures only when set.
 * Never merge unset names as null (Firestore merge deletes). Remove Release
 * writes all six fields null. Timestamps are ISO strings (Ryan / Flight Report).
 */
function compactReleasePayload(flight, pfrId) {
  const payload = {
    dbId: flight._id,
    dateString: flight.date ? formatDate(new Date(flight.date)) : formatDate(new Date()),
    flightNumber: flight.flightNum,
    aircraft: flight.aircraft,
    pfrNum: pfrId
  };
  if (flight.knownIce != null) payload.knownIce = flight.knownIce;

  const clearing = !releaseFieldSet(flight.pilotAgree) &&
    !releaseFieldSet(flight.dispatchRelease) &&
    !releaseFieldSet(flight.ocRelease);
  if (clearing) {
    payload.pilotAgree = null;
    payload.ocRelease = null;
    payload.dispatchRelease = null;
    payload.releaseTimestamp = null;
    payload.ocReleaseTimestamp = null;
    payload.dispatchReleaseTimestamp = null;
    return payload;
  }

  [
    ['pilotAgree', 'releaseTimestamp'],
    ['dispatchRelease', 'dispatchReleaseTimestamp'],
    ['ocRelease', 'ocReleaseTimestamp']
  ].forEach(function(pair) {
    const nameKey = pair[0];
    const tsKey = pair[1];
    if (!releaseFieldSet(flight[nameKey])) return;
    payload[nameKey] = flight[nameKey];
    const ts = asFirestoreDate(flight[tsKey]);
    if (ts) payload[tsKey] = ts.toISOString();
  });
  return payload;
}

/**
 * FRA → Firebase: release/releaseStatus only.
 * Merge set signatures; omit unset (null would delete). Remove Release clears all.
 */
export async function firebaseMin(flight){
  if (!flight) return 'need flight!';
  let pfr = flight.pfr;
  if (typeof pfr === 'string') {
    try { pfr = JSON.parse(pfr); } catch (err) { pfr = null; }
  }
  if (!pfr || !pfr._id) {
    console.log('firebaseMin skip: no PFR id', flight.flightNum || flight._id);
    return 'No Pfr Attached to Flight';
  }
  let pfrId = String(pfr._id);
  const minFlight = compactReleasePayload(flight, pfrId);
  try {
    const response = await updateDocumentSub('flights', pfrId, minFlight);
    if (response) {
      console.log('minFlight updated', pfrId, flight.flightNum);
      return 'Updated';
    }
    return 'Firebase Write Failure';
  } catch (err) {
    console.log('firebaseMin error', pfrId, err);
    return 'Firebase Write Failure';
  }
}

export async function firebaseQuery(req,res){
  let collection=req.body.collection||'pilots';
  let limit=req.body.limit||50;
  let parameter=req.body.parameter||'pilotEmployeeNumber';
  let operator=req.body.operator||'==';
  let value=req.body.value||'933';
  let timestampBoolean=req.body.timestampBoolean||false;
  const result=await getCollectionQuery(collection,limit,parameter,operator,value,timestampBoolean,req.body.parameter2,req.body.operator2,req.body.value2,req.body.queryOr,req.body.minDateParameter,req.body.minDateOperator,req.body.minDate,req.body.minDateTimestamp);
  let array=collectionToArray(result);
  return res.status(200).json(array);
}

export async function firebaseDate(req,res){
  let collection=req.body.collection;
  let limit=req.body.limit||150;
  let date=req.body.date?new Date(req.body.date):new Date();
  if (isNaN(date.getTime())) date=new Date();
  const result=await getCollectionDateWithSub(collection,limit,date);
  let array=result;//collectionToArray(result);
  if (res) return res.status(200).json(array);
  return array;
}

export async function firebaseLimited(req,res){
  let collection=req.body.collection;
  let limit=req.body.limit||50;
  const result=await getCollectionLimited(collection,limit);
  let array=collectionToArray(result);
  if (res) return res.status(200).json(array);
  return array;
}

export async function updateFirebase(req,res){
  console.log(req.body)
  let collection=req.body.collection;
  let localDoc=req.body.doc;
  let id = localDoc._id.toString();
  delete localDoc._id;
  console.log(localDoc)
  updateDocument(collection, id, localDoc).then((response)=>{
    res.status(200).json(response);
  });
}

export async function firebaseInterval(req,res){
  let status=200;
  let allPfrs=[];
  try{
    let pilots=await getCollection('pilots');
    firebasePilots=collectionToArray(pilots);
    let aircraft=await getCollection('aircraft');
    firebaseAircraft=collectionToArray(aircraft);
    allPfrs=firebaseFlights.concat(previousPfrs);
    for (let flight of allPfrs){
      let index = firebaseAircraft.map(e => e._id).indexOf(flight.acftNumber);
      if (index>-1) {
        if (flight.legArray[flight.legArray.length-1]&&firebaseAircraft[index].currentAirportRelease!==flight.legArray[flight.legArray.length-1].arr) {
          if (!firebaseAircraft[index].recentlyUpdated) {
            firebaseAircraft[index].currentAirportRelease=flight.legArray[flight.legArray.length-1].arr;
            await updateDocument('aircraft', firebaseAircraft[index]._id, {currentAirportRelease:firebaseAircraft[index].currentAirportRelease});
          }
        }
        firebaseAircraft[index].recentlyUpdated=true;
      }
    }
  }
  catch(err){
    status=404;
    console.log(err);
  }
  finally{
    if (res) return res.status(status).json(allPfrs);
    return 'allPfrs Length is: ' + allPfrs.length;
  }
}

export async function firebaseGrab(req, res) {
  try {
    if (!firebasePilots || !firebasePilots.length) {
      await firebaseInterval();
    }
  } catch (err) {
    console.log('firebaseGrab prefetch failed', err);
  }
  let json = { flights: allFlights, pilots: firebasePilots, aircraft: firebaseAircraft };
  res.status(200).json(json);
}

export function quickGrab(){
  let json={flights:firebaseFlights,pilots:firebasePilots,aircraft:firebaseAircraft,previousPfrs:previousPfrs};
  return json;
}
