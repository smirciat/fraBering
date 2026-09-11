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
  ['attachments', 'records', 'pdfs', 'fileserver', 'fdr'].forEach(name => {
    fs.mkdirSync(rotSubdir(name), {recursive: true});
  });
}

const FDR_WORKBOOK_NAMES = [
  'Flight&DutyRecordReport.xls',
  'Flight&DutyRecordReport.xlsx',
  'Flight and Duty Record Report.xls',
  'Flight and Duty Record Report.xlsx'
];

/** Master FDR spreadsheet — uploads/ on dev; server/fileserver/rot/fdr or FDR_WORKBOOK_PATH on prod. */
export function resolveFdrWorkbookPath() {
  let override = process.env.FDR_WORKBOOK_PATH || localEnv.FDR_WORKBOOK_PATH;
  if (override) {
    let resolved = path.resolve(String(override));
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  let root = findRepoRoot();
  let dirs = uniqueRoots([
    path.join(root, 'uploads'),
    path.join(root, 'server/fileserver/fdr'),
    rotSubdir('fdr')
  ]);
  for (let d = 0; d < dirs.length; d++) {
    for (let n = 0; n < FDR_WORKBOOK_NAMES.length; n++) {
      let candidate = path.join(dirs[d], FDR_WORKBOOK_NAMES[n]);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}
