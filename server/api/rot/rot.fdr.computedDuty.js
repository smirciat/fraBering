'use strict';

import {FdrComputedDuty} from '../../sqldb';
import {normalizePilotName} from './rot.fdr.math.js';

export async function loadComputedDutyState(year) {
  let rows = await FdrComputedDuty.findAll({where: {year}});
  let byPilotMonth = {};
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
    if (!byPilotMonth[pilotKey]) byPilotMonth[pilotKey] = {};
    byPilotMonth[pilotKey][r.month] = {
      daysOff: r.daysOff,
      claimedCount: r.claimedCount
    };
    if (r.syncedAt) {
      let t = new Date(r.syncedAt).getTime();
      if (!lastSyncedAt || t > lastSyncedAt) lastSyncedAt = r.syncedAt;
    }
  });

  return {byPilotMonth, syncedPilotKeys, syncedAtByPilot, lastSyncedAt};
}

export function pilotHasComputedDuty(syncedPilotKeys, pilotName) {
  return !!(syncedPilotKeys && syncedPilotKeys[normalizePilotName(pilotName)]);
}

export function pilotDutySyncedAt(syncedAtByPilot, pilotName) {
  if (!syncedAtByPilot) return null;
  return syncedAtByPilot[normalizePilotName(pilotName)] || null;
}

export async function upsertComputedDutyForPilot(year, pilotName, employeeId, dutyResult, syncedBy) {
  if (!FdrComputedDuty || !dutyResult) return;
  let now = new Date();
  let eid = employeeId ? String(employeeId) : null;
  let months = dutyResult.months || {};
  let claimedByMonth = dutyResult.claimedByMonth || {};
  for (let m = 1; m <= 12; m++) {
    let daysOff = months[m] !== undefined ? months[m] : null;
    let claimedCount = claimedByMonth[m] !== undefined ? claimedByMonth[m] : null;
    let existing = await FdrComputedDuty.findOne({
      where: {year, pilotName, month: m}
    });
    if (existing) {
      await existing.update({
        daysOff,
        claimedCount,
        employeeId: eid,
        syncedAt: now,
        syncedBy: syncedBy || '',
        source: 'union'
      });
    } else {
      await FdrComputedDuty.create({
        year,
        pilotName,
        employeeId: eid,
        month: m,
        daysOff,
        claimedCount,
        syncedAt: now,
        syncedBy: syncedBy || '',
        source: 'union'
      });
    }
  }
}

export async function clearComputedDutyForYear(year) {
  if (!FdrComputedDuty) return;
  await FdrComputedDuty.destroy({where: {year}});
}
