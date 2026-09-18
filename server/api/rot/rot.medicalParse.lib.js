'use strict';

function parseUsDateParts(m, d, y) {
  let month = parseInt(m, 10);
  let day = parseInt(d, 10);
  let year = parseInt(y, 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let dt = new Date(year, month - 1, day);
  if (isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return month + '/' + day + '/' + year;
}

function normalizeMedicalOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[|]/g, 'I')
    .replace(/[ \t]+/g, ' ');
}

function parseMedicalClass(upper) {
  if (!upper) return null;
  if (/\b(1ST|FIRST)[\s\-]*CLASS\b/.test(upper) || /\bCLASS\s*I\b/.test(upper)) return 'FIRST';
  if (/\b(2ND|SECOND)[\s\-]*CLASS\b/.test(upper) || /\bCLASS\s*II\b/.test(upper)) return 'SECOND';
  if (/\b(3RD|THIRD)[\s\-]*CLASS\b/.test(upper) || /\bCLASS\s*III\b/.test(upper)) return 'SECOND';
  return null;
}

function firstDateAfterLabel(upper, labels) {
  for (let i = 0; i < labels.length; i++) {
    let label = labels[i];
    let idx = upper.indexOf(label);
    if (idx < 0) continue;
    let slice = upper.slice(idx, idx + 140);
    let dm = slice.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (dm) {
      let parsed = parseUsDateParts(dm[1], dm[2], dm[3]);
      if (parsed) return parsed;
    }
  }
  return null;
}

function parseMedicalFromOcrText(text) {
  let norm = normalizeMedicalOcrText(text);
  let upper = norm.toUpperCase();
  if (!upper.trim()) {
    return {reason: 'empty_text'};
  }

  let medicalDate =
    firstDateAfterLabel(upper, ['DATE OF EXAMINATION', 'DATE OF EXAM', 'EXAMINATION DATE', 'EXAM DATE']) ||
    firstDateAfterLabel(upper, ['DATE ISSUED', 'ISSUE DATE', 'ISSUED ON']);

  let medicalClass = parseMedicalClass(upper);

  let expirationDate = firstDateAfterLabel(upper, [
    'EXPIRATION DATE',
    'EXPIRES ON',
    'EXPIRATION',
    'VALID UNTIL'
  ]);

  if (!medicalDate && !medicalClass) {
    return {
      reason: 'parse_no_medical_fields',
      ocrTextSample: norm.slice(0, 400)
    };
  }

  if (!medicalClass) medicalClass = 'FIRST';

  return {
    medicalDate: medicalDate || null,
    medicalClass: medicalClass,
    expirationDate: expirationDate || null,
    reason: medicalDate ? 'parsed' : 'class_only',
    ocrTextSample: norm.slice(0, 400)
  };
}

/** Higher = better OCR candidate when trying 0/90/180/270° rotations. */
function scoreMedicalOcrText(text) {
  let parsed = parseMedicalFromOcrText(text);
  let score = 0;
  if (parsed.medicalDate) score += 100;
  if (parsed.medicalClass) score += 40;
  if (parsed.expirationDate) score += 10;
  if (parsed.reason !== 'parse_no_medical_fields' && parsed.reason !== 'empty_text') {
    return score;
  }
  let upper = normalizeMedicalOcrText(text).toUpperCase();
  if (upper.indexOf('MEDICAL') > -1) score += 8;
  if (upper.indexOf('FAA') > -1) score += 4;
  if (/\bDATE\s+OF\s+EXAM/.test(upper)) score += 12;
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(upper)) score += 15;
  let alnum = upper.replace(/[^A-Z0-9]/g, '');
  if (alnum.length > 40) score += 5;
  return score;
}

module.exports = {
  parseMedicalFromOcrText,
  parseUsDateParts,
  scoreMedicalOcrText
};
