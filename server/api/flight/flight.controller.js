/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/flights              ->  index
 * POST    /api/flights              ->  create
 * GET     /api/flights/:id          ->  show
 * PUT     /api/flights/:id          ->  update
 * DELETE  /api/flights/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Flight} from '../../sqldb';
import fs from 'fs';

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

// Gets a list of Flights
export function index(req, res) {
  return Flight.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Flight from the DB
export function show(req, res) {
  return Flight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Flight in the DB
export function create(req, res) {
  return Flight.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Flight in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Flight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Flight from the DB
export function destroy(req, res) {
  return Flight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

export function tf(req,res) {
  try {
    let data=fs.readFileSync(__dirname+'/../../fileserver/current.csv', 'utf-8');
    let arr=data.split('\r\n');
    let dateArr=arr[4].split(' ');
    let date=new Date(dateArr[3]+' '+dateArr[4]+' '+dateArr[5]).toLocaleDateString();
    if (date!==req.body.dateString) {
      res.status(404);
      return;
    }
    console.log('parsing flight summary');
    let flightArr=[];
    let pilot,lastAirport,lastTime;
    let flight={airports:[],departTimes:[]};
    
    for (let x=7;x<arr.length;x++){
      let flightList=arr[x].split(',');
      if (!flightList[1]||flightList[1]==="") {
        //blank line, new pilot coming up
        if (flight&&flight.flightNum) {
          
        }
        flight={airports:[],departTimes:[]};
        continue;
      }
      if (!flight.pilot) flight.pilot=flightList[0];
      if (!flight.flightNum&&flightList[8]) {
        //indicates new flight number
        flight.flightNum=flightList[8].split('.')[0];
      }
      flight.airports.push(flightList[6]);
      lastAirport=flightList[7];
      flight.departTimes.push(new Date(flightList[2]).toTimeString().slice(0,8));
      lastTime=new Date(flightList[2]).toTimeString().slice(0,8);
      //check if its the last one
      if (x===arr.length-1||(flightList[8].split('.')[0]!==arr[x+1].split(',')[8].split('.')[0])) {
        flight.airports.push(lastAirport);
        //flight.departTimes.push(lastTime);
        flightArr.push(flight);
        flight={airports:[],departTimes:[],pilot:flight.pilot};
      }
    }
    res.status(200).json(flightArr);
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to load CSV file from Takeflite');
  }
}
