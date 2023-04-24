/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/monitors              ->  index
 * POST    /api/monitors              ->  create
 * GET     /api/monitors/:id          ->  show
 * PUT     /api/monitors/:id          ->  update
 * DELETE  /api/monitors/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Monitor} from '../../sqldb';
var client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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

// Gets a list of Monitors
export function index(req, res) {
  return Monitor.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Monitor from the DB
export function show(req, res) {
  return Monitor.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function twilio(req,res){
  var params = {
    from: process.env.TWILIO_PHONE_NUMBER,
    to: req.body.to,
    //mediaUrl:req.body.mediaUrl,
    body: req.body.body
  };
  client.messages
  .create(params)
  .then(message => {
    console.log('Twilio message sent successfully');
    res.sendStatus(200);
  })
  .catch((error) => {
    // You can implement your fallback code here
    console.log(error);
  });
  
}

// Creates a new Monitor in the DB
export function create(req, res) {
  return Monitor.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Monitor in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Monitor.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Monitor from the DB
export function destroy(req, res) {
  return Monitor.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
