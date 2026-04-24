/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/sms              ->  index
 * POST    /api/sms              ->  create
 * GET     /api/sms/:id          ->  show
 * PUT     /api/sms/:id          ->  update
 * DELETE  /api/sms/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Sm} from '../../sqldb';
import localEnv from '../../config/local.env';
let client = require('twilio')(
  localEnv.TWILIO_ACCOUNT_SID,
  localEnv.TWILIO_AUTH_TOKEN
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

// Gets a list of Sms
export function index(req, res) {
  return Sm.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Sm from the DB
export function show(req, res) {
  return Sm.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Sm in the DB
export function create(req, res) {
  return Sm.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Sm in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Sm.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Sm from the DB
export function destroy(req, res) {
  return Sm.findOne({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

// Creates a new Sm in the DB
export async function incoming(req, res) {
  let sms = {to:req.body.To,
            from:req.body.From,
            body:req.body.Body,
            mediaUrl:req.body.MediaUrl0,
            sent: new Date()
  };
  console.log('incoming sms');
  //
  return Sm.create(sms)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}
