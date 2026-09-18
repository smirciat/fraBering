'use strict';

import fs from 'fs';
import path from 'path';
import {rotFileRoot, safeRotFilename} from './rot.storage.js';
const certScanOcr = require('./rot.certScanOcr.lib.js');
const medicalParse = require('./rot.medicalParse.lib.js');

const MAX_CERT_READ_BYTES = 15 * 1024 * 1024;
const MAX_OCR_BYTES = 800 * 1024;

function recordsDir() {
  return path.join(rotFileRoot(), 'records');
}

function resolveRecordPath(filename) {
  let safeName = safeRotFilename(filename);
  if (!safeName) return null;
  let root = path.resolve(recordsDir());
  let fullPath = path.resolve(path.join(root, safeName));
  if (!fullPath.startsWith(root + path.sep)) return null;
  return fullPath;
}

function fileDateSortKey(filename) {
  let parts = String(filename || '').split('_');
  let d = parts[1];
  if (!/^\d{8}$/.test(d)) return 0;
  return parseInt(d, 10) || 0;
}

function pickMedicalFilename(fileNames, pilotId, preferredFilename) {
  if (preferredFilename) {
    let safe = safeRotFilename(preferredFilename);
    if (safe && /_CERT_Medical_/i.test(safe)) {
      let id = String(pilotId || '').trim();
      if (id && safe.indexOf(id + '_') === 0) return safe;
    }
  }
  let pool = (fileNames || []).filter(f => {
    if (!f || String(pilotId) + '_' !== f.substring(0, String(pilotId).length + 1)) return false;
    return /_CERT_Medical_/i.test(f);
  });
  if (!pool.length) return null;
  pool.sort((a, b) => fileDateSortKey(b) - fileDateSortKey(a));
  return pool[0];
}

function buildResult(base, parsed) {
  return Object.assign(
    {
      medicalDate: null,
      medicalClass: null,
      expirationDate: null,
      sourceFile: null,
      ocrAttempted: false
    },
    base,
    parsed || {}
  );
}

export function inferMedicalFromScanFiles(fileNames, pilotId, preferredFilename) {
  let filename = pickMedicalFilename(fileNames, pilotId, preferredFilename);
  if (!filename) {
    return Promise.resolve(buildResult({reason: 'no_medical_cert', sourceFile: null}));
  }

  let fullPath = resolveRecordPath(filename);
  if (!fullPath || !fs.existsSync(fullPath)) {
    return Promise.resolve(buildResult({reason: 'file_missing', sourceFile: filename}));
  }

  let stat = fs.statSync(fullPath);
  if (stat.size > MAX_CERT_READ_BYTES) {
    return Promise.resolve(
      buildResult({reason: 'file_too_large', sourceFile: filename, ocrAttempted: false})
    );
  }
  if (stat.size > MAX_OCR_BYTES) {
    return Promise.resolve(
      buildResult({reason: 'ocr_skipped_too_large', sourceFile: filename, ocrAttempted: false})
    );
  }

  return certScanOcr.ocrCertUploadRawText(fullPath, filename).then(ocr => {
    if (!ocr.text || ocr.reason !== 'ocr') {
      return buildResult({
        reason: ocr.reason || 'ocr_failed',
        sourceFile: filename,
        ocrAttempted: true
      });
    }
    let parsed = medicalParse.parseMedicalFromOcrText(ocr.text);
    if (!parsed.medicalDate && parsed.reason === 'parse_no_medical_fields') {
      return buildResult({
        reason: 'parse_no_medical_fields',
        sourceFile: filename,
        ocrAttempted: true,
        ocrTextSample: parsed.ocrTextSample || ''
      });
    }
    return buildResult({
      reason: parsed.reason || 'parsed',
      sourceFile: filename,
      ocrAttempted: true,
      medicalDate: parsed.medicalDate,
      medicalClass: parsed.medicalClass,
      expirationDate: parsed.expirationDate || null,
      ocrTextSample: parsed.ocrTextSample || ocr.text.slice(0, 400)
    });
  });
}
