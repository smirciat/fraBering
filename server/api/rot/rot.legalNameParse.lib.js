'use strict';

function rosterLastName(rosterName) {
  let parts = String(rosterName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts[parts.length - 1].toLowerCase();
}

function titleCaseWords(str) {
  return String(str || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function lastTokenMatches(nameLine, rosterName) {
  let last = rosterLastName(rosterName);
  if (!last) return false;
  let parts = String(nameLine || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return false;
  return parts[parts.length - 1].toLowerCase() === last;
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/[|]/g, 'I')
    .replace(/[—–]/g, '-')
    .replace(/[^\S\nA-Za-z'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const OCR_NAME_STOP_WORDS = {
  faa: 1,
  medical: 1,
  name: 1,
  dob: 1,
  class: 1,
  certificate: 1,
  first: 1,
  second: 1,
  third: 1,
  date: 1,
  of: 1,
  birth: 1,
  and: 1,
  address: 1
};

function isPersonNameToken(word) {
  let w = String(word || '').trim();
  if (!w) return false;
  if (/[):;@#]/.test(w)) return false;
  if (/^[A-Za-z]\.?$/.test(w)) return true;
  return /^[A-Za-z][A-Za-z'\-]*\.?$/.test(w) && w.length >= 2;
}

/** Drop FAA label junk (e.g. "And Address): Kaleb D Janke"). */
function scrubNameCandidate(raw) {
  let parts = String(raw || '').split(/\s+/).filter(Boolean);
  while (parts.length) {
    let low = parts[0].toLowerCase().replace(/[^a-z]/g, '');
    if (OCR_NAME_STOP_WORDS[low] || !isPersonNameToken(parts[0])) {
      parts.shift();
      continue;
    }
    break;
  }
  while (parts.length && !isPersonNameToken(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join(' ');
}

/** Anchor on roster last name — helpful for noisy OCR. */
function parseLegalNameFromLastNameAnchor(text, rosterName) {
  let last = rosterLastName(rosterName);
  if (!last || !text) return null;
  let parts = String(text).split(/\s+/).filter(Boolean);
  let lastIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase().replace(/[^a-z]/g, '') === last) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx < 1) return null;
  let start = Math.max(0, lastIdx - 5);
  let slice = parts.slice(start, lastIdx + 1);
  while (slice.length > 2 && OCR_NAME_STOP_WORDS[slice[0].toLowerCase()]) {
    slice = slice.slice(1);
  }
  if (slice.length < 2) return null;
  let c = titleCaseWords(scrubNameCandidate(slice.join(' ')));
  if (!c || !lastTokenMatches(c, rosterName)) return null;
  return c;
}

function parseLegalNameFromDocumentText(text, rosterName, options) {
  options = options || {};
  if (!text || !rosterName) return null;
  let last = rosterLastName(rosterName);
  if (!last) return null;

  let best = null;
  let bestLen = 0;

  function consider(candidate) {
    let c = scrubNameCandidate(String(candidate || '').replace(/\s+/g, ' ').trim());
    if (!c || c.length < 4) return;
    if (!lastTokenMatches(c, rosterName)) return;
    if (c.length > bestLen) {
      best = titleCaseWords(c);
      bestLen = c.length;
    }
  }

  let normalized = String(text).replace(/\r/g, '\n');
  if (options.ocr) {
    normalized = normalizeOcrText(normalized);
    let anchored = parseLegalNameFromLastNameAnchor(normalized, rosterName);
    if (anchored) return anchored;
  }
  let labelMatch = normalized.match(
    /(?:^|\n)\s*Name\s*(?:\([^)]*\))?\s*:\s*([^\n]+)/i
  );
  if (labelMatch) consider(labelMatch[1]);
  let medNameMatch = normalized.match(
    /Name\s+And\s+Address\s*\)?\s*:\s*([^\n]+)/i
  );
  if (medNameMatch) consider(medNameMatch[1]);
  let capsLabel = normalized.match(/(?:^|\n)\s*NAME\s*:\s*([^\n]+)/m);
  if (capsLabel) consider(capsLabel[1]);

  let lines = normalized.split('\n');
  let nameLineRe = /^[A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+){1,5}$/;
  let capsLineRe = /^[A-Z]{2,}(?:\s+[A-Z]{2,}){1,5}$/;
  let lineSource = options.ocr ? normalized.split(/\s+/).join('\n') : normalized;
  lineSource.split('\n').forEach(line => {
    let t = line.trim();
    if (t.length > 80) return;
    if (nameLineRe.test(t) || capsLineRe.test(t)) consider(t);
    if (options.ocr && t.length > 8 && t.toLowerCase().indexOf(last) > -1) consider(t);
  });

  if (!best && options.ocr) {
    best = parseLegalNameFromLastNameAnchor(normalized, rosterName);
  }

  return best;
}

function parseLegalNameFromOcrText(text, rosterName) {
  return parseLegalNameFromDocumentText(text, rosterName, {ocr: true});
}

function fileDateSortKey(filename) {
  let parts = String(filename).split('_');
  if (parts.length < 2) return 0;
  let d = parts[1];
  if (!/^\d{8}$/.test(d)) return 0;
  return parseInt(d, 10) || 0;
}

function pickCertScanFilename(fileNames, pilotId) {
  let id = String(pilotId || '').trim();
  if (!id) return null;
  let prefix = id + '_';
  let pool = (fileNames || []).filter(f => {
    if (!f || f.indexOf(prefix) !== 0) return false;
    if (!/\.(pdf|jpe?g)$/i.test(f)) return false;
    return f.indexOf('_CERT_') > -1;
  });
  if (!pool.length) return null;

  let medical = pool.filter(f => /_CERT_Medical_/i.test(f));
  let certificate = pool.filter(f => /_CERT_Certificate_/i.test(f));
  let chosen = medical.length ? medical : certificate;
  if (!chosen.length) return null;

  chosen.sort((a, b) => fileDateSortKey(b) - fileDateSortKey(a));
  return chosen[0];
}

module.exports = {
  rosterLastName,
  parseLegalNameFromDocumentText,
  parseLegalNameFromOcrText,
  parseLegalNameFromLastNameAnchor,
  pickCertScanFilename
};
