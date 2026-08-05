'use strict';

import { RosterStaffingMinimum } from '../../sqldb';

function minimumsTreeFromRows(rows) {
  const tree = {};
  (rows || []).forEach(row => {
    if (!tree[row.sectionType]) tree[row.sectionType] = {};
    if (!tree[row.sectionType][row.base]) tree[row.sectionType][row.base] = {};
    tree[row.sectionType][row.base][row.code] = {
      weekday: parseInt(row.weekday, 10) || 0,
      weekend: parseInt(row.weekend, 10) || 0
    };
  });
  return Object.keys(tree).length ? tree : null;
}

function minimumRowsFromTree(minimums, updatedBy) {
  const rows = [];
  const now = new Date();
  Object.keys(minimums || {}).forEach(sectionType => {
    Object.keys(minimums[sectionType] || {}).forEach(base => {
      Object.keys(minimums[sectionType][base] || {}).forEach(code => {
        const entry = minimums[sectionType][base][code] || {};
        rows.push({
          sectionType,
          base,
          code,
          weekday: parseInt(entry.weekday, 10) || 0,
          weekend: parseInt(entry.weekend, 10) || 0,
          updatedAt: now,
          updatedBy: updatedBy || null
        });
      });
    });
  });
  return rows;
}

export async function getStaffingMinimums() {
  const rows = await RosterStaffingMinimum.findAll();
  return minimumsTreeFromRows(rows);
}

export async function saveStaffingMinimums(minimums, updatedBy) {
  const rows = minimumRowsFromTree(minimums, updatedBy);
  await RosterStaffingMinimum.sequelize.transaction(async transaction => {
    await RosterStaffingMinimum.destroy({ where: {}, transaction });
    if (rows.length) {
      await RosterStaffingMinimum.bulkCreate(rows, { transaction });
    }
  });
  return true;
}

export function minimumRowsFromFirebaseTree(minimums, updatedBy) {
  return minimumRowsFromTree(minimums, updatedBy);
}
