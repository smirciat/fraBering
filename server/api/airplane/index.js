'use strict';

var express = require('express');
var controller = require('./airplane.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);
router.post('/firebase',controller.firebase);
router.post('/firebaseLimited',controller.firebaseLimited);
router.post('/updateFirebase',controller.updateFirebase);
module.exports = router;
