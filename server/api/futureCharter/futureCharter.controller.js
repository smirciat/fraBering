/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/futureCharters              ->  index
 * POST    /api/futureCharters              ->  create
 * GET     /api/futureCharters/:id          ->  show
 * PUT     /api/futureCharters/:id          ->  update
 * DELETE  /api/futureCharters/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {FutureCharter} from '../../sqldb';
import {getManifests} from '../todaysFlight/todaysFlight.controller.js';
export let futureCharters=[];

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

// Gets a list of FutureCharters
export function index(req, res) {
  return FutureCharter.findOneAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single FutureCharter from the DB
export function show(req, res) {
  return FutureCharter.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new FutureCharter in the DB
export function create(req, res) {
  return FutureCharter.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing FutureCharter in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return FutureCharter.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a FutureCharter from the DB
export function destroy(req, res) {
  return FutureCharter.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

//iterate through the next 90 days
export async function charterInterval(){
  console.log('Updating Future Charters');
  futureCharters=[];
  const today = new Date();
  try {await oneDay(today)}
  catch(err){console.log(err)}
  for (let i = 0; i < 90; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    try {await oneDay(nextDate)}
    catch(err){console.log(err)}
  }
  console.log('Future Charters Length is: '+futureCharters.length);
}

//search all the flights of a specific day and find its charters.  
async function oneDay(date){
  try{
    //get manifests from takeflite
    const result=await getManifests({body:{date:date}});
    const manifests=result.flights;
    for (const manifest of manifests) {
      if (manifest.type!=='Charter'||!manifest.flightLegs||manifest.flightLegs.length<1) continue;
      let flight={date:date,dateString:date.toLocaleDateString(),flightId:manifest.flightLegs[0].id.toString(),aircraft:manifest.flightLegs[0].registration,flight:manifest};
      futureCharters.push(flight);
    }
  }
  catch(err){return console.log(err)}
}

export function grab(req,res){
  return res.status(200).json(futureCharters);
}
