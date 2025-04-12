/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/canledar              ->  index
 * POST    /api/canledar              ->  create
 * GET     /api/canledar/:id          ->  show
 * PUT     /api/canledar/:id          ->  update
 * DELETE  /api/canledar/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Calendar} from '../../sqldb';
const axios = require("axios");
import localEnv from '../../config/local.env.js';
let todaysRoster=[];

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

// Gets a list of Calendars
export function index(req, res) {
  return Calendar.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Calendar from the DB
export function show(req, res) {
  return Calendar.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Calendar in the DB
export function create(req, res) {
  return Calendar.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Calendar in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Calendar.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function getFirstAndLast(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return { firstDay, lastDay };
}

export function month(req,res) {
  let date=new Date(req.body.date);
  let firstAndLast=getFirstAndLast(date);
  return Calendar.findAll({
    where: {
        dateObj: {
          $between: [firstAndLast.firstDay, firstAndLast.lastDay]
        }
      }
    }  
  )
  .then(respondWithResult(res))
  .catch(handleError(res));
}

// Deletes a Calendar from the DB
export function destroy(req, res) {
  return Calendar.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

export async function rosterMonth(req, res) {
  let dateString=new Date();
  if (req.body.dateString) dateString=req.body.dateString;
  const roster=await setRosterDay(dateString);
  res.status(200).json(roster);
}

export async function rosterDay(req, res) {
  let dateString=new Date();
  if (req.body.dateString) dateString=req.body.dateString;
  const roster=await setRosterDay(dateString);
  res.status(200).json(roster);
}

export async function setRosterDay(dateString){
  const bodyParameters = {headers: {'Authorization':localEnv.ROSTER_TOKEN} };
  let date=new Date(dateString);
  date.setUTCHours(0, 0, 0, 0);
  let startDate=date.toISOString();
  let day = date.getDate();
  day++;
  date.setDate(day);
  let endDate=date.toISOString();
  console.log(startDate)
  try{//type=shift restricts response to only working days, not available or requested off
    let response=await axios.get('https://fyccqqeiahhzheubvavn.supabase.co/functions/v1/tenant-api-handler?table=calendar_events&start_plain_date_time='+startDate+'&end_plain_date_time='+endDate+'&type=shift', bodyParameters);
    //todaysRoster=response.data.data;
    return response.data.data;
  }
  catch(err){
    console.log(err);
    return [];
  }
}
