'use strict';

import {FdrComputedHour} from '../../sqldb';
import {normalizePilotName} from './rot.fdr.math.js';

const BASE_SECTIONS = {
  OME: ['NOME PIC', 'NOME SIC'],
  OTZ: ['KOTZEBUE'],
  ROTOR: ['ROTORWING']
};

export function sectionsForBase(base) {
  let key = String(base || '').trim().toUpperCase();
  if (key === 'OTZ' || key === 'KOTZ') return BASE_SECTIONS.OTZ.slice();
  if (key === 'ROTOR' || key === 'ROTORWING') return BASE_SECTIONS.ROTOR.slice();
  return BASE_SECTIONS.OME.slice();
}

export async function loadComputedHoursState(year) {
  let rows = await FdrComputedHour.findAll({where: {year}});
  let byEmployee = {};
  let syncedPilotKeys = {};
  let syncedAtByPilot = {};
  let lastSyncedAt = null;

  rows.forEach(r => {
    let pilotKey = normalizePilotName(r.pilotName);
    syncedPilotKeys[pilotKey] = true;
    if (r.syncedAt) {
      let t = new Date(r.syncedAt).getTime();
      if (!syncedAtByPilot[pilotKey] || t > new Date(syncedAtByPilot[pilotKey]).getTime()) {
        syncedAtByPilot[pilotKey] = r.syncedAt;
      }
    }
    let eid = r.employeeId ? String(r.employeeId) : '';
    if (eid) {
      if (!byEmployee[eid]) {
        byEmployee[eid] = {};
        for (let m = 1; m <= 12; m++) byEmployee[eid][m] = null;
      }
      byEmployee[eid][r.month] = r.hours;
      if (/^\d+$/.test(eid)) {
        let n = String(parseInt(eid, 10));
        if (!byEmployee[n]) {
          byEmployee[n] = byEmployee[eid];
        }
      }
    }
    if (r.syncedAt) {
      let t = new Date(r.syncedAt).getTime();
      if (!lastSyncedAt || t > lastSyncedAt) lastSyncedAt = r.syncedAt;
    }
  });

  return {byEmployee, syncedPilotKeys, syncedAtByPilot, lastSyncedAt};
}

export function pilotSyncedAt(syncedAtByPilot, pilotName) {
  if (!syncedAtByPilot) return null;
  return syncedAtByPilot[normalizePilotName(pilotName)] || null;
}

export function pilotHasComputedHours(syncedPilotKeys, pilotName) {
  return !!(syncedPilotKeys && syncedPilotKeys[normalizePilotName(pilotName)]);
}

export async function upsertComputedHoursForPilot(year, pilotName, employeeId, monthHours, syncedBy) {
  if (!FdrComputedHour) return;
  let now = new Date();
  let eid = employeeId ? String(employeeId) : null;
  for (let m = 1; m <= 12; m++) {
    let hours = monthHours && monthHours[m] !== undefined ? monthHours[m] : null;
    let existing = await FdrComputedHour.findOne({
      where: {year, pilotName, month: m}
    });
    if (existing) {
      await existing.update({
        hours,
        employeeId: eid,
        syncedAt: now,
        syncedBy: syncedBy || ''
      });
    } else {
      await FdrComputedHour.create({
        year,
        pilotName,
        employeeId: eid,
        month: m,
        hours,
        syncedAt: now,
        syncedBy: syncedBy || ''
      });
    }
  }
}

export async function clearComputedHoursForYear(year) {
  if (!FdrComputedHour) return;
  await FdrComputedHour.destroy({where: {year}});
}

export function filterRosterForSyncScope(roster, scope, options) {
  options = options || {};
  scope = scope || 'all';
  let list = roster || [];
  if (scope === 'pilot') {
    let name = String(options.pilotName || '').trim();
    return list.filter(r => String(r.pilotName).trim() === name);
  }
  if (scope === 'section') {
    let sec = String(options.section || '').trim();
    return list.filter(r => String(r.section).trim() === sec);
  }
  if (scope === 'base') {
    let sections = sectionsForBase(options.base);
    return list.filter(r => sections.indexOf(String(r.section).trim()) >= 0);
  }
  return list;
}
