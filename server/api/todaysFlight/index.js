'use strict';

var express = require('express');
var controller = require('./todaysFlight.controller');

var router = express.Router();

router.get('/', controller.index);
//router.get('/stopped', controller.returnFail);
//router.post('/stopped1', controller.returnFail);
//router.post('/stopped2', controller.returnFail);
//router.post('/stopped3', controller.returnFail);
//router.post('/stopped4', controller.returnFail);
//router.post('/stopped5', controller.returnFail);
//router.post('/stopped6', controller.returnFail);
//router.post('/stopped8', controller.returnFail);
//router.post('/stopped9', controller.returnStopped);
//router.post('/stopped10', controller.returnStopped);
//router.post('/stopped11', controller.returnStopped);
//router.post('/stopped12', controller.returnStopped);
//router.post('/stopped13', controller.returnStopped);
//router.post('/stopped14', controller.returnStopped);
//router.post('/stopped15', controller.returnStopped);
router.post('/stopped10', controller.returnStopped);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/tf', controller.tf);
router.post('/dayFlights', controller.dayFlights);
router.post('/getManifests', controller.getManifests);
router.post('/getManifest', controller.getManifest);
router.post('/getFlightLogs', controller.getFlightLogs);
router.post('/record', controller.recordAssessments);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
