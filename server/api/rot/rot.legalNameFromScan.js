'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
const legalNameParse = require('./rot.legalNameParse.lib.js');
const certScanOcr = require('./rot.certScanOcr.lib.js');
const parseLegalNameFromDocumentText = legalNameParse.parseLegalNameFromDocumentText;
const pickCertScanFilename = legalNameParse.pickCertScanFilename;
const pickCertScanFilenames = legalNameParse.pickCertScanFilenames;

/** Hard limit — file skipped entirely (fallback to other CERT). */
const MAX_CERT_READ_BYTES = 15 * 1024 * 1024;
/** Above this size, skip pdftoppm / Tesseract OCR on this file. */
const MAX_OCR_BYTES = 3 * 1024 * 1024;

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

function isImageCertFile(filename) {
  return /\.(jpe?g)$/i.test(filename || '');
}

/** On-file CERT uploads are scanned images (JPEG or image PDF) — OCR only, no pdf-parse. */
function isCertScanUpload(filename) {
  if (isImageCertFile(filename)) return true;
  return /_CERT_(Medical|Certificate)_/i.test(filename || '');
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

function runOcrOnCertFile(filename, buf, documentKind, rosterName, ocrTooLarge) {
  if (ocrTooLarge) {
    return Promise.resolve(
      buildResult(
        {
          sourceFile: filename,
          documentKind: documentKind,
          method: null,
          reason: 'ocr_skipped_too_large',
          ocrAttempted: false
        },
        null
      )
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
  if (stat.size > MAX_CERT_READ_BYTES) {
    return Promise.resolve(
      buildResult(
        {sourceFile: filename, reason: 'file_too_large', ocrAttempted: false},
        null
      )
    );
  }
  let buf = fs.readFileSync(fullPath);
  let documentKind = /_CERT_Medical_/i.test(filename) ? 'medical' : 'certificate';
  let ocrTooLarge = stat.size > MAX_OCR_BYTES;

  if (isCertScanUpload(filename)) {
    return runOcrOnCertFile(filename, buf, documentKind, rosterName, ocrTooLarge);
  }

  // Non-standard CERT filename — rare; try text layer then OCR.
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    return runOcrOnCertFile(filename, buf, documentKind, rosterName, ocrTooLarge);
  }
  return pdfParse(buf)
    .then(data => {
      let text = data && data.text ? data.text : '';
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
      return runOcrOnCertFile(filename, buf, documentKind, rosterName, ocrTooLarge);
    })
    .catch(err => {
      console.error('rot infer pdf-parse error', filename, err);
      return runOcrOnCertFile(filename, buf, documentKind, rosterName, ocrTooLarge);
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
