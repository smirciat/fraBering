/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/airportRequirements              ->  index
 * POST    /api/airportRequirements              ->  create
 * GET     /api/airportRequirements/:id          ->  show
 * PUT     /api/airportRequirements/:id          ->  update
 * DELETE  /api/airportRequirements/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {AirportRequirement} from '../../sqldb';
const axios = require("axios");
var parser = require('xml2js').parseString;;

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

// Gets a list of AirportRequirements
export function index(req, res) {
  return AirportRequirement.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single AirportRequirement from the DB
export function show(req, res) {
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new AirportRequirement in the DB
export function create(req, res) {
  return AirportRequirement.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing AirportRequirement in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a AirportRequirement from the DB
export function destroy(req, res) {
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

export function adds(req,res) {
  if (!req.body.airport) res.status(404).end();
  var airport=req.body.airport;
  //var url="https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&hoursBeforeNow=3&mostRecent=true&stationString="+airport;
  var url="https://api.weather.gov/stations/" + airport + "/observations/current";
  url="https://api.mesowest.net/v2/stations/timeseries?stid=" + airport  + "&recent=70&vars=metar&obtimezone=UTC&token=" + process.env.TOKEN;
  axios.get(url)
  .then(response => {
    console.log(response.data.STATION[0])
    var index=response.data.STATION[0].OBSERVATIONS.metar_set_1.length-1;
    res.json(response.data.STATION[0].OBSERVATIONS.metar_set_1[index]);
    //parser(response.data, function (err, result) {
    //    if (err) {
    //      console.log(err);
    //      throw err;
    //    }
    //    res.json(result.response.data[0].METAR[0]['raw_text'][0]);
    //});
    
  },handleError(res));  
}
