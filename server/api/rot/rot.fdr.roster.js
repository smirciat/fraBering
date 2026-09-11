'use strict';

import {FdrPilot, sequelize} from '../../sqldb';
import {normalizePilotName} from './rot.fdr.math.js';
import {COMPUTED_HOURS_FROM_YEAR} from './rot.fdr.import.js';

export const DEFAULT_FDR_SECTIONS = [
  'NOME PIC',
  'NOME SIC',
  'ROTORWING',
  'KOTZEBUE'
];

export async function listFdrSectionNames() {
  let rows = await FdrPilot.findAll({
    attributes: ['section'],
    group: ['section'],
    order: [['section', 'ASC']]
  });
  let names = rows.map(r => r.section).filter(Boolean);
  if (!names.length) {
    return DEFAULT_FDR_SECTIONS.slice();
  }
  DEFAULT_FDR_SECTIONS.forEach(s => {
    if (names.indexOf(s) < 0) names.push(s);
  });
  return names;
}

function assertRosterEditable(year) {
  if (year < COMPUTED_HOURS_FROM_YEAR) {
    let err = new Error('roster_readonly');
    throw err;
  }
}

export async function saveFdrRoster(year, pilotsInput) {
  assertRosterEditable(year);
  let pilots = Array.isArray(pilotsInput) ? pilotsInput : [];
  let seen = {};
  let normalized = [];
  pilots.forEach((p, idx) => {
    let pilotName = String(p.pilotName || p.name || '').trim();
    let section = String(p.section || '').trim();
    if (!pilotName || !section) return;
    let key = normalizePilotName(pilotName);
    if (seen[key]) {
      let err = new Error('duplicate_pilot');
      err.pilotName = pilotName;
      throw err;
    }
    seen[key] = true;
    let sortOrder = parseInt(p.sortOrder, 10);
    if (!Number.isFinite(sortOrder)) sortOrder = idx;
    normalized.push({
      pilotName,
      section,
      sortOrder,
      employeeId: p.employeeId || null
    });
  });

  let existing = await FdrPilot.findAll({where: {year}});
  let empMap = {};
  existing.forEach(r => {
    empMap[normalizePilotName(r.pilotName)] = r.employeeId;
  });

  await sequelize.transaction(async t => {
    await FdrPilot.destroy({where: {year}, transaction: t});
    for (let i = 0; i < normalized.length; i++) {
      let p = normalized[i];
      let key = normalizePilotName(p.pilotName);
      await FdrPilot.create({
        year,
        pilotName: p.pilotName,
        section: p.section,
        sortOrder: p.sortOrder,
        employeeId: p.employeeId || empMap[key] || null
      }, {transaction: t});
    }
  });

  return {saved: normalized.length};
}

export async function copyFdrRosterFromYear(targetYear, sourceYear, options) {
  assertRosterEditable(targetYear);
  options = options || {};
  let fromYear = parseInt(sourceYear, 10);
  if (!Number.isFinite(fromYear)) {
    fromYear = targetYear - 1;
  }
  let source = await FdrPilot.findAll({
    where: {year: fromYear},
    order: [['sortOrder', 'ASC']]
  });
  if (!source.length) {
    let err = new Error('no_source_roster');
    err.sourceYear = fromYear;
    throw err;
  }
  let targetCount = await FdrPilot.count({where: {year: targetYear}});
  if (targetCount > 0 && !options.replace) {
    let err = new Error('target_not_empty');
    throw err;
  }
  let pilots = source.map(r => ({
    pilotName: r.pilotName,
    section: r.section,
    sortOrder: r.sortOrder,
    employeeId: r.employeeId
  }));
  await saveFdrRoster(targetYear, pilots);
  return {copiedFrom: fromYear, count: pilots.length};
}
