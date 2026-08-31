'use strict';

var express = require('express');
var controller = require('./todaysFlight.controller');
import * as auth from '../../auth/auth.service';
import localEnv from '../../config/local.env.js';

var router = express.Router();

function opsExportTokenSecret() {
  return process.env.FRAT_OPS_EXPORT_TOKEN || localEnv.FRAT_OPS_EXPORT_TOKEN || '';
}

function allowOpsExportAccess(req, res, next) {
  var secret = opsExportTokenSecret();
  if (!secret) {
    return res.status(503).json({message: 'FRAT ops export is not configured'});
  }
  var provided = req.get('x-frat-ops-export-token') || req.query.exportToken;
  if (provided && String(provided) === String(secret)) {
    return next();
  }
  return res.status(401).json({message: 'Invalid export token'});
}

// Reservations daily board — color + release badges (#126)
router.get('/ops-export', allowOpsExportAccess, controller.opsExport);

// Public departures board (whitelisted payload only)
router.post('/public/dayFlights', controller.dayFlightsPublic);

router.use(auth.hasRole('user'));

router.get('/', controller.index);
router.post('/stopped151', controller.returnStopped);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/tf', controller.tf);
router.post('/dayFlights', controller.dayFlights);
router.post('/flightRange', controller.flightRange);
router.post('/getManifests', controller.getManifests);
router.post('/getManifest', controller.getManifest);
router.post('/getFlightLogs', controller.getFlightLogs);
router.post('/record', controller.recordAssessments);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
