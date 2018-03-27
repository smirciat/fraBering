/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/reservations              ->  index
 * POST    /api/reservations              ->  create
 * GET     /api/reservations/:id          ->  show
 * PUT     /api/reservations/:id          ->  update
 * DELETE  /api/reservations/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {Reservation} from '../../sqldb';

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

// Gets a list of Reservations
export function index(req, res) {
  return Reservation.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a list of Reservations that matches a specific flight and date
export function oneFlight(req, res) {
  var options = {};
  var order = [['flightNumber','ASC'],['depart','ASC']];
  if (req.body.date) {
    var date = new Date(req.body.date); 
    var endDate = new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,59); 
    date = new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0); 
    options['date'] = {
      $lte: endDate,
      $gte: date 
    };
  }
  if (req.body.flightNumber){
    options['flightNumber'] = req.body.flightNumber;
  }
  Reservation.findAll({where: options, order: order} )
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Reservation from the DB
export function show(req, res) {
  return Reservation.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Reservation in the DB
export function create(req, res) {
  return Reservation.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Reservation in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Reservation.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Reservation from the DB
export function destroy(req, res) {
  return Reservation.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
