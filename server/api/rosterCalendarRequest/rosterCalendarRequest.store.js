'use strict';

import { Op } from 'sequelize';
import { RosterCalendarRequest } from '../../sqldb';

function normalizePersonName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function personKeyFromName(name) {
  return normalizePersonName(name).replace(/\s+/g, '-');
}

function rowToRequest(row) {
  const plain = row && row.get ? row.get({ plain: true }) : row;
  if (!plain) return null;
  return {
    day: plain.day,
    requestType: plain.requestType,
    label: plain.label,
    type: plain.type,
    status: plain.status,
    source: plain.source,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    requestedBy: plain.requestedBy || null,
    reviewedBy: plain.reviewedBy || null
  };
}

function requestToRow(base, monthKey, personName, personKey, rosterId, request) {
  const now = new Date();
  return {
    base,
    monthKey,
    personName,
    personKey,
    rosterId: rosterId || null,
    day: parseInt(request.day, 10),
    requestType: request.requestType || null,
    label: request.label || null,
    type: request.type || null,
    status: request.status || null,
    source: request.source || null,
    requestedBy: request.requestedBy || null,
    reviewedBy: request.reviewedBy || null,
    updatedAt: request.updatedAt ? new Date(request.updatedAt) : now
  };
}

export async function loadCalendarRequestRows(monthKey, bases) {
  const rows = await RosterCalendarRequest.findAll({
    where: {
      monthKey,
      base: { [Op.in]: bases }
    },
    order: [['personName', 'ASC'], ['day', 'ASC']]
  });
  return rows.map(row => row.get({ plain: true }));
}

export async function loadPersonRequestRows(monthKey, bases, personKeys) {
  if (!personKeys || !personKeys.length) return [];
  const rows = await RosterCalendarRequest.findAll({
    where: {
      monthKey,
      base: { [Op.in]: bases },
      personKey: { [Op.in]: personKeys }
    },
    order: [['day', 'ASC']]
  });
  return rows.map(row => row.get({ plain: true }));
}

export async function listPersonRequests(base, monthKey, personKey) {
  const rows = await RosterCalendarRequest.findAll({
    where: { base, monthKey, personKey },
    order: [['day', 'ASC']]
  });
  return rows.map(rowToRequest).filter(Boolean);
}

export async function replacePersonRequests(base, monthKey, personName, personKey, rosterId, requests) {
  const byDay = {};
  (requests || []).forEach(request => {
    if (!request || !request.day) return;
    byDay[String(request.day)] = request;
  });
  const sorted = Object.keys(byDay)
    .map(key => byDay[key])
    .sort((a, b) => a.day - b.day);
  await RosterCalendarRequest.sequelize.transaction(async transaction => {
    await RosterCalendarRequest.destroy({
      where: { base, monthKey, personKey },
      transaction,
      hooks: false
    });
    const rows = sorted
      .map(request => requestToRow(base, monthKey, personName, personKey, rosterId, request))
      .filter(row => row.day >= 1 && row.day <= 31);
    if (rows.length) {
      await RosterCalendarRequest.bulkCreate(rows, { transaction, hooks: false });
    }
  });
  return sorted;
}

export async function importPersonRequests(base, monthKey, personName, personKey, rosterId, importedRequests, existingRequests) {
  const keptLocal = (existingRequests || []).filter(request => request.source === 'local');
  const byDay = {};
  (importedRequests || []).forEach(request => {
    if (!request || !request.day) return;
    if (request.requestType === 'work') return;
    byDay[String(request.day)] = Object.assign({}, request, {
      source: 'acroroster',
      status: request.status || 'approved'
    });
  });
  keptLocal.forEach(request => {
    byDay[String(request.day)] = request;
  });
  const requests = Object.keys(byDay)
    .map(key => byDay[key])
    .sort((a, b) => a.day - b.day);
  await replacePersonRequests(base, monthKey, personName, personKey, rosterId, requests);
  return requests;
}

export async function migratePersonRequestsDoc(doc) {
  const data = doc.data ? doc.data() : doc;
  const docId = doc.id || '';
  let base = data.base;
  let monthKey = data.monthKey;
  if (!base || !monthKey) {
    const match = String(docId).match(/^([A-Z]+)-(\d{4}-\d{2})-/);
    if (match) {
      base = match[1];
      monthKey = match[2];
    }
  }
  if (!base || !monthKey || !data.personName) return 0;
  const personKey = data.personKey || personKeyFromName(data.personName);
  const requests = (data.requests || []).map(request => requestToRequestForImport(request));
  await replacePersonRequests(base, monthKey, data.personName, personKey, null, requests);
  return (data.requests || []).length;
}

function requestToRequestForImport(request) {
  return {
    day: request.day,
    requestType: request.requestType,
    label: request.label,
    type: request.type,
    status: request.status,
    source: request.source,
    updatedAt: request.updatedAt,
    requestedBy: request.requestedBy,
    reviewedBy: request.reviewedBy
  };
}
