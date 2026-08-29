'use strict';

var express = require('express');
var controller = require('./sm.controller');
import localEnv from '../../config/local.env.js';

var router = express.Router();

function incomingTokenSecret() {
  return process.env.FRAT_OPS_EXPORT_TOKEN || localEnv.FRAT_OPS_EXPORT_TOKEN || '';
}

function allowIncomingSms(req, res, next) {
  var secret = incomingTokenSecret();
  if (!secret) {
    return next();
  }
  var provided = req.get('x-frat-ops-export-token') || req.query.exportToken;
  if (provided && String(provided) === String(secret)) {
    return next();
  }
  console.warn('incoming sms rejected — invalid or missing FRAT ops export token');
  return res.status(401).json({message: 'Invalid export token'});
}

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);
router.post('/incoming', allowIncomingSms, controller.incoming);

module.exports = router;
