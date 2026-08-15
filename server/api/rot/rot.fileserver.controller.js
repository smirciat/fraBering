'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';

function fileserverDir() {
  return path.join(rotFileRoot(), 'fileserver');
}

function resolveFileserverPath(filename) {
  let safeName = safeRotFilename(filename);
  if (!safeName) return null;
  let root = path.resolve(fileserverDir());
  let fullPath = path.resolve(path.join(root, safeName));
  if (!fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

export function listFileserver(req, res) {
  try {
    let folder = fileserverDir();
    fs.mkdirSync(folder, {recursive: true});
    let files = fs.readdirSync(folder).filter(file => file && file.charAt(0) !== '.');
    return res.status(200).json(JSON.stringify(files));
  } catch (err) {
    console.error('rot listFileserver error', err);
    return res.status(500).json({message: 'Could not list fileserver files'});
  }
}

export function uploadFileserver(req, res) {
  try {
    let file = Buffer.from(req.body.data, 'base64');
    let filename = safeRotFilename(req.body.filename);
    if (!filename) return res.status(400).json({message: 'Invalid filename'});
    let fullPath = resolveFileserverPath(filename);
    if (!fullPath) return res.status(400).json({message: 'Invalid filename'});
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, file);
    return res.status(200).json('Response Text');
  } catch (err) {
    console.error('rot uploadFileserver error', err);
    return res.status(500).json({message: 'Upload failed'});
  }
}

export function deleteFileserver(req, res) {
  try {
    let fullPath = resolveFileserverPath(req.body.filename);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({message: 'File not found'});
    }
    fs.unlinkSync(fullPath);
    return res.status(200).json('File Deleted');
  } catch (err) {
    console.error('rot deleteFileserver error', err);
    return res.status(500).json({message: 'Delete failed'});
  }
}
