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

function parseLegalNameFromDocumentText(text, rosterName) {
  if (!text || !rosterName) return null;
  let last = rosterLastName(rosterName);
  if (!last) return null;

  let best = null;
  let bestLen = 0;

  function consider(candidate) {
    let c = String(candidate || '').replace(/\s+/g, ' ').trim();
    if (!c || c.length < 4) return;
    if (!lastTokenMatches(c, rosterName)) return;
    if (c.length > bestLen) {
      best = titleCaseWords(c);
      bestLen = c.length;
    }
  }

  let normalized = String(text).replace(/\r/g, '\n');
  let labelMatch = normalized.match(
    /(?:^|\n)\s*Name\s*(?:\([^)]*\))?\s*:\s*([^\n]+)/i
  );
  if (labelMatch) consider(labelMatch[1]);
  let capsLabel = normalized.match(/(?:^|\n)\s*NAME\s*:\s*([^\n]+)/m);
  if (capsLabel) consider(capsLabel[1]);

  let lines = normalized.split('\n');
  let nameLineRe = /^[A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+){1,5}$/;
  let capsLineRe = /^[A-Z]{2,}(?:\s+[A-Z]{2,}){1,5}$/;
  lines.forEach(line => {
    let t = line.trim();
    if (t.length > 60) return;
    if (nameLineRe.test(t) || capsLineRe.test(t)) consider(t);
  });

  return best;
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
    if (!/\.pdf$/i.test(f)) return false;
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
  pickCertScanFilename
};
