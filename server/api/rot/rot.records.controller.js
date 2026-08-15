'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';

function recordsDir() {
  return path.join(rotFileRoot(), 'records');
}

function resolveRecordPath(filename) {
  let safeName = safeRotFilename(filename);
  if (!safeName) return null;
  let root = path.resolve(recordsDir());
  let fullPath = path.resolve(path.join(root, safeName));
  if (!fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

export function listRecords(req, res) {
  try {
    let folder = recordsDir();
    fs.mkdirSync(folder, {recursive: true});
    let files = fs.readdirSync(folder).filter(file => file && file.charAt(0) !== '.');
    return res.status(200).json(JSON.stringify(files));
  } catch (err) {
    console.error('rot listRecords error', err);
    return res.status(500).json({message: 'Could not list record files'});
  }
}

export function uploadRecord(req, res) {
  try {
    let file = Buffer.from(req.body.data, 'base64');
    let filename = safeRotFilename(req.body.filename);
    if (!filename) return res.status(400).json({message: 'Invalid filename'});
    let fullPath = resolveRecordPath(filename);
    if (!fullPath) return res.status(400).json({message: 'Invalid filename'});
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, file);
    return res.status(200).json('Response Text');
  } catch (err) {
    console.error('rot uploadRecord error', err);
    return res.status(500).json({message: 'Upload failed'});
  }
}

export function changeFilename(req, res) {
  if (!req.body.filename || !req.body.newName) {
    return res.status(400).json({message: 'Please include filename and newName'});
  }
  let oldPath = resolveRecordPath(req.body.filename);
  let newPath = resolveRecordPath(req.body.newName);
  if (!oldPath || !newPath) return res.status(400).json({message: 'Invalid filename'});
  try {
    fs.renameSync(oldPath, newPath);
    return res.status(200).json('File Updated');
  } catch (err) {
    console.error('rot changeFilename error', err);
    return res.status(500).json({message: 'Unable to update filename'});
  }
}

export function deleteRecord(req, res) {
  try {
    let fullPath = resolveRecordPath(req.body.filename);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({message: 'File not found'});
    }
    fs.unlinkSync(fullPath);
    return res.status(200).json('File Deleted');
  } catch (err) {
    console.error('rot deleteRecord error', err);
    return res.status(500).json({message: 'Delete failed'});
  }
}
