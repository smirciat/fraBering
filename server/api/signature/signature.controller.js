/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/signatures              ->  index
 * POST    /api/signatures              ->  create
 * GET     /api/signatures/:id          ->  show
 * PUT     /api/signatures/:id          ->  update
 * DELETE  /api/signatures/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Signature} from '../../sqldb';

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

// Gets a list of Signatures
export function index(req, res) {
  return Signature.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a list of Signatures
export function day(req, res) {
  let date=req.body.date||new Date().toLocaleDateString();
  let whereClause={where:{date:date},order:[['_id','DESC']]};
  if (req.body.flightNum) whereClause.where.flightNum=req.body.flightNum;
  return Signature.findAll(whereClause)
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Signature from the DB
export function show(req, res) {
  return Signature.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Signature in the DB
export function create(req, res) {
  return Signature.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Signature in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Signature.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Signature from the DB
export function destroy(req, res) {
  return Signature.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
