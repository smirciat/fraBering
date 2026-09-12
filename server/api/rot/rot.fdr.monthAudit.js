'use strict';

import {FdrMonthAudit} from '../../sqldb';
import {MONTHS, normalizePilotName} from './rot.fdr.math.js';
import {COMPUTED_HOURS_FROM_YEAR} from './rot.fdr.import.js';
import Sequelize from 'sequelize';

function emptyMonthAuditCell() {
  return {audited: false, at: null, by: '', note: ''};
}

export async function ensureFdrMonthAuditSchema() {
  if (!FdrMonthAudit || !FdrMonthAudit.sequelize) return;
  let sequelize = FdrMonthAudit.sequelize;
  let queryInterface = sequelize.getQueryInterface();
  let tableName = FdrMonthAudit.tableName || FdrMonthAudit.getTableName();
  if (tableName && typeof tableName === 'object') {
    tableName = tableName.tableName || 'FdrMonthAudits';
  }
  let description = null;
  try {
    description = await queryInterface.describeTable(tableName);
  } catch (err) {
    return;
  }
  if (!description || description.dutyOverrideDaysOff) return;
  await queryInterface.addColumn(tableName, 'dutyOverrideDaysOff', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
}

export async function loadMonthAuditMap(year) {
  if (!FdrMonthAudit) return {};
  await ensureFdrMonthAuditSchema();
  let rows = await FdrMonthAudit.findAll({where: {year}});
  let map = {};
  rows.forEach(r => {
    let key = normalizePilotName(r.pilotName);
    if (!map[key]) map[key] = {};
    map[key][r.month] = r;
  });
  return map;
}

export function monthAuditRowsForPilot(auditMap, pilotName) {
  let ints = auditMap[normalizePilotName(pilotName)] || {};
  let hoursAudit = {};
  let dutyAudit = {};
  MONTHS.forEach((m, idx) => {
    let month = idx + 1;
    let row = ints[month];
    hoursAudit[m] = row && row.hoursAuditedAt ? {
      audited: true,
      at: row.hoursAuditedAt,
      by: row.hoursAuditedBy || '',
      note: row.hoursAuditNote ? String(row.hoursAuditNote) : ''
    } : emptyMonthAuditCell();
    let override = row && row.dutyOverrideDaysOff !== null && row.dutyOverrideDaysOff !== undefined
      ? parseInt(row.dutyOverrideDaysOff, 10)
      : null;
    if (override !== null && !Number.isFinite(override)) override = null;
    dutyAudit[m] = row && row.dutyAuditedAt ? {
      audited: true,
      at: row.dutyAuditedAt,
      by: row.dutyAuditedBy || '',
      note: row.dutyAuditNote ? String(row.dutyAuditNote) : '',
      overrideDaysOff: override
    } : Object.assign(emptyMonthAuditCell(), {overrideDaysOff: override});
  });
  return {hoursAudit, dutyAudit};
}

export async function saveMonthAuditEntries(year, entries, userName) {
  if (!FdrMonthAudit) {
    throw new Error('month_audit_unavailable');
  }
  await ensureFdrMonthAuditSchema();
  if (year < COMPUTED_HOURS_FROM_YEAR) {
    throw new Error('month_audit_readonly');
  }
  userName = userName || '';
  for (let i = 0; i < entries.length; i++) {
    let item = entries[i] || {};
    let pilotName = String(item.pilotName || '').trim();
    let month = parseInt(item.month, 10);
    let parameter = String(item.parameter || '').toLowerCase();
    if (!pilotName || !month || month < 1 || month > 12) continue;
    if (parameter !== 'hours' && parameter !== 'duty') continue;

    let audited = !!item.audited;
    let note = item.note;
    let noteProvided = note !== undefined && note !== null;
    let hasNote = noteProvided && String(note).trim() !== '';

    let existing = await FdrMonthAudit.findOne({where: {year, pilotName, month}});
    let patch = {};
    if (parameter === 'hours') {
      if (audited) {
        patch.hoursAuditedAt = new Date();
        patch.hoursAuditedBy = userName;
        if (hasNote) patch.hoursAuditNote = String(note).trim();
        else if (noteProvided && !hasNote) patch.hoursAuditNote = null;
      } else {
        patch.hoursAuditedAt = null;
        patch.hoursAuditedBy = null;
        patch.hoursAuditNote = null;
      }
    } else {
      if (audited) {
        patch.dutyAuditedAt = new Date();
        patch.dutyAuditedBy = userName;
        if (hasNote) patch.dutyAuditNote = String(note).trim();
        else if (noteProvided && !hasNote) patch.dutyAuditNote = null;
      } else {
        patch.dutyAuditedAt = null;
        patch.dutyAuditedBy = null;
        patch.dutyAuditNote = null;
        patch.dutyOverrideDaysOff = null;
      }
      if (item.daysOff !== undefined) {
        if (item.daysOff === '' || item.daysOff === null) {
          patch.dutyOverrideDaysOff = null;
        } else {
          let n = parseInt(item.daysOff, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 31) {
            patch.dutyOverrideDaysOff = n;
            if (!audited) {
              patch.dutyAuditedAt = new Date();
              patch.dutyAuditedBy = userName;
            }
          }
        }
      }
    }

    if (existing) {
      await existing.update(patch);
    } else if (audited) {
      await FdrMonthAudit.create(Object.assign({
        year,
        pilotName,
        month
      }, patch));
    }

    let refreshed = await FdrMonthAudit.findOne({where: {year, pilotName, month}});
    if (refreshed && !refreshed.hoursAuditedAt && !refreshed.dutyAuditedAt &&
        (refreshed.dutyOverrideDaysOff === null || refreshed.dutyOverrideDaysOff === undefined)) {
      await refreshed.destroy();
    }
  }
}
