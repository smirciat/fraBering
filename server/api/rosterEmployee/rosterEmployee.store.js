'use strict';

import { Op } from 'sequelize';
import crypto from 'crypto';
import { RosterEmployee } from '../../sqldb';

function generateEmployeeId() {
  return crypto.randomBytes(12).toString('hex');
}

function rowToEmployee(row) {
  const plain = row && row.get ? row.get({ plain: true }) : row;
  if (!plain) return null;
  const employee = Object.assign({}, plain);
  if (employee.createdAt) employee.createdAt = new Date(employee.createdAt).toISOString();
  if (employee.updatedAt) employee.updatedAt = new Date(employee.updatedAt).toISOString();
  if (employee.lastImportedAt) employee.lastImportedAt = new Date(employee.lastImportedAt).toISOString();
  return employee;
}

function normalizeSavePayload(payload) {
  const now = new Date();
  const normalized = Object.assign({}, payload);
  delete normalized._id;
  if (normalized.createdAt && typeof normalized.createdAt !== 'object') {
    normalized.createdAt = new Date(normalized.createdAt);
  }
  if (normalized.updatedAt && typeof normalized.updatedAt !== 'object') {
    normalized.updatedAt = new Date(normalized.updatedAt);
  }
  if (normalized.lastImportedAt && typeof normalized.lastImportedAt !== 'object') {
    normalized.lastImportedAt = new Date(normalized.lastImportedAt);
  }
  normalized.updatedAt = now;
  return normalized;
}

export async function listEmployeesByBases(bases) {
  const rows = await RosterEmployee.findAll({
    where: { base: { [Op.in]: bases } },
    order: [['displayName', 'ASC']]
  });
  return rows.map(rowToEmployee).filter(Boolean);
}

async function findExistingImportedEmployee(employee) {
  if (employee.acrorosterEmployeeId) {
    const byAcroId = await RosterEmployee.findOne({
      where: {
        base: employee.base,
        acrorosterEmployeeId: employee.acrorosterEmployeeId
      }
    });
    if (byAcroId) return byAcroId;
  }
  const byName = await RosterEmployee.findOne({
    where: {
      base: employee.base,
      displayName: employee.displayName
    }
  });
  if (byName) return byName;
  if (employee.importedFrom === 'acroroster') {
    const byNameAnyBase = await RosterEmployee.findAll({
      where: { displayName: employee.displayName },
      limit: 10
    });
    return byNameAnyBase.find(row => {
      const data = row.get({ plain: true });
      return !data.importedFrom || data.importedFrom === 'acroroster';
    }) || null;
  }
  return null;
}

export async function pruneCrossBaseEmployeeDuplicates(displayName, keepBase, keepId) {
  if (!displayName || !keepBase || !keepId) return 0;
  const rows = await RosterEmployee.findAll({
    where: { displayName }
  });
  let removed = 0;
  for (const row of rows) {
    if (row._id === keepId) continue;
    const data = row.get({ plain: true });
    if (data.importedFrom && data.importedFrom !== 'acroroster') continue;
    if (data.base === keepBase) continue;
    await row.destroy({ hooks: false });
    removed++;
  }
  return removed;
}

export async function upsertImportedEmployee(employee) {
  const existing = await findExistingImportedEmployee(employee);
  const payload = normalizeSavePayload(Object.assign({}, employee, {
    lastImportedAt: new Date()
  }));

  if (existing) {
    const existingData = existing.get({ plain: true });
    if (existingData.jobCategory && existingData.jobCategory !== 'uncategorized') {
      payload.jobCategory = existingData.jobCategory;
    }
    await existing.update(payload, { hooks: false });
    await pruneCrossBaseEmployeeDuplicates(employee.displayName, employee.base, existing._id);
    return { _id: existing._id, updated: true, displayName: employee.displayName };
  }

  const _id = generateEmployeeId();
  await RosterEmployee.create(Object.assign({}, payload, {
    _id,
    createdAt: new Date()
  }), { hooks: false });
  await pruneCrossBaseEmployeeDuplicates(employee.displayName, employee.base, _id);
  return { _id, created: true, displayName: employee.displayName };
}

export async function saveEmployee(payload) {
  const normalized = normalizeSavePayload(payload);
  const docId = payload._id;
  if (docId) {
    const existing = await RosterEmployee.findByPk(docId);
    if (!existing) return null;
    await existing.update(normalized, { hooks: false });
    await existing.reload();
    return rowToEmployee(existing);
  }
  const _id = generateEmployeeId();
  const created = await RosterEmployee.create(Object.assign({}, normalized, {
    _id,
    createdAt: new Date()
  }), { hooks: false });
  return rowToEmployee(created);
}

export async function deleteEmployee(docId) {
  const existing = await RosterEmployee.findByPk(docId);
  if (!existing) return false;
  await existing.destroy({ hooks: false });
  return true;
}

export async function getEmployeeById(docId) {
  const existing = await RosterEmployee.findByPk(docId);
  return existing ? rowToEmployee(existing) : null;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
}

export async function migrateEmployeeDoc(doc) {
  const data = doc.data ? doc.data() : doc;
  const docId = doc.id || data._id;
  if (!docId || !data) return false;
  const payload = normalizeSavePayload(Object.assign({}, data, {
    acrorosterEmployeeId: data.acrorosterEmployeeId || data.acroRosterId || null,
    importedFrom: data.importedFrom || data.source || null,
    createdAt: normalizeTimestamp(data.createdAt) || new Date(),
    updatedAt: normalizeTimestamp(data.updatedAt) || new Date(),
    lastImportedAt: normalizeTimestamp(data.lastImportedAt)
  }));
  const existing = await RosterEmployee.findByPk(docId);
  if (existing) {
    await existing.update(payload, { hooks: false });
  } else {
    await RosterEmployee.create(Object.assign({ _id: docId }, payload), { hooks: false });
  }
  return true;
}
