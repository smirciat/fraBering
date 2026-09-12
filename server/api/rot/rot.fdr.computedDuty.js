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
    return {
      byPilotMonth: {},
      byEmployeeMonth: {},
      syncedPilotKeys: {},
      syncedAtByPilot: {},
      indexMissingPilotKeys: {},
      sparseCalendarPilotKeys: {},
      lastSyncedAt: null
    };
  }
  let rows = await FdrComputedDuty.findAll({where: {year}});
  let byPilotMonth = {};
  let byEmployeeMonth = {};
  let syncedPilotKeys = {};
  let syncedAtByPilot = {};
  let indexMissingPilotKeys = {};
  let sparseCalendarPilotKeys = {};
  let lastSyncedAt = null;

  rows.forEach(r => {
    let pilotKey = normalizePilotName(r.pilotName);
    let source = String(r.source || '');
    let hasNumber = r.daysOff !== null && r.daysOff !== undefined;
    if (source === 'no_index') {
      indexMissingPilotKeys[pilotKey] = true;
    } else if (source === 'sparse_index') {
      sparseCalendarPilotKeys[pilotKey] = true;
      indexMissingPilotKeys[pilotKey] = true;
    } else if (hasNumber) {
      syncedPilotKeys[pilotKey] = true;
    }
    if (r.syncedAt && (hasNumber || source === 'no_index' || source === 'sparse_index')) {
      let t = new Date(r.syncedAt).getTime();
      if (!syncedAtByPilot[pilotKey] || t > new Date(syncedAtByPilot[pilotKey]).getTime()) {
        syncedAtByPilot[pilotKey] = r.syncedAt;
      }
    }
    let entry = {
      daysOff: r.daysOff,
      claimedCount: r.claimedCount,
      source: source
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

  return {byPilotMonth, byEmployeeMonth, syncedPilotKeys, syncedAtByPilot, indexMissingPilotKeys, sparseCalendarPilotKeys, lastSyncedAt};
}

export function pilotHasComputedDuty(syncedPilotKeys, pilotName) {
  return !!(syncedPilotKeys && syncedPilotKeys[normalizePilotName(pilotName)]);
}

export function pilotDutySyncedAt(syncedAtByPilot, pilotName) {
  if (!syncedAtByPilot) return null;
  return syncedAtByPilot[normalizePilotName(pilotName)] || null;
}

async function writeDutyMonths(year, rosterName, eid, months, claimedByMonth, source, syncedBy, now) {
  for (let m = 1; m <= 12; m++) {
    let daysOff = months[m] !== undefined ? months[m] : null;
    let claimedCount = claimedByMonth[m] !== undefined ? claimedByMonth[m] : null;
    let existing = await FdrComputedDuty.findOne({
      where: {year, pilotName: rosterName, month: m}
    });
    if (!existing && eid) {
      existing = await FdrComputedDuty.findOne({
        where: {year, employeeId: eid, month: m}
      });
    }
    let payload = {
      pilotName: rosterName,
      daysOff,
      claimedCount,
      employeeId: eid,
      syncedAt: now,
      syncedBy: syncedBy || '',
      source: source
    };
    if (existing) {
      await existing.update(payload);
    } else {
      await FdrComputedDuty.create(Object.assign({year, month: m}, payload));
    }
  }
}

export function dutyHasIndexOrFlightSignal(dutyResult) {
  if (!dutyResult) return false;
  if (dutyResult.hasAnyIndex) return true;
  return (dutyResult.flightDutyDatesInYear || 0) > 0;
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

  if (!dutyHasIndexOrFlightSignal(dutyResult)) {
    let emptyMonths = {};
    let emptyClaimed = {};
    for (let m = 1; m <= 12; m++) {
      emptyMonths[m] = null;
      emptyClaimed[m] = 0;
    }
    await writeDutyMonths(year, rosterName, eid, emptyMonths, emptyClaimed, 'no_index', syncedBy, now);
    return {monthsWithDaysOff: 0, indexDocCount: dutyResult.indexDocCount || 0, indexMissing: true};
  }

  if (dutyResult.calendarSparse) {
    let emptyMonths = {};
    let emptyClaimed = {};
    for (let m = 1; m <= 12; m++) {
      emptyMonths[m] = null;
      emptyClaimed[m] = 0;
    }
    await writeDutyMonths(year, rosterName, eid, emptyMonths, emptyClaimed, 'sparse_index', syncedBy, now);
    return {
      monthsWithDaysOff: 0,
      indexDocCount: dutyResult.indexDocCount || 0,
      indexMissing: true,
      calendarSparse: true,
      onDatesInYear: dutyResult.onDatesInYear || 0
    };
  }

  let monthsWithDaysOff = 0;
  for (let m = 1; m <= 12; m++) {
    let daysOff = months[m] !== undefined ? months[m] : null;
    if (daysOff !== null && daysOff !== undefined) monthsWithDaysOff += 1;
  }
  if (monthsWithDaysOff < 1) {
    await FdrComputedDuty.destroy({where: {year, pilotName: rosterName}});
    let err = new Error('fdr_duty_no_months_written');
    err.dutyMonths = months;
    err.indexDocCount = dutyResult.indexDocCount;
    err.dutySnapshotAk = dutyResult.dutySnapshotAk;
    throw err;
  }
  await writeDutyMonths(year, rosterName, eid, months, claimedByMonth, 'union', syncedBy, now);
  return {monthsWithDaysOff, indexDocCount: dutyResult.indexDocCount, indexMissing: false};
}

export async function clearComputedDutyForYear(year) {
  if (!FdrComputedDuty) return;
  await FdrComputedDuty.destroy({where: {year}});
}
