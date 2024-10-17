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

async function getCollectionLimited(collectionName,limit) {
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
   const docRef = firebase_db.collection(collection).doc(docId);

   try {
     await docRef.update(data);
     console.log('Document successfully updated!');
   } catch (error) {
     console.error('Error updating document:', error);
   }
}

export async function firebase(req,res){
  let collection=req.body.collection;
  const result=await getCollection(collection);
  let array=[];
  result.forEach(doc=>{
    let obj=doc.data();
    obj._id=doc.id;
    array.push(obj);
  });
  //console.log(array);
  res.status(200).json(array);
}

export async function firebaseLimited(req,res){
  let collection=req.body.collection;
  let limit=req.body.limit;
  const result=await getCollectionLimited(collection,limit);
  let array=[];
  result.forEach(doc=>{
    let obj=doc.data();
    obj._id=doc.id;
    array.push(obj);
  });
  //console.log(array);
  res.status(200).json(array);
}

export async function updateFirebase(req,res){
  let collection=req.body.collection;
  let localDoc=req.body.doc;
  let id = localDoc._id.toString();
  delete localDoc._id;
  updateDocument(collection, id, localDoc).then(()=>{
    res.status(200).json('Updated');
  });
}
