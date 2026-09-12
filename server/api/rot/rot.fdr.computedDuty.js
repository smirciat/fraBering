'use strict';

import {FdrComputedDuty} from '../../sqldb';
import {normalizePilotName} from './rot.fdr.math.js';

function storeDutyMonthEntry(map, month, entry) {
  if (!map) return;
  let mo = parseInt(month, 10);
  if (!mo) return;
  map[mo] = entry;
  map[String(mo)] = entry;
}

export async function loadComputedDutyState(year) {
  if (!FdrComputedDuty) {
    return {byPilotMonth: {}, byEmployeeMonth: {}, syncedPilotKeys: {}, syncedAtByPilot: {}, lastSyncedAt: null};
  }
  let rows = await FdrComputedDuty.findAll({where: {year}});
  let byPilotMonth = {};
  let byEmployeeMonth = {};
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
    let entry = {
      daysOff: r.daysOff,
      claimedCount: r.claimedCount
    };
    if (!byPilotMonth[pilotKey]) byPilotMonth[pilotKey] = {};
    storeDutyMonthEntry(byPilotMonth[pilotKey], r.month, entry);
    if (r.employeeId) {
      let ek = String(r.employeeId);
      if (!byEmployeeMonth[ek]) byEmployeeMonth[ek] = {};
      storeDutyMonthEntry(byEmployeeMonth[ek], r.month, entry);
      if (/^\d+$/.test(ek)) {
        let nk = String(parseInt(ek, 10));
        if (!byEmployeeMonth[nk]) byEmployeeMonth[nk] = byEmployeeMonth[ek];
      }
    }
    if (r.syncedAt) {
      let t = new Date(r.syncedAt).getTime();
      if (!lastSyncedAt || t > lastSyncedAt) lastSyncedAt = r.syncedAt;
    }
  });

  return {byPilotMonth, byEmployeeMonth, syncedPilotKeys, syncedAtByPilot, lastSyncedAt};
}

export function pilotHasComputedDuty(syncedPilotKeys, pilotName) {
  return !!(syncedPilotKeys && syncedPilotKeys[normalizePilotName(pilotName)]);
}

export function pilotDutySyncedAt(syncedAtByPilot, pilotName) {
  if (!syncedAtByPilot) return null;
  return syncedAtByPilot[normalizePilotName(pilotName)] || null;
}

export async function upsertComputedDutyForPilot(year, pilotName, employeeId, dutyResult, syncedBy) {
  if (!FdrComputedDuty) {
    throw new Error('fdr_computed_duty_unavailable');
  }
  if (!dutyResult || !dutyResult.months) {
    throw new Error('fdr_duty_empty_result');
  }
  let now = new Date();
  let eid = employeeId ? String(employeeId) : null;
  let rosterName = String(pilotName || '').trim();
  let months = dutyResult.months || {};
  let claimedByMonth = dutyResult.claimedByMonth || {};
  let monthsWithDaysOff = 0;
  for (let m = 1; m <= 12; m++) {
    let daysOff = months[m] !== undefined ? months[m] : null;
    let claimedCount = claimedByMonth[m] !== undefined ? claimedByMonth[m] : null;
    if (daysOff !== null && daysOff !== undefined) monthsWithDaysOff += 1;
    let existing = await FdrComputedDuty.findOne({
      where: {year, pilotName: rosterName, month: m}
    });
    if (!existing && eid) {
      existing = await FdrComputedDuty.findOne({
        where: {year, employeeId: eid, month: m}
      });
    }
    if (existing) {
      await existing.update({
        pilotName: rosterName,
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
        pilotName: rosterName,
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
  if (monthsWithDaysOff < 1) {
    let today = new Date();
    let ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Anchorage',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(today);
    let parts = ymd.split('-');
    let calYear = parseInt(parts[0], 10);
    if (year > calYear) {
      throw new Error('fdr_duty_year_not_started');
    }
    let err = new Error('fdr_duty_no_months_written');
    err.dutyMonths = months;
    err.indexDocCount = dutyResult.indexDocCount;
    throw err;
  }
  return {monthsWithDaysOff, indexDocCount: dutyResult.indexDocCount};
}

export async function clearComputedDutyForYear(year) {
  if (!FdrComputedDuty) return;
  await FdrComputedDuty.destroy({where: {year}});
}
