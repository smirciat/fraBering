/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/assessments              ->  index
 * POST    /api/assessments              ->  create
 * GET     /api/assessments/:id          ->  show
 * PUT     /api/assessments/:id          ->  update
 * DELETE  /api/assessments/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Assessment} from '../../sqldb';

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

// Gets a list of Assessments
export function index(req, res) {
  return Assessment.findAll({order:[['_id','DESC']]})
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Assessment from the DB
export function lookup(req, res) {
  //passed in object is req.body
  var options={};
  options.airports={$contains:[req.body.airport]};
  return Assessment.findAll({where: options,limit:1,order:[['_id','DESC']]} )
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Assessment from the DB
export function show(req, res) {
  return Assessment.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Assessment in the DB
export function create(req, res) {
  //console.log(req.body);
  if (!req.body.password||req.body.password!==process.env.PASSWORD) {
    res.status(501).end();
    return null;
  }
  return Assessment.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Assessment in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Assessment.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Assessment from the DB
export function destroy(req, res) {
  return Assessment.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
