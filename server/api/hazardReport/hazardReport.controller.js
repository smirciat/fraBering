/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/hazardReports              ->  index
 * POST    /api/hazardReports              ->  create
 * GET     /api/hazardReports/:id          ->  show
 * PUT     /api/hazardReports/:id          ->  update
 * DELETE  /api/hazardReports/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {HazardReport} from '../../sqldb';

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

// Gets a list of HazardReports
export function index(req, res) {
  return HazardReport.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single HazardReport from the DB
export function show(req, res) {
  return HazardReport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new HazardReport in the DB
export function create(req, res) {
  return HazardReport.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing HazardReport in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return HazardReport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a HazardReport from the DB
export function destroy(req, res) {
  return HazardReport.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
