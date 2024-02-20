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
import config from '../../config/environment';
const baseUrl = 'https://localhost:' + config.port;
const url1="https://api.synopticdata.com/v2/stations/latest?stid=";
const url2="&vars=metar&token=" + process.env.TOKEN;//"&within=120&vars=metar&token=" + process.env.TOKEN;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});

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
  if (!req.body||!req.body.airport||req.body.airport==="") res.status(404).end();
  var airport=req.body.airport;
  var url = url1 + airport + url2;
  axios.get(url)
  .then(response => {
    var jsonResponse={};
    if (!response.data.STATION) jsonResponse={};
    else {
      if (response.data.STATION[0]) {
        //var index=response.data.STATION[0].OBSERVATIONS.metar_set_1.length-1;
        //jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_set_1[index];
        jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
        jsonResponse.latitude=response.data.STATION[0].LATITUDE;
        jsonResponse.longitude=response.data.STATION[0].LONGITUDE;
        jsonResponse.date=response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      }
      else {
        jsonResponse.metar="missing";
      }
    }
    res.json(jsonResponse);
    
  },handleError(res));  
}

export function autoCheck(req,res){
  if (!req.body.monitor.password||req.body.monitor.password!==process.env.PASSWORD) {
    res.status(501).end();
    return null;
  }
  var monitor=req.body.monitor;
  const myInterval=setInterval(()=>{
      var mon=_.cloneDeep(monitor);
      //test parameter and threshold by current condition
      //get current condition through api
      if (mon.airport&&mon.airport!==""&&mon.airport.length>2) {
        axios.post(baseUrl + '/api/airportRequirements/adds',{airport:mon.airport}, { httpsAgent: agent }).then((response)=>{
          if (!response.data.metar||response.data.metar==="missing") return;
          var metar=response.data.metar;
          //parse result
          var metarObj=config.parseADDS(metar);
          //test threshold
          if (config.testThreshold(metarObj,mon.watchedParameter,mon.watchedThreshold)) {
            //if failed, do nothing.  if passed, stop interval and notify and update monitor record in api
            mon.active=false;
            if (monitor.active){
              axios.put(baseUrl + '/api/monitors/' + mon._id,mon, { httpsAgent: agent }).then(()=>{
                monitor.active=false;
                console.log("Monitor Updated in database");
              });
              axios.post(baseUrl + '/api/monitors/twilio',{to:mon.phone,body:metar}, { httpsAgent: agent }).then((res)=>{
                console.log('Twilio message sent');
              },function(err){
                console.log(err);
              });
            }
            clearInterval(myInterval);
          }
        });
      }
    },1000*60);
  res.sendStatus(200);
}
