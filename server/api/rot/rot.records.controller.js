'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
import {inferLegalNameFromScanFiles} from './rot.legalNameFromScan.js';
import {listRecordSummaries} from './rot.firebase.controller';
import {inferMedicalFromScanFiles} from './rot.medicalFromScan.js';

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

function associatedRecordIds(files) {
  const ids = new Set();
  files.forEach(name => {
    const match = String(name).match(/associated_([^_]+)_/);
    if (match) ids.add(match[1]);
  });
  return ids;
}

function queueSort(a, b) {
  const ad = Date.parse(a.date) || 0;
  const bd = Date.parse(b.date) || 0;
  return bd - ad;
}

export async function recordsQueue(req, res) {
  try {
    let folder = recordsDir();
    fs.mkdirSync(folder, {recursive: true});
    let files = fs.readdirSync(folder).filter(file => file && file.charAt(0) !== '.');
    let linked = associatedRecordIds(files);
    let summary = await listRecordSummaries(8000);
    let pending = [];
    let approvedWithoutFile = [];
    summary.rows.forEach(row => {
      if (!row.approved) pending.push(row);
      else if (!linked.has(String(row._id))) approvedWithoutFile.push(row);
    });
    pending.sort(queueSort);
    approvedWithoutFile.sort(queueSort);
    return res.status(200).json({
      pending: pending,
      approvedWithoutFile: approvedWithoutFile,
      truncated: summary.truncated
    });
  } catch (err) {
    console.error('rot recordsQueue error', err);
    return res.status(500).json({message: 'Could not build the records queue'});
  }
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

export function inferLegalName(req, res) {
  try {
    let pilotId = req.body && req.body.pilotId;
    let rosterName = req.body && req.body.rosterName;
    if (!pilotId || !rosterName) {
      return res.status(400).json({message: 'pilotId and rosterName are required'});
    }
    let folder = recordsDir();
    fs.mkdirSync(folder, {recursive: true});
    let files = fs.readdirSync(folder).filter(file => file && file.charAt(0) !== '.');
    return inferLegalNameFromScanFiles(files, pilotId, rosterName)
      .then(result => res.status(200).json(result))
      .catch(err => {
        console.error('rot inferLegalName error', err);
        return res.status(500).json({message: err.message || 'Could not infer legal name'});
      });
  } catch (err) {
    console.error('rot inferLegalName error', err);
    return res.status(500).json({message: 'Could not infer legal name'});
  }
}

export function inferMedical(req, res) {
  try {
    let pilotId = req.body && req.body.pilotId;
    let filename = req.body && req.body.filename;
    if (!pilotId) {
      return res.status(400).json({message: 'pilotId is required'});
    }
    let folder = recordsDir();
    fs.mkdirSync(folder, {recursive: true});
    let files = fs.readdirSync(folder).filter(file => file && file.charAt(0) !== '.');
    return inferMedicalFromScanFiles(files, pilotId, filename)
      .then(result => res.status(200).json(result))
      .catch(err => {
        console.error('rot inferMedical error', err);
        return res.status(500).json({message: err.message || 'Could not read medical from scan'});
      });
  } catch (err) {
    console.error('rot inferMedical error', err);
    return res.status(500).json({message: 'Could not read medical from scan'});
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
