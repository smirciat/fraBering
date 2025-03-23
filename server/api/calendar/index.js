'use strict';

var express = require('express');
var controller = require('./calendar.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get('/', auth.hasRole('user'), controller.index);
router.get('/:id', auth.hasRole('user'), controller.show);
router.post('/', auth.hasRole('user'), controller.create);
router.post('/month', auth.hasRole('user'), controller.month);
router.put('/:id', auth.hasRole('user'), controller.update);
router.patch('/:id', auth.hasRole('user'), controller.update);
router.delete('/:id', auth.hasRole('user'), controller.destroy);

module.exports = router;
