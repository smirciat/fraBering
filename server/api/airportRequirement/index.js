'use strict';

var express = require('express');
var controller = require('./airportRequirement.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/autoCheck', controller.autoCheck);
router.post('/adds', controller.adds);
router.post('/metars', controller.metars);
router.post('/grabMetars', controller.metarListGrab);
router.post('/tafs', controller.tafs);
router.post('/notams', controller.notams);
router.post('/pireps', controller.getPireps);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
