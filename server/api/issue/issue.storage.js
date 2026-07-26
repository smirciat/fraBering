'use strict';

import fs from 'fs';
import path from 'path';

var ISSUE_UPLOAD_ROOT = path.join(__dirname, '../../fileserver/issue-attachments');
var MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function issueAttachmentDir(issueId) {
  return path.join(ISSUE_UPLOAD_ROOT, String(issueId));
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
  var dir = issueAttachmentDir(attachment.issueId);
  var fullPath = path.resolve(path.join(dir, attachment.storedName));
  if (!fullPath.startsWith(path.resolve(dir))) {
    return null;
  }
  return fullPath;
}

export {MAX_ATTACHMENT_BYTES};
