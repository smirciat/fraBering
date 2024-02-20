'use strict';

var express = require('express');
var controller = require('./timesheet.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get('/', auth.hasRole('admin'), controller.index);
router.get('/ip', auth.hasRole('admin'), controller.sba);
router.post('/current', auth.hasRole('admin'), controller.show);
router.post('/', auth.hasRole('admin'), controller.create);
router.post('/user', auth.hasRole('admin'), controller.user);
router.post('/all', auth.hasRole('admin'), controller.allUsers);
router.put('/:id', auth.hasRole('admin'), controller.update);
router.patch('/:id', auth.hasRole('admin'), controller.update);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);

module.exports = router;
