'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
const legalNameParse = require('./rot.legalNameParse.lib.js');
const certScanOcr = require('./rot.certScanOcr.lib.js');
const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const pickCertScanFilename = legalNameParse.pickCertScanFilename;
const pickCertScanFilenames = legalNameParse.pickCertScanFilenames;

const MAX_CERT_BYTES = 15 * 1024 * 1024;

function recordsDir() {
  return path.join(rotFileRoot(), 'records');
}

export {parseLegalNameFromDocumentText, pickCertScanFilename, pickCertScanFilenames};

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

function withOcrFailure(filename, documentKind, promise) {
  return promise.catch(err => {
    console.error('rot infer OCR error', filename, err);
    return {legalName: null, reason: 'ocr_failed'};
  });
}

function inferLegalNameFromOneFile(filename, rosterName) {
  let fullPath = resolveRecordPath(filename);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return Promise.resolve(
      buildResult(
        {sourceFile: filename, reason: 'file_missing'},
        null
      )
    );
  }
  let stat = fs.statSync(fullPath);
  if (stat.size > MAX_CERT_BYTES) {
    return Promise.resolve(
      buildResult(
        {sourceFile: filename, reason: 'file_too_large'},
        null
      )
    );
  }
  let buf = fs.readFileSync(fullPath);
  let documentKind = /_CERT_Medical_/i.test(filename) ? 'medical' : 'certificate';

  if (isImageCertFile(filename)) {
    return withOcrFailure(
      filename,
      documentKind,
      tryOcr(buf, filename, rosterName)
    ).then(ocr => {
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
      return withOcrFailure(
        filename,
        documentKind,
        tryOcr(buf, filename, rosterName)
      ).then(ocr => {
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
      console.error('rot infer pdf-parse error', filename, err);
      return withOcrFailure(
        filename,
        documentKind,
        tryOcr(buf, filename, rosterName)
      ).then(ocr => {
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

function inferNextFile(filenames, rosterName, priorAttempts) {
  if (!filenames.length) {
    let last = priorAttempts[priorAttempts.length - 1];
    if (last) {
      return Promise.resolve(
        Object.assign({}, last, {
          alsoTriedSources: priorAttempts.slice(0, -1).map(a => a.sourceFile).filter(Boolean)
        })
      );
    }
    return Promise.resolve(buildResult({sourceFile: null, reason: 'no_cert_pdf'}, null));
  }
  let filename = filenames[0];
  let rest = filenames.slice(1);
  return inferLegalNameFromOneFile(filename, rosterName).then(result => {
    if (result.legalName) {
      if (priorAttempts.length) {
        result.fallbackFromSources = priorAttempts.map(a => a.sourceFile).filter(Boolean);
      }
      return result;
    }
    return inferNextFile(rest, rosterName, priorAttempts.concat([result]));
  });
}

export function inferLegalNameFromScanFiles(fileNames, pilotId, rosterName) {
  let filenames = pickCertScanFilenames(fileNames, pilotId);
  if (!filenames.length) {
    return Promise.resolve(
      buildResult(
        {sourceFile: null, reason: 'no_cert_pdf'},
        null
      )
    );
  }
  return inferNextFile(filenames, rosterName, []);
}
