'use strict';

var express = require('express');
var controller = require('./reservationsBridge.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get(
  '/pending-bulletins',
  auth.isAuthenticated(),
  auth.hasRole('user'),
  controller.pendingBulletins
);

module.exports = router;
