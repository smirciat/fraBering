'use strict';

import path from 'path';
import express from 'express';
import * as auth from '../../auth/auth.service';
import {resolveRotFile, ensureRotDirs} from './rot.storage.js';
import * as rotFirebase from './rot.firebase.controller';
import * as rotRecords from './rot.records.controller';
import * as rotFileserver from './rot.fileserver.controller';
import {requireRecordsAccess, requireRecordsAccessIfRecordsCollection} from './rot.access.js';

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

router.post('/firebase', rotFirebase.firebase);
router.post('/firebaseQuery', requireRecordsAccessIfRecordsCollection, rotFirebase.firebaseQuery);
router.post('/updateFirebase', requireRecordsAccessIfRecordsCollection, rotFirebase.updateFirebase);
router.post('/deleteFirebase', requireRecordsAccess, rotFirebase.deleteFirebase);

router.post('/listRecords', requireRecordsAccess, rotRecords.listRecords);
router.post('/uploadRecord', requireRecordsAccess, rotRecords.uploadRecord);
router.post('/changeFilename', requireRecordsAccess, rotRecords.changeFilename);
router.post('/deleteRecord', requireRecordsAccess, rotRecords.deleteRecord);

router.post('/listFileserver', rotFileserver.listFileserver);
router.post('/uploadFileserver', rotFileserver.uploadFileserver);
router.post('/deleteFileserver', rotFileserver.deleteFileserver);

router.get('/files/attachments', sendRotFile('attachments'));
router.get('/files/records', requireRecordsAccess, sendRotFile('records'));
router.get('/files/pdfs', sendRotFile('pdfs'));
router.get('/files/fileserver', sendRotFile('fileserver'));

export default router;
