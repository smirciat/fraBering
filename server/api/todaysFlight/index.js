'use strict';

var express = require('express');
var controller = require('./todaysFlight.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/stopped', controller.returnFail);
router.post('/stopped1', controller.returnFail);
router.post('/stopped3', controller.returnFail);
router.post('/stopped4', controller.returnFail);
router.post('/stopped7', controller.returnStopped);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/tf', controller.tf);
router.post('/dayFlights', controller.dayFlights);
router.post('/record', controller.recordAssessments);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
