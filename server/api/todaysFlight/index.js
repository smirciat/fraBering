'use strict';

var express = require('express');
var controller = require('./todaysFlight.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/stopped', controller.returnFail);
router.post('/stopped4', controller.returnFail);
router.post('/stopped8', controller.returnFail);
router.post('/stopped17', controller.returnStopped);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/tf', controller.tf);
router.post('/dayFlights', controller.dayFlights);
router.post('/getManifests', controller.getManifests);
router.post('/getManifest', controller.getManifest);
router.post('/record', controller.recordAssessments);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
