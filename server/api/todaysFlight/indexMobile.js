'use strict';

var express = require('express');
var controller = require('./todaysFlight.controller');

var router = express.Router();

router.post('/currentId', controller.showMobile);
router.post('/dayFlights', controller.dayFlightsMobile);
router.post('/updateFlight', controller.updateMobile);

module.exports = router;
