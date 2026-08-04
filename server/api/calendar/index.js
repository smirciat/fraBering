'use strict';

var express = require('express');
var controller = require('./calendar.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get('/', auth.hasRole('user'), controller.index);
router.get('/:id', auth.hasRole('user'), controller.show);
router.post('/', auth.hasRole('user'), controller.create);
router.post('/rosterDay', auth.hasRole('user'), controller.rosterDay);
router.post('/rosterMonth', auth.hasRole('user'), controller.rosterMonth);
router.post('/rosterScheduleLocal', auth.hasRole('user'), controller.rosterScheduleLocal);
router.post('/rosterScheduleSave', auth.hasRole('user'), controller.rosterScheduleSave);
router.post('/rosterEmployees', auth.hasRole('user'), controller.rosterEmployees);
router.post('/rosterEmployeeSave', auth.hasRole('user'), controller.rosterEmployeeSave);
router.post('/rosterEmployeeDelete', auth.hasRole('user'), controller.rosterEmployeeDelete);
router.post('/rosterEmployeesImportFromAcroroster', auth.hasRole('user'), controller.rosterEmployeesImportFromAcroroster);
router.post('/rosterScheduleLocalImport', auth.hasRole('user'), controller.rosterScheduleLocalImport);
router.post('/rosterPersonMonth', auth.hasRole('user'), controller.rosterPersonMonth);
router.post('/rosterCalendarSave', auth.hasRole('user'), controller.rosterCalendarSave);
router.post('/rosterMonthFirebase', auth.hasRole('user'), controller.rosterMonthFirebase);
router.post('/rosterMonthFirebaseImport', auth.hasRole('user'), controller.rosterMonthFirebaseImport);
router.post('/month', auth.hasRole('user'), controller.month);
router.put('/:id', auth.hasRole('user'), controller.update);
router.patch('/:id', auth.hasRole('user'), controller.update);
router.delete('/:id', auth.hasRole('user'), controller.destroy);

module.exports = router;
