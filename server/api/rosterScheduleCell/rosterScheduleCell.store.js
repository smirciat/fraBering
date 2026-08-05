'use strict';

import { Op } from 'sequelize';
import { RosterScheduleCell } from '../../sqldb';

export function rosterMonthKeyFromDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function rosterScheduleDocId(base, dateString) {
  return `${base}-${rosterMonthKeyFromDate(dateString)}`;
}

function daysObjectFromRows(rows) {
  const days = {};
  (rows || []).forEach(row => {
    if (!row.code) return;
    if (!days[row.rosterId]) days[row.rosterId] = {};
    days[row.rosterId][String(row.day)] = row.code;
  });
  return days;
}

function latestUpdatedAt(rows) {
  let latest = null;
  (rows || []).forEach(row => {
    if (!row.updatedAt) return;
    const time = new Date(row.updatedAt).getTime();
    if (!latest || time > latest) latest = time;
  });
  return latest ? new Date(latest).toISOString() : null;
}

export async function loadScheduleForBaseMonth(base, monthKey) {
  const rows = await RosterScheduleCell.findAll({
    where: { base, monthKey }
  });
  const days = daysObjectFromRows(rows);
  return {
    days,
    empty: !Object.keys(days).length,
    updatedAt: latestUpdatedAt(rows)
  };
}

export async function loadScheduleBulk(monthKeys, bases) {
  if (!monthKeys.length || !bases.length) return {};
  const rows = await RosterScheduleCell.findAll({
    where: {
      monthKey: { [Op.in]: monthKeys },
      base: { [Op.in]: bases }
    }
  });
  const scheduleDaysByMonth = {};
  rows.forEach(row => {
    if (!row.code) return;
    if (!scheduleDaysByMonth[row.monthKey]) scheduleDaysByMonth[row.monthKey] = {};
    if (!scheduleDaysByMonth[row.monthKey][row.rosterId]) {
      scheduleDaysByMonth[row.monthKey][row.rosterId] = {};
    }
    scheduleDaysByMonth[row.monthKey][row.rosterId][String(row.day)] = row.code;
  });
  return scheduleDaysByMonth;
}

export async function getPersonScheduleDays(base, monthKey, rosterId) {
  const rows = await RosterScheduleCell.findAll({
    where: { base, monthKey, rosterId }
  });
  const personDays = {};
  rows.forEach(row => {
    if (row.code) personDays[String(row.day)] = row.code;
  });
  return personDays;
}

export async function saveScheduleCell(base, monthKey, rosterId, day, code) {
  const dayNum = parseInt(day, 10);
  const where = { base, monthKey, rosterId, day: dayNum };
  const existing = await RosterScheduleCell.findOne({ where });
  const now = new Date();
  if (!code) {
    if (existing) await existing.destroy({ hooks: false });
    return null;
  }
  const normalizedCode = String(code).trim().toUpperCase();
  const payload = {
    base,
    monthKey,
    rosterId,
    day: dayNum,
    code: normalizedCode,
    updatedAt: now
  };
  if (existing) {
    await existing.update(payload, { hooks: false });
  } else {
    await RosterScheduleCell.create(payload, { hooks: false });
  }
  return normalizedCode;
}

export async function applyScheduleCells(base, monthKey, rosterId, days, code, action) {
  const normalizedDays = (days || [])
    .map(day => parseInt(day, 10))
    .filter(day => day >= 1 && day <= 31);
  const shouldDelete = action === 'delete' || action === 'deny';
  for (const day of normalizedDays) {
    await saveScheduleCell(base, monthKey, rosterId, day, shouldDelete ? null : code);
  }
  return getPersonScheduleDays(base, monthKey, rosterId);
}

function rowsFromDaysObject(base, monthKey, days) {
  const rows = [];
  const now = new Date();
  Object.keys(days || {}).forEach(rosterId => {
    const personDays = days[rosterId] || {};
    Object.keys(personDays).forEach(dayKey => {
      const code = personDays[dayKey];
      if (!code) return;
      rows.push({
        base,
        monthKey,
        rosterId,
        day: parseInt(dayKey, 10),
        code: String(code).trim().toUpperCase(),
        updatedAt: now
      });
    });
  });
  return rows;
}

export async function importScheduleDays(base, monthKey, days) {
  const rows = rowsFromDaysObject(base, monthKey, days);
  await RosterScheduleCell.sequelize.transaction(async transaction => {
    await RosterScheduleCell.destroy({
      where: { base, monthKey },
      transaction,
      hooks: false
    });
    if (rows.length) {
      await RosterScheduleCell.bulkCreate(rows, { transaction });
    }
  });
  return rows.length;
}

export async function importScheduleDocs(docs) {
  let rowCount = 0;
  for (const doc of docs || []) {
    rowCount += await importScheduleDays(doc.base, doc.monthKey, doc.days);
  }
  return rowCount;
}
