'use strict';

import express from 'express';
import * as auth from '../../auth/auth.service';
import * as controller from './mobileOps.controller';

const router = express.Router();

router.post('/auth/assertion', controller.allowOpsExportAccess, controller.authAssertion);

router.use(auth.isAuthenticated());

router.get('/board', controller.getBoard);
router.get('/flights/:id', controller.getFlight);
router.post('/flights/:id/sign', controller.signFlight);

module.exports = router;
