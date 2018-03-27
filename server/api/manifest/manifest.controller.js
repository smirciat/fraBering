/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/manifests              ->  index
 * POST    /api/manifests              ->  create
 * GET     /api/manifests/:id          ->  show
 * PUT     /api/manifests/:id          ->  update
 * DELETE  /api/manifests/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Manifest} from '../../sqldb';

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

// Gets a list of Manifests
export function index(req, res) {
  return Manifest.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Manifest from the DB
export function show(req, res) {
  return Manifest.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Manifest in the DB
export function create(req, res) {
  return Manifest.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Manifest in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Manifest.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Manifest from the DB
export function destroy(req, res) {
  return Manifest.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
