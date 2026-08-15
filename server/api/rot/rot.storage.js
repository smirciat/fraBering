'use strict';

import fs from 'fs';
import path from 'path';
import localEnv from '../../config/local.env.js';

function findRepoRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(dir, 'Gruntfile.js')) &&
      fs.existsSync(path.join(dir, 'client')) &&
      fs.existsSync(path.join(dir, 'server'))
    ) {
      return dir;
    }
    let parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Persistent ROT document root — outside dist/ so grunt build does not wipe uploads. */
export function rotFileRoot() {
  let override = process.env.ROT_FILE_ROOT || localEnv.ROT_FILE_ROOT;
  if (override) return path.resolve(String(override));
  return path.join(findRepoRoot(), 'server/fileserver/rot');
}

function rotSubdir(name) {
  return path.join(rotFileRoot(), name);
}

function uniqueRoots(roots) {
  let seen = {};
  let out = [];
  roots.forEach(r => {
    let resolved = path.resolve(r);
    if (!seen[resolved]) {
      seen[resolved] = true;
      out.push(resolved);
    }
  });
  return out;
}

function rootCandidates(subdir) {
  let cwd = process.cwd();
  return uniqueRoots([
    rotSubdir(subdir),
    path.join(__dirname, '../../fileserver/rot', subdir),
    path.join(cwd, 'server/fileserver/rot', subdir),
    path.join(cwd, 'dist/server/fileserver/rot', subdir)
  ]);
}

export function safeRotFilename(filename) {
  let base = path.basename(String(filename || ''));
  if (!base || base === '.' || base === '..') return null;
  return base;
}

export function resolveRotFile(subdir, filename) {
  let safeName = safeRotFilename(filename);
  if (!safeName) return null;
  let roots = rootCandidates(subdir);
  for (let i = 0; i < roots.length; i++) {
    let root = path.resolve(roots[i]);
    let fullPath = path.resolve(path.join(root, safeName));
    if (!fullPath.startsWith(root + path.sep)) continue;
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

export function ensureRotDirs() {
  ['attachments', 'records', 'pdfs', 'fileserver'].forEach(name => {
    fs.mkdirSync(rotSubdir(name), {recursive: true});
  });
}
