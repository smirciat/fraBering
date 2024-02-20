/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/pilots              ->  index
 * POST    /api/pilots              ->  create
 * GET     /api/pilots/:id          ->  show
 * PUT     /api/pilots/:id          ->  update
 * DELETE  /api/pilots/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Pilot} from '../../sqldb';

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

// Gets a list of Pilots
export function index(req, res) {
  return Pilot.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Pilot from the DB
export function show(req, res) {
  return Pilot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Pilot in the DB
export function create(req, res) {
  return Pilot.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Pilot in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  
  return Pilot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Pilot from the DB
export function destroy(req, res) {
  return Pilot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
