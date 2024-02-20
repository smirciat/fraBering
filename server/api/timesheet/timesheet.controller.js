/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/timesheets              ->  index
 * POST    /api/timesheets              ->  create
 * GET     /api/timesheets/:id          ->  show
 * PUT     /api/timesheets/:id          ->  update
 * DELETE  /api/timesheets/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
var sqldb = require('../../sqldb');
var Timesheet = sqldb.Timesheet;
var dns = require('dns');

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

function responseWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      res.status(statusCode).json(entity);
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

function saveUpdates(updates) {
  return function(entity) {
    return entity.updateAttributes(updates)
      .then(updated => {
        return updated;
      });
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

// Gets a list of Timesheets
export function index(req, res) {
  Timesheet.findAll()
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Gets a single Timesheet from the DB
export function show(req, res) {
  var uid = req.body.uid||0;
  Timesheet.findAll({
    where: {
      uid:uid,
      timeOut: null
    }
  })
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Gets a single User's Timesheets from the DB for a certain date range
//req includes {uid:uid,date:startDate,endDate:endDate}
export function user(req, res) {
  var uid = req.body.uid||0;
  var date = req.body.date;
  var endDate = req.body.endDate;
  Timesheet.findAll({
    where: {
      uid: uid,
      timeIn:{$gte:date,$lt:endDate}
    },
    order: [['timeIn','DESC']]
  })
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Gets all Timesheets from the DB for a certain date range
//req includes {date:startDate,endDate:endDate}
export function allUsers(req, res) {
  var date = req.body.date;
  var endDate = req.body.endDate;
  Timesheet.findAll({
    where: {
      timeIn:{$gte:date,$lt:endDate}
    },
    order: [['name','ASC'],['timeIn','DESC']]
  })
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

// Creates a new Timesheet in the DB
export function create(req, res) {
  Timesheet.create(req.body)
    .then(responseWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Timesheet in the DB
export function update(req, res) {
  console.log(req.body)
  if (req.body._id) {
    delete req.body._id;
  }
  Timesheet.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
}

export function sba(req,res) {
  res.json(true);
  //dns.resolve4('smokeybay.dynu.net', function (err, addresses) {
  //  if (err) throw err;
  //  var sba=addresses[0];
  //  dns.resolve4('seldovia.dynu.net', function (err, addresses) {
  //    if (err) throw err;
  //    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
  //    var match = ip===sba||ip===addresses[0];
  //    res.json(match);
  //  });
  //});
}

// Deletes a Timesheet from the DB
export function destroy(req, res) {
  Timesheet.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
