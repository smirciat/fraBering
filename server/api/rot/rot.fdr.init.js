'use strict';

import {FdrPilot, FdrDaysOff} from '../../sqldb';
import {normalizePilotName} from './rot.fdr.math.js';
import {parseLooseYmd, alaskaCalendarYear} from './rot.fdr.calendar.js';
import {COMPUTED_HOURS_FROM_YEAR} from './rot.fdr.import.js';

function pad2(n) {
  let s = String(n);
  return s.length < 2 ? '0' + s : s;
}

function daysInCalendarMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** MM/DD/YYYY, YYYY-MM-DD, or MM/DD/YY (24 → 2024). */
export function parseHireDateYmd(raw) {
  let ymd = parseLooseYmd(raw);
  if (ymd) return ymd;
  let s = String(raw || '').trim();
  let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/);
  if (!m) return null;
  let yy = parseInt(m[3], 10);
  let year = yy >= 70 ? 1900 + yy : 2000 + yy;
  let month = parseInt(m[1], 10);
  let day = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > daysInCalendarMonth(year, month)) return null;
  return year + '-' + pad2(month) + '-' + pad2(day);
}

/** "Willow Hanson" or "HANSON, WILLOW" → spreadsheet roster label. */
export function fdrRosterName(name) {
  let s = String(name || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s.indexOf(',') >= 0) {
    let bits = s.split(',');
    let last = bits[0].trim();
    let first = bits.slice(1).join(' ').trim();
    if (!last || !first) return s.toUpperCase();
    return (last + ', ' + first).toUpperCase();
  }
  let parts = s.split(' ');
  if (parts.length < 2) return s.toUpperCase();
  let last = parts.pop();
  return (last + ', ' + parts.join(' ')).toUpperCase();
}

/** New ROT adds are SICs at OME, Kotzebue at OTZ, rotor at HEL. */
export function fdrSectionForBase(base) {
  let b = String(base || '').trim().toUpperCase();
  if (b === 'HEL' || b === 'HELI' || b.indexOf('ROTOR') >= 0) return 'ROTORWING';
  if (b === 'OTZ' || b === 'KOTZ' || b === 'KOTZEBUE') return 'KOTZEBUE';
  return 'NOME SIC';
}

/**
 * Calendar days in `year` strictly before the hire date.
 * Hire day is the first day on the job, so it is not filled in.
 * Months after hire are omitted (later paper / duty sync).
 * @returns {Object.<number, number>}
 */
export function daysOffUntilHire(year, hireYmd) {
  let out = {};
  let ymd = parseHireDateYmd(hireYmd);
  if (!ymd) return out;
  let parts = ymd.split('-');
  let hy = parseInt(parts[0], 10);
  let hm = parseInt(parts[1], 10);
  let hd = parseInt(parts[2], 10);
  if (hy < year) return out;
  if (hy > year) {
    for (let m = 1; m <= 12; m++) out[m] = daysInCalendarMonth(year, m);
    return out;
  }
  for (let m = 1; m < hm; m++) out[m] = daysInCalendarMonth(year, m);
  if (hd > 1) out[hm] = hd - 1;
  return out;
}

/**
 * Put a newly ROT-initialized pilot on the current FDR year roster and
 * seed days off for every day that year before dateOfHire.
 * Existing roster rows and existing days-off cells are left as they are.
 */
export async function initializeFdrPilot(opts) {
  opts = opts || {};
  let year = alaskaCalendarYear();
  if (year < COMPUTED_HOURS_FROM_YEAR) {
    return {skipped: true, reason: 'year_readonly', year: year};
  }
  let employeeId = String(opts.employeeId || '').trim();
  let pilotName = fdrRosterName(opts.name);
  let section = fdrSectionForBase(opts.pilotBase);
  if (!pilotName || !employeeId) {
    return {skipped: true, reason: 'missing_name', year: year};
  }

  let roster = await FdrPilot.findAll({where: {year}});
  let key = normalizePilotName(pilotName);
  let row = roster.find(r => r.employeeId && String(r.employeeId) === employeeId);
  if (!row) row = roster.find(r => normalizePilotName(r.pilotName) === key);
  let created = false;
  if (!row) {
    let maxOrder = 0;
    roster.forEach(r => {
      let n = parseInt(r.sortOrder, 10);
      if (Number.isFinite(n) && n > maxOrder) maxOrder = n;
    });
    row = await FdrPilot.create({
      year: year,
      pilotName: pilotName,
      section: section,
      sortOrder: maxOrder + 1,
      employeeId: employeeId
    });
    created = true;
  } else if (!row.employeeId) {
    row.employeeId = employeeId;
    await row.save();
  }

  let seed = daysOffUntilHire(year, opts.dateOfHire);
  let months = Object.keys(seed).map(m => parseInt(m, 10));
  let existing = await FdrDaysOff.findAll({
    where: {year: year, pilotName: row.pilotName}
  });
  let have = {};
  existing.forEach(r => { have[r.month] = true; });
  let seeded = [];
  for (let i = 0; i < months.length; i++) {
    let month = months[i];
    if (have[month]) continue;
    await FdrDaysOff.create({
      year: year,
      pilotName: row.pilotName,
      month: month,
      daysOff: seed[month],
      updatedBy: opts.updatedBy || 'fdr-init'
    });
    seeded.push(month);
  }

  return {
    year: year,
    pilotName: row.pilotName,
    section: row.section,
    employeeId: employeeId,
    created: created,
    hireDate: parseHireDateYmd(opts.dateOfHire) || '',
    daysOffMonths: seeded.length,
    daysOff: seed
  };
}
