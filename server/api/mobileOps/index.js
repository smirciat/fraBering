'use strict';

import express from 'express';
import * as auth from '../../auth/auth.service';
import {
  allowOpsExportAccess,
  authAssertion,
  getBoard,
  getFlight,
  patchFlight,
  removeReleaseFlight,
  signFlight,
} from './mobileOps.controller';

const router = express.Router();

router.post('/auth/assertion', allowOpsExportAccess, authAssertion);

router.use(auth.isAuthenticated());

router.get('/board', getBoard);
router.get('/flights/:id', getFlight);
router.patch('/flights/:id', patchFlight);
router.post('/flights/:id/sign', signFlight);
router.post('/flights/:id/remove-release', removeReleaseFlight);

module.exports = router;
