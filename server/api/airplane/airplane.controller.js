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
const admin = require('firebase-admin');
const serviceAccount = require('../../firebase.json');
//initialize admin SDK using serciceAcountKey
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const firebase_db = admin.firestore();
let observer, unsub, fbQuery, tempFlights;
let firebaseFlights=[];
let firebasePilots=[];
let firebaseAircraft=[];

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
      return entity.updateAttributes(updates)
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
  return Airplane.find({
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
  return Airplane.find({
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
  return Airplane.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

function fSort(flights){
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

export async function getCollectionQuery(collectionName,limit,parameter,operator,value,timestampBoolean,parameter2,operator2,value2) {
  try {
    for (let s of [collectionName,limit,parameter,operator,value,timestampBoolean]){
      console.log(s);
    }
    if (timestampBoolean) {
      value=admin.firestore.Timestamp.fromDate(new Date(value));
      if (value2) value2=admin.firestore.Timestamp.fromDate(new Date(value2));
    }
    const collectionRef = firebase_db.collection(collectionName);
    let date1,date2,date3;
    let querySnapshot, querySnapshot1, querySnapshot2;
    if (collectionName==='releases') {
      querySnapshot = await collectionRef.where(parameter, operator , value).where(parameter2, operator2 , value2).limit(limit).get();
    }
    else {
      if (!value2) querySnapshot = await collectionRef.where(parameter, operator , value).orderBy('date', 'desc').limit(limit).get();
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
    if (querySnapshot1){
      querySnapshot1.forEach((doc1) => {
        mergedData.push(doc1);
        //console.log(doc.id, '=>', doc.data());
      });
    }
    if (querySnapshot2){
      querySnapshot2.forEach((doc2) => {
        mergedData.push(doc2);
        //console.log(doc.id, '=>', doc.data());
      });
    }
    querySnapshot.forEach((doc) => {
      mergedData.push(doc);
      //console.log(doc.id, '=>', doc.data());
    });
    return mergedData;
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

async function updateDocument(collection,docId,data) {
   let docRef;
   if (docId) {
     docRef = firebase_db.collection(collection).doc(docId);
     try {
       await docRef.update(data);
       console.log('Document successfully updated!');
       return true;
     } catch (error) {
       console.error('Error updating document:', error);
       return false;
     }
   }
   else {
     docRef = firebase_db.collection(collection).doc();
     try {
       await docRef.set(data);
       console.log('Document successfully created!');
       return true;
     } catch (error) {
       console.error('Errorcreating document:', error);
       return false;
     }
   }
}

export function observe(collectionName,fbDate) {
  try {
    if (unsub) unsub();//clear any previous observer
    fbQuery = firebase_db.collection('flights').where('dateString','==',fbDate);
    unsub=fbQuery.onSnapshot(querySnapshot=>{
      firebaseFlights=fSort(collectionToArray(querySnapshot));
      if (firebaseAircraft.length===0) return;
      for (let flight of firebaseFlights){
        let index = firebaseAircraft.map(e => e._id).indexOf(flight.acftNumber);
        if (index>-1) {
          //if (flight.legArray&&flight.legArray.length&&flight.legArray[flight.legArray.length-1]&&firebaseAircraft[index].currentAirport!==flight.legArray[flight.legArray.length-1].arr) {
            //if (!firebaseAircraft[index].recentlyUpdated) {
              //firebaseAircraft[index].currentAirport=flight.legArray[flight.legArray.length-1].arr;
              //updateDocument('aircraft', firebaseAircraft[index]._id, {currentAirport:firebaseAircraft[index].currentAirport});
            //}
          //}
          firebaseAircraft[index].recentlyUpdated=true;
        }
      }
      console.log('***********************');
      console.log('Length of Array is:' + firebaseFlights.length);
    }, (error) => {console.log(error)});
    
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
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2); // Get last two digits of the year
  return `${mm}/${dd}/${yy}`;
}

export async function firebaseMin(flight){
  console.log(flight._id)
  if (!flight) return 'need flight!';
  let minFlight={};
  minFlight.dbId=flight._id;
  minFlight.dateString=formatDate(new Date(flight.date));
  minFlight.flightNumber=flight.flightNum;
  minFlight.pilotAgree=flight.pilotAgree;
  minFlight.ocRelease= flight.ocRelease;
  minFlight.dispatchRelease= flight.dispatchRelease;
  minFlight.releaseTimestamp= flight.releaseTimestamp;
  minFlight.ocReleaseTimestamp= flight.ocReleaseTimestamp;
  minFlight.dispatchReleaseTimestamp= flight.dispatchReleaseTimestamp;
  minFlight.knownIce= flight.knownIce;
  minFlight.pilotObject=flight.pilotObject;
  minFlight.aircraft=flight.aircraft;
  console.log(minFlight)
  const result=await getCollectionQuery('flights',1,'dateString','==',minFlight.dateString,false,'flightNumber','==',minFlight.flightNumber);
  let array=collectionToArray(result);
  array=array.filter(f=>f.acftNumber===minFlight.aircraft&&!f.isArchived);
  if (flight.pilotObject) array=array.filter(f=>f.pilot===flight.pilotObject.displayName);
  if (array.length===0) return 'no matching pfr found';
  let id=array[0]._id;
  delete minFlight.pilotObject;
  delete minFlight.aircraft;
  updateDocument('flights', id, minFlight).then(()=>{
    console.log('minFlight updated');
    return 'Updated';
  }).catch(err=>{
    console.log(err);
    return 'Firebase Write Failure';
  });
}

export async function firebaseQuery(req,res){
  let collection=req.body.collection||'pilots';
  let limit=req.body.limit||50;
  let parameter=req.body.parameter||'pilotEmployeeNumber';
  let operator=req.body.operator||'==';
  let value=req.body.value||'933';
  let timestampBoolean=req.body.timestampBoolean||false;
  const result=await getCollectionQuery(collection,limit,parameter,operator,value,timestampBoolean,req.body.parameter2,req.body.operator2,req.body.value2);
  let array=collectionToArray(result);
  return res.status(200).json(array);
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
  updateDocument(collection, id, localDoc).then(()=>{
    res.status(200).json('Updated');
  });
}

export async function firebaseInterval(req,res){
  let status=200;
  try{
    let pilots=await getCollection('pilots');
    firebasePilots=collectionToArray(pilots);
    let aircraft=await getCollection('aircraft');
    firebaseAircraft=collectionToArray(aircraft);
    //let flights=await getCollectionLimited('flights',500);
    //firebaseFlights=fSort(collectionToArray(flights));
    //for (let flight of firebaseFlights){
      //let index = firebaseAircraft.map(e => e._id).indexOf(flight.acftNumber);
      //if (index>-1) {
        //if (firebaseAircraft[index].currentAirport!==flight.legArray[flight.legArray.length-1].arr) {
          //console.log('This would have fired a firebase update if it weren`t commented out');
          //if (!firebaseAircraft[index].recentlyUpdated) {
            //firebaseAircraft[index].currentAirport=flight.legArray[flight.legArray.length-1].arr;
            //await updateDocument('aircraft', firebaseAircraft[index]._id, {currentAirport:firebaseAircraft[index].currentAirport});
          //}
        //}
        //firebaseAircraft[index].recentlyUpdated=true;
      //}
    //}
  }
  catch(err){
    status=404;
    console.log(err);
  }
  finally{
    res.status(status).json('firebase interval complete');
  }
}

export function firebaseGrab(req,res){
  let json={flights:firebaseFlights,pilots:firebasePilots,aircraft:firebaseAircraft};
  res.status(200).json(json);
}

export function quickGrab(){
  let json={flights:firebaseFlights,pilots:firebasePilots,aircraft:firebaseAircraft};
  return json;
}
