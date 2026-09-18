'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
const legalNameParse = require('./rot.legalNameParse.lib.js');
const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const pickCertScanFilename = legalNameParse.pickCertScanFilename;

function recordsDir() {
  return path.join(rotFileRoot(), 'records');
}

export {parseLegalNameFromDocumentText, pickCertScanFilename};

function resolveRecordPath(filename) {
  let safeName = safeRotFilename(filename);
  if (!safeName) return null;
  let root = path.resolve(recordsDir());
  let fullPath = path.resolve(path.join(root, safeName));
  if (!fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

function extractPdfText(buffer) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    return Promise.reject(new Error('pdf-parse is not installed on the server'));
  }
  return pdfParse(buffer).then(data => (data && data.text) ? data.text : '');
}

export function inferLegalNameFromScanFiles(fileNames, pilotId, rosterName) {
  let filename = pickCertScanFilename(fileNames, pilotId);
  if (!filename) {
    return Promise.resolve({
      legalName: null,
      sourceFile: null,
      reason: 'no_cert_pdf',
      lastNameMatch: false
    });
  }
  let fullPath = resolveRecordPath(filename);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return Promise.resolve({
      legalName: null,
      sourceFile: filename,
      reason: 'file_missing',
      lastNameMatch: false
    });
  }
  let buf = fs.readFileSync(fullPath);
  return extractPdfText(buf).then(text => {
    let legalName = parseLegalNameFromDocumentText(text, rosterName);
    return {
      legalName: legalName,
      sourceFile: filename,
      reason: legalName ? 'parsed' : 'no_text_match',
      lastNameMatch: !!legalName,
      documentKind: /_CERT_Medical_/i.test(filename) ? 'medical' : 'certificate'
    };
  });
}
