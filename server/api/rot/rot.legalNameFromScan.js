'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
const legalNameParse = require('./rot.legalNameParse.lib.js');
const certScanOcr = require('./rot.certScanOcr.lib.js');
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

function isImageCertFile(filename) {
  return /\.(jpe?g)$/i.test(filename || '');
}

function buildResult(base, legalName, extra) {
  return Object.assign(
    {
      legalName: legalName || null,
      lastNameMatch: !!legalName
    },
    base,
    extra || {}
  );
}

function tryOcr(buf, filename, rosterName) {
  if (isImageCertFile(filename)) {
    return certScanOcr.ocrCertImageBuffer(buf, rosterName);
  }
  return certScanOcr.ocrCertPdfBuffer(buf, rosterName);
}

export function inferLegalNameFromScanFiles(fileNames, pilotId, rosterName) {
  let filename = pickCertScanFilename(fileNames, pilotId);
  if (!filename) {
    return Promise.resolve(
      buildResult(
        {sourceFile: null, reason: 'no_cert_pdf'},
        null
      )
    );
  }
  let fullPath = resolveRecordPath(filename);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return Promise.resolve(
      buildResult(
        {sourceFile: filename, reason: 'file_missing'},
        null
      )
    );
  }
  let buf = fs.readFileSync(fullPath);
  let documentKind = /_CERT_Medical_/i.test(filename) ? 'medical' : 'certificate';

  if (isImageCertFile(filename)) {
    return tryOcr(buf, filename, rosterName).then(ocr => {
      return buildResult(
        {
          sourceFile: filename,
          documentKind: documentKind,
          method: ocr.legalName ? 'ocr' : null,
          reason: ocr.reason,
          ocrAttempted: true
        },
        ocr.legalName
      );
    });
  }

  return extractPdfText(buf)
    .then(text => {
      let legalName = parseLegalNameFromDocumentText(text, rosterName);
      if (legalName) {
        return buildResult(
          {
            sourceFile: filename,
            documentKind: documentKind,
            method: 'pdf_text',
            reason: 'parsed'
          },
          legalName
        );
      }
      return tryOcr(buf, filename, rosterName).then(ocr => {
        return buildResult(
          {
            sourceFile: filename,
            documentKind: documentKind,
            method: ocr.legalName ? 'ocr' : null,
            reason: ocr.legalName ? 'ocr' : ocr.reason,
            ocrAttempted: true
          },
          ocr.legalName
        );
      });
    })
    .catch(err => {
      return tryOcr(buf, filename, rosterName).then(ocr => {
        return buildResult(
          {
            sourceFile: filename,
            documentKind: documentKind,
            method: ocr.legalName ? 'ocr' : null,
            reason: ocr.legalName ? 'ocr' : ocr.reason || 'pdf_read_failed',
            ocrAttempted: true
          },
          ocr.legalName
        );
      });
    });
}
