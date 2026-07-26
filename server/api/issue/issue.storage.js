'use strict';

import fs from 'fs';
import path from 'path';

var MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function attachmentRootCandidates() {
  var cwd = process.cwd();
  return [
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

/** Where new issue uploads are written (runtime fileserver next to compiled API code). */
function primaryUploadRoot() {
  return path.resolve(path.join(__dirname, '../../fileserver/issue-attachments'));
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

  var fallbackDir = path.resolve(issueAttachmentDir(attachment.issueId));
  var fallbackPath = path.resolve(path.join(fallbackDir, storedName));
  if (!fallbackPath.startsWith(fallbackDir + path.sep) && fallbackPath !== fallbackDir) {
    return null;
  }
  return fallbackPath;
}

export {MAX_ATTACHMENT_BYTES};
