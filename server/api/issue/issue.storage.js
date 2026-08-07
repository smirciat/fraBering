'use strict';

import fs from 'fs';
import path from 'path';
import localEnv from '../../config/local.env.js';

var MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

/**
 * Repo root (Gruntfile + client/ + server/), not dist/. Uploads must live
 * outside dist/ because `grunt build` runs clean:dist and wipes runtime files there.
 */
function findRepoRoot() {
  var dir = __dirname;
  for (var i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(dir, 'Gruntfile.js')) &&
      fs.existsSync(path.join(dir, 'client')) &&
      fs.existsSync(path.join(dir, 'server'))
    ) {
      return dir;
    }
    var parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
}

/** Persistent upload directory — survives grunt build / dist clean. */
function persistentAttachmentRoot() {
  var override = process.env.ISSUE_ATTACHMENT_ROOT || localEnv.ISSUE_ATTACHMENT_ROOT;
  if (override) {
    return path.resolve(String(override));
  }
  return path.join(findRepoRoot(), 'server/fileserver/issue-attachments');
}

function attachmentRootCandidates() {
  var cwd = process.cwd();
  return [
    persistentAttachmentRoot(),
    path.join(__dirname, '../../fileserver/issue-attachments'),
    path.join(cwd, 'server/fileserver/issue-attachments'),
    path.join(cwd, 'dist/server/fileserver/issue-attachments')
  ];
}

function uniqueRoots(roots) {
  var seen = {};
  var out = [];
  roots.forEach(function(r) {
    var resolved = path.resolve(r);
    if (!seen[resolved]) {
      seen[resolved] = true;
      out.push(resolved);
    }
  });
  return out;
}

function primaryUploadRoot() {
  return path.resolve(persistentAttachmentRoot());
}

export function issueAttachmentDir(issueId) {
  return path.join(primaryUploadRoot(), String(issueId));
}

export function safeOriginalName(name) {
  var base = path.basename(String(name || 'screenshot.png'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'screenshot.png';
}

export function writeAttachmentFiles(issueId, files) {
  var dir = issueAttachmentDir(issueId);
  fs.mkdirSync(dir, {recursive: true});
  var written = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var buffer = file.buffer;
    if (!buffer || !buffer.length) {
      continue;
    }
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error('Attachment too large (max 8MB per file)');
    }
    var storedName = Date.now() + '-' + i + '-' + safeOriginalName(file.originalName);
    var fullPath = path.join(dir, storedName);
    fs.writeFileSync(fullPath, buffer);
    written.push({
      originalName: file.originalName || storedName,
      storedName: storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      sizeBytes: buffer.length
    });
  }

  return written;
}

export function resolveAttachmentPath(attachment) {
  var issueId = String(attachment.issueId);
  var storedName = attachment.storedName;
  var roots = uniqueRoots(attachmentRootCandidates());

  for (var i = 0; i < roots.length; i++) {
    var root = roots[i];
    var dir = path.resolve(path.join(root, issueId));
    var fullPath = path.resolve(path.join(dir, storedName));
    if (!fullPath.startsWith(dir + path.sep) && fullPath !== dir) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

export {MAX_ATTACHMENT_BYTES};
