'use strict';

import path from 'path';
import express from 'express';
import * as auth from '../../auth/auth.service';
import {resolveRotFile, ensureRotDirs} from './rot.storage.js';

var router = express.Router();

ensureRotDirs();

function sendRotFile(subdir) {
  return function(req, res) {
    let filename = req.query && req.query.filename;
    if (!filename) return res.status(400).json({message: 'filename query required'});
    let fullPath = resolveRotFile(subdir, filename);
    if (!fullPath) return res.status(404).json({message: 'File not found'});
    return res.sendFile(fullPath, err => {
      if (err) {
        console.log('rot file send error', subdir, filename, err);
        if (!res.headersSent) res.status(500).end();
      }
    });
  };
}

router.use(auth.isAuthenticated());

router.get('/attachments', sendRotFile('attachments'));
router.get('/records', sendRotFile('records'));
router.get('/pdfs', sendRotFile('pdfs'));
router.get('/fileserver', sendRotFile('fileserver'));

export default router;
