/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/snapshots              ->  index
 * POST    /api/snapshots              ->  create
 * GET     /api/snapshots/:id          ->  show
 * PUT     /api/snapshots/:id          ->  update
 * DELETE  /api/snapshots/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Snapshot} from '../../sqldb';

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

// Gets a list of Snapshots
export function index(req, res) {
  return Snapshot.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Snapshot from the DB
export function show(req, res) {
  return Snapshot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Snapshot in the DB
export function create(req, res) {
  return Snapshot.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Snapshot in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Snapshot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Snapshot from the DB
export function destroy(req, res) {
  return Snapshot.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
