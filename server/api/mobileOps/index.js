'use strict';

import express from 'express';
import * as auth from '../../auth/auth.service';
import {
  allowOpsExportAccess,
  authAssertion,
  getBoard,
  getFlight,
  patchFlight,
  patchFlightFuel,
  patchAirportRunway,
  removeReleaseFlight,
  signFlight,
} from './mobileOps.controller';
import { getGroundServices } from './ground-services.controller';

const router = express.Router();

router.post('/auth/assertion', allowOpsExportAccess, authAssertion);

router.get('/ground-services/export', allowOpsExportAccess, getGroundServices);
router.patch('/flights/:id/fuel/export', allowOpsExportAccess, patchFlightFuel);

router.use(auth.isAuthenticated());

router.get('/board', getBoard);
router.get('/ground-services', getGroundServices);
router.get('/flights/:id', getFlight);
router.patch('/flights/:id', patchFlight);
router.patch('/flights/:id/fuel', patchFlightFuel);
router.patch('/airport-requirements/:id/runway', patchAirportRunway);
router.post('/flights/:id/sign', signFlight);
router.post('/flights/:id/remove-release', removeReleaseFlight);

module.exports = router;
