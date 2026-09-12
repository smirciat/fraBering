'use strict';

import {normalizePilotName} from './rot.fdr.math.js';

/** Spreadsheet row label: "KINNEEN, FEN" → KINNEENFEN */
export function spreadsheetNameKey(raw) {
  let s = String(raw || '').trim();
  let comma = s.indexOf(',');
  if (comma < 0) {
    return normalizePilotName(s);
  }
  let last = s.slice(0, comma).trim();
  let first = s.slice(comma + 1).trim();
  return normalizePilotName(last + first);
}

/** Firebase display: "Fen Kinneen" / "F. Kinneen" → KINNEENFEN / KINNEENF */
export function displayNameKey(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  let comma = s.indexOf(',');
  if (comma >= 0) {
    return spreadsheetNameKey(s);
  }
  let parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return normalizePilotName(s);
  }
  let last = parts[parts.length - 1];
  let first = parts.slice(0, parts.length - 1).join(' ').replace(/\./g, '').trim();
  return normalizePilotName(last + first);
}

function canonicalLastName(last) {
  let n = normalizePilotName(last);
  if (n === 'PAULSON' || n === 'PAULSEN') return 'PAULSEN';
  return n;
}

function firebaseLastName(firebaseLabel) {
  let s = String(firebaseLabel || '').trim();
  let comma = s.indexOf(',');
  if (comma >= 0) {
    return normalizePilotName(s.slice(0, comma));
  }
  let parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return normalizePilotName(s);
  return normalizePilotName(parts[parts.length - 1]);
}

function lastNamesAlign(spreadsheetLast, firebaseLabel) {
  return canonicalLastName(spreadsheetLast) === canonicalLastName(firebaseLastName(firebaseLabel));
}

/** True when spreadsheet LAST, FIRST and a Firebase label refer to the same person. */
export function namesReferToSamePilot(spreadsheetRaw, firebaseLabel) {
  let sheetKey = spreadsheetNameKey(spreadsheetRaw);
  let fbKey = displayNameKey(firebaseLabel);
  if (!sheetKey || !fbKey) return false;
  if (sheetKey === fbKey) return true;

  let comma = String(spreadsheetRaw || '').indexOf(',');
  if (comma < 0) return false;
  let sLast = normalizePilotName(String(spreadsheetRaw).slice(0, comma));
  let sFirst = normalizePilotName(String(spreadsheetRaw).slice(comma + 1));
  if (!sLast || !sFirst) return false;
  if (!lastNamesAlign(sLast, firebaseLabel)) return false;
  let canonLast = canonicalLastName(sLast);
  let fbLast = canonicalLastName(firebaseLastName(firebaseLabel));
  if (!sheetKey.startsWith(sLast) && !sheetKey.startsWith(canonLast) && !sheetKey.startsWith(fbLast)) return false;
  if (!fbKey.startsWith(fbLast)) return false;

  let sRest = sheetKey.startsWith(sLast) ? sheetKey.slice(sLast.length) : sheetKey.slice(fbLast.length);
  let fRest = fbKey.slice(fbLast.length);
  if (!sRest || !fRest) return false;
  if (sRest === fRest) return true;
  if (sRest.indexOf(fRest) === 0 || fRest.indexOf(sRest) === 0) return true;
  if (fRest.length === 1 && sRest.charAt(0) === fRest.charAt(0)) return true;
  if (sRest.length === 1 && fRest.charAt(0) === sRest.charAt(0)) return true;
  return compatibleSpreadsheetFirstNames(sRest, fRest);
}

/** e.g. spreadsheet "MIKE K" vs Firebase "MICHAEL K" (same last name already verified). */
function compatibleSpreadsheetFirstNames(sRest, fRest) {
  let sParts = String(sRest || '').trim().split(/\s+/).filter(Boolean);
  let fParts = String(fRest || '').trim().split(/\s+/).filter(Boolean);
  if (!sParts.length || !fParts.length) return false;
  let sGiven = sParts[0].replace(/\./g, '');
  let fGiven = fParts[0].replace(/\./g, '');
  if (sGiven === 'SAVANNAH' || sGiven === 'SAVANNA') sGiven = 'SAVANNA';
  if (fGiven === 'SAVANNAH' || fGiven === 'SAVANNA') fGiven = 'SAVANNA';
  if (!sGiven || !fGiven) return false;
  if (sGiven === fGiven) return middleInitialsCompatible(sParts, fParts);
  if (sGiven.indexOf(fGiven) === 0 || fGiven.indexOf(sGiven) === 0) {
    return middleInitialsCompatible(sParts, fParts);
  }
  if (sGiven.charAt(0) === fGiven.charAt(0) && middleInitialsCompatible(sParts, fParts)) {
    return true;
  }
  return false;
}

function middleInitialsCompatible(sParts, fParts) {
  let sMid = sParts.length > 1 ? sParts[1].replace(/\./g, '') : '';
  let fMid = fParts.length > 1 ? fParts[1].replace(/\./g, '') : '';
  if (!sMid || !fMid) return true;
  return sMid.charAt(0) === fMid.charAt(0);
}

export function buildPilotEmployeeIndex(firebasePilots) {
  let bySpreadsheetKey = {};
  (firebasePilots || []).forEach(p => {
    let id = p._id !== undefined && p._id !== null ? String(p._id) : '';
    if (!id) return;
    let labels = [p.displayName, p.name, p.legalName, p.payrollName];
    labels.forEach(label => {
      if (!label) return;
      let dk = displayNameKey(label);
      if (dk) bySpreadsheetKey[dk] = id;
      let sk = spreadsheetNameKey(label);
      if (sk) bySpreadsheetKey[sk] = id;
    });
  });
  return bySpreadsheetKey;
}

export function matchPilotEmployeeId(spreadsheetPilotName, keyIndex, firebasePilots) {
  let raw = String(spreadsheetPilotName || '').trim();
  if (!raw) return null;

  let sk = spreadsheetNameKey(raw);
  if (keyIndex[sk]) return keyIndex[sk];

  for (let i = 0; i < (firebasePilots || []).length; i++) {
    let p = firebasePilots[i];
    let labels = [p.displayName, p.name, p.legalName, p.payrollName];
    for (let j = 0; j < labels.length; j++) {
      if (!labels[j]) continue;
      if (namesReferToSamePilot(raw, labels[j])) {
        return String(p._id);
      }
    }
  }
  return null;
}
