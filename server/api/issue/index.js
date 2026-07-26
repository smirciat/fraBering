'use strict';

var express = require('express');
var controller = require('./issue.controller');
import * as auth from '../../auth/auth.service';
import localEnv from '../../config/local.env.js';

var router = express.Router();

function exportTokenSecret() {
  return process.env.ISSUES_EXPORT_TOKEN || localEnv.ISSUES_EXPORT_TOKEN || '';
}

function allowAgentSummaryAccess(req, res, next) {
  var secret = exportTokenSecret();
  if (secret) {
    var provided = req.get('x-issues-export-token') || req.query.exportToken;
    if (provided && String(provided) === String(secret)) {
      return next();
    }
    return res.status(401).json({message: 'Invalid export token'});
  }
  return auth.hasRole('admin')(req, res, next);
}

router.get('/agent-summary', allowAgentSummaryAccess, controller.agentSummary);

router.use(auth.hasRole('user'));

router.get('/', controller.index);
router.get('/attachments/:attachmentId', controller.serveAttachment);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.post('/:id/comments', controller.addComment);
router.post('/:id/attachments', controller.addAttachments);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);

module.exports = router;
