'use strict';

import {RotEvaluation} from '../../sqldb';

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) return res.status(statusCode).json(entity);
    return null;
  };
}

function saveUpdates(updates) {
  return function(entity) {
    if (entity) {
      return entity.update(updates).then(updated => updated);
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

export function index(req, res) {
  return RotEvaluation.findAll({order: [['_id', 'DESC']]})
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function show(req, res) {
  return RotEvaluation.findOne({where: {_id: req.params.id}})
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function create(req, res) {
  return RotEvaluation.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

export function update(req, res) {
  if (req.body._id) delete req.body._id;
  return RotEvaluation.findOne({where: {_id: req.params.id}})
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function destroy(req, res) {
  return RotEvaluation.findOne({where: {_id: req.params.id}})
    .then(handleEntityNotFound(res))
    .then(entity => entity.destroy().then(() => res.status(204).end()))
    .catch(handleError(res));
}
