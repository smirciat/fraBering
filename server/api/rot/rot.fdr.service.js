'use strict';

import {FdrPilot, FdrDaysOff, FdrImportHour, FdrHourNote} from '../../sqldb';
import {
  MONTHS, QUARTERS, buildHoursRow, buildDaysOffRow, sumPilotHourRows,
  normalizePilotName, num, roundHour
} from './rot.fdr.math.js';
import {ensureFdrImported, COMPUTED_HOURS_FROM_YEAR, STATIC_HOURS_THROUGH_YEAR} from './rot.fdr.import.js';
import {computeHoursForEmployeeIds} from './rot.fdr.hours.js';
import {computeDutyForEmployeeYear} from './rot.fdr.duty.js';
import {filterFdrTabYears, alaskaCalendarYear, snapshotTodayForFdrYear, formatSnapshotTodayAk} from './rot.fdr.calendar.js';
import {runComputeOnce} from './rot.fdr.cache.js';
import {
  loadComputedHoursState, upsertComputedHoursForPilot, clearComputedHoursForYear,
  filterRosterForSyncScope, pilotHasComputedHours, pilotSyncedAt, sectionsForBase
} from './rot.fdr.computed.js';
import {
  loadComputedDutyState, upsertComputedDutyForPilot, clearComputedDutyForYear,
  pilotHasComputedDuty, pilotDutySyncedAt, dutyHasIndexOrFlightSignal
} from './rot.fdr.computedDuty.js';
import {loadFirebasePilots} from './rot.fdr.firebaseQuery.js';
import {buildPilotEmployeeIndex, matchPilotEmployeeId} from './rot.fdr.pilotMatch.js';
import {
  listFdrSectionNames, saveFdrRoster, copyFdrRosterFromYear
} from './rot.fdr.roster.js';
import {
  buildPilotMonthStatus, countIncompletePilotMonths, monthColumnHasIncomplete,
  isMonthInAuditScope, valuePresent
} from './rot.fdr.completion.js';
import {buildPilotLimits, limitAppliesToComputedYears} from './rot.fdr.limits.js';
import {loadFdrYearSettings, setFdrYearHoursLocked} from './rot.fdr.settings.js';
import {canManageFdrYearLock} from './rot.access.js';
import {
  loadMonthAuditMap, monthAuditRowsForPilot, saveMonthAuditEntries
} from './rot.fdr.monthAudit.js';
import {
  buildFdrYearXlsxBuffer, buildFdrSummaryXlsxBuffer, buildFdrWorkbookXlsxBuffer,
  fdrExportFilename
} from './rot.fdr.export.js';

const fdrModels = {FdrPilot, FdrDaysOff, FdrImportHour, FdrHourNote};

async function distinctFdrPilotYears() {
  let sequelize = FdrPilot.sequelize;
  let rows = await FdrPilot.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('year')), 'year']],
    order: [[sequelize.col('year'), 'ASC']],
    raw: true
  });
  let years = [];
  rows.forEach(r => {
    let y = parseInt(r.year, 10);
    if (Number.isFinite(y)) years.push(y);
  });
  return years;
}

/** UI year tabs: hide sheet years after Alaska calendar year; never return [] if roster has years. */
function fdrYearsForUiTabs(dbYears) {
  let all = dbYears || [];
  if (!all.length) return [];
  let visible = filterFdrTabYears(all);
  if (visible.length) return visible;
  let cap = alaskaCalendarYear();
  visible = all.filter(y => y <= cap);
  if (visible.length) return visible;
  console.log('fdr meta: tab filter left no years; roster', all.join(','), 'alaskaYear', cap);
  return all.slice();
}

async function loadDaysOffMap(year) {
  let rows = await FdrDaysOff.findAll({where: {year}});
  let map = {};
  rows.forEach(r => {
    let key = normalizePilotName(r.pilotName);
    if (!map[key]) map[key] = {};
    map[key][r.month] = r.daysOff;
  });
  return map;
}

async function loadImportHoursMap(year) {
  let rows = await FdrImportHour.findAll({where: {year}});
  let map = {};
  rows.forEach(r => {
    let key = normalizePilotName(r.pilotName);
    if (!map[key]) map[key] = {};
    map[key][r.month] = r.hours;
  });
  return map;
}

async function loadHourNotesMap(year) {
  if (!FdrHourNote) return {};
  let rows = await FdrHourNote.findAll({where: {year}});
  let map = {};
  rows.forEach(r => {
    let key = normalizePilotName(r.pilotName);
    if (!map[key]) map[key] = {};
    map[key][r.month] = r.note;
  });
  return map;
}

function hourNotesForPilot(notesMap, pilotName) {
  let ints = notesMap[normalizePilotName(pilotName)] || {};
  let hourNotes = {};
  MONTHS.forEach((m, idx) => {
    let n = ints[idx + 1];
    hourNotes[m] = n ? String(n) : '';
  });
  return hourNotes;
}

function hoursFromMonthInts(monthInts) {
  let map = {};
  for (let m = 1; m <= 12; m++) {
    let v = monthInts[m];
    map[MONTHS[m - 1]] = (v === null || v === undefined) ? null : v;
  }
  return buildHoursRow(map);
}

function compareAlerts(year, pilots, importHoursMap) {
  if (year < COMPUTED_HOURS_FROM_YEAR) return [];
  let alerts = [];
  pilots.forEach(p => {
    if (!p.hoursFromFirebase) return;
    let key = normalizePilotName(p.name);
    let imp = importHoursMap[key] || {};
    MONTHS.forEach((m, idx) => {
      let month = idx + 1;
      let imported = imp[month];
      if (imported === null || imported === undefined || imported === '') return;
      let impN = num(imported);
      let computed = p.hours && p.hours.months ? num(p.hours.months[m]) : 0;
      if (impN >= 5 && computed < impN * 0.85) {
        alerts.push({
          pilotName: p.name,
          month,
          imported: roundHour(impN),
          computed: roundHour(computed),
          kind: 'low'
        });
      } else if (impN >= 5 && computed > impN * 1.15) {
        alerts.push({
          pilotName: p.name,
          month,
          imported: roundHour(impN),
          computed: roundHour(computed),
          kind: 'high'
        });
      }
    });
  });
  return alerts.slice(0, 50);
}

function compareDutyAlerts(year, pilots, daysMap) {
  if (year < COMPUTED_HOURS_FROM_YEAR) return [];
  let alerts = [];
  pilots.forEach(p => {
    if (!p.dutyFromFirebase) return;
    if (p.dutyIndexMissing || p.dutyCalendarSparse) return;
    let key = normalizePilotName(p.name);
    let imp = daysMap[key] || {};
    MONTHS.forEach((m, idx) => {
      let month = idx + 1;
      if (!isMonthInAuditScope(year, month)) return;
      if (p.dutyAudit && p.dutyAudit[m] && p.dutyAudit[m].overrideDaysOff !== null &&
          p.dutyAudit[m].overrideDaysOff !== undefined && p.dutyAudit[m].overrideDaysOff !== '') {
        return;
      }
      let imported = imp[month];
      let importPresent = valuePresent(imported);
      let impN = importPresent ? Math.round(num(imported)) : null;
      let dutyVal = p.duty && p.duty.months ? p.duty.months[m] : null;
      let computedPresent = valuePresent(dutyVal);
      let computed = computedPresent ? Math.round(num(dutyVal)) : null;
      if (!importPresent && !computedPresent) return;
      if (!importPresent && computedPresent) {
        alerts.push({
          pilotName: p.name,
          month,
          imported: null,
          computed,
          kind: 'missing_import'
        });
        return;
      }
      if (importPresent && !computedPresent) {
        alerts.push({
          pilotName: p.name,
          month,
          imported: impN,
          computed: null,
          kind: 'missing_firebase'
        });
        return;
      }
      if (computed === impN) return;
      alerts.push({
        pilotName: p.name,
        month,
        imported: impN,
        computed,
        kind: computed > impN ? 'high' : 'low'
      });
    });
  });
  return alerts.slice(0, 50);
}

function sectionTotalLabel(title) {
  let t = String(title || '').toUpperCase();
  if (t.indexOf('NOME PIC') >= 0) return 'Total OME PIC';
  if (t.indexOf('NOME SIC') >= 0) return 'Total OME SIC';
  if (t.indexOf('ROTOR') >= 0) return 'Total ROTORWING';
  if (t.indexOf('KOTZ') >= 0) return 'Total OTZ PIC';
  if (t.indexOf('OME') >= 0 && t.indexOf('PILOT') >= 0) return 'Total OME PIC';
  if (t.indexOf('OTZ') >= 0) return 'Total OTZ PIC';
  return 'Total ' + title;
}

export async function getFdrMeta() {
  await ensureFdrImported(fdrModels);
  let yearList = fdrYearsForUiTabs(await distinctFdrPilotYears());
  let sections = await listFdrSectionNames();
  if (!yearList.length) {
    return {
      years: [],
      sections,
      computedHoursFromYear: COMPUTED_HOURS_FROM_YEAR,
      rosterEditableFromYear: COMPUTED_HOURS_FROM_YEAR,
      staticHoursThroughYear: STATIC_HOURS_THROUGH_YEAR
    };
  }
  return {
    years: yearList,
    sections,
    computedHoursFromYear: COMPUTED_HOURS_FROM_YEAR,
    rosterEditableFromYear: COMPUTED_HOURS_FROM_YEAR,
    staticHoursThroughYear: STATIC_HOURS_THROUGH_YEAR
  };
}

export async function updateFdrRoster(year, pilots) {
  await saveFdrRoster(year, pilots);
  return buildFdrYear(year);
}

export async function copyFdrRoster(year, fromYear, options) {
  await copyFdrRosterFromYear(year, fromYear, options);
  return buildFdrYear(year);
}

async function companyTotalsFromImportHours(year) {
  let rows = await FdrImportHour.findAll({where: {year}});
  let ints = {};
  rows.forEach(r => {
    ints[r.month] = (ints[r.month] || 0) + num(r.hours);
  });
  return hoursFromMonthInts(ints);
}

export async function saveDaysOffEntries(year, entries, userName) {
  for (let i = 0; i < entries.length; i++) {
    let item = entries[i] || {};
    let pilotName = String(item.pilotName || '').trim();
    let month = parseInt(item.month, 10);
    if (!pilotName || !month || month < 1 || month > 12) continue;
    let daysOff = item.daysOff;
    if (daysOff === '' || daysOff === null || daysOff === undefined) {
      await FdrDaysOff.destroy({where: {year, pilotName, month}});
      continue;
    }
    let val = parseInt(daysOff, 10);
    if (!Number.isFinite(val)) continue;
    let existing = await FdrDaysOff.findOne({where: {year, pilotName, month}});
    if (existing) {
      await existing.update({daysOff: val, updatedBy: userName || ''});
    } else {
      await FdrDaysOff.create({
        year,
        pilotName,
        month,
        daysOff: val,
        updatedBy: userName || ''
      });
    }
  }
  return buildFdrYear(year);
}

export async function saveMonthAuditEntriesForYear(year, entries, userName) {
  await saveMonthAuditEntries(year, entries, userName);
  return buildFdrYear(year);
}

export async function saveHourNoteEntries(year, entries, userName) {
  if (!FdrHourNote) {
    throw new Error('hour_notes_unavailable');
  }
  if (year < COMPUTED_HOURS_FROM_YEAR) {
    throw new Error('hour_notes_readonly');
  }
  for (let i = 0; i < entries.length; i++) {
    let item = entries[i] || {};
    let pilotName = String(item.pilotName || '').trim();
    let month = parseInt(item.month, 10);
    if (!pilotName || !month || month < 1 || month > 12) continue;
    let note = item.note;
    if (note === '' || note === null || note === undefined) {
      await FdrHourNote.destroy({where: {year, pilotName, month}});
      continue;
    }
    let text = String(note).trim();
    if (!text) {
      await FdrHourNote.destroy({where: {year, pilotName, month}});
      continue;
    }
    let existing = await FdrHourNote.findOne({where: {year, pilotName, month}});
    if (existing) {
      await existing.update({note: text, updatedBy: userName || ''});
    } else {
      await FdrHourNote.create({
        year,
        pilotName,
        month,
        note: text,
        updatedBy: userName || ''
      });
    }
  }
  return buildFdrYear(year);
}

function rosterEmployeeIds(roster, employeeKeyIndex, fbPilots) {
  let seen = {};
  let ids = [];
  (roster || []).forEach(r => {
    let eid = r.employeeId || matchPilotEmployeeId(r.pilotName, employeeKeyIndex, fbPilots);
    if (!eid) return;
    let s = String(eid);
    if (seen[s]) return;
    seen[s] = true;
    ids.push(s);
  });
  return ids;
}

function employeeHoursCached(cached, eid) {
  if (!cached || !eid) return false;
  let s = String(eid);
  if (cached[s] !== undefined) return true;
  if (/^\d+$/.test(s) && cached[String(parseInt(s, 10))] !== undefined) return true;
  return false;
}

function resolveCachedMonthHours(cached, eid) {
  if (!cached || !eid) return null;
  let s = String(eid);
  if (cached[s] !== undefined) return cached[s];
  if (/^\d+$/.test(s)) {
    let n = String(parseInt(s, 10));
    if (cached[n] !== undefined) return cached[n];
  }
  return null;
}

function firstUnsyncedPilotOffset(syncRoster, syncedPilotKeys, fromIndex) {
  let start = Math.max(0, parseInt(fromIndex, 10) || 0);
  for (let i = start; i < (syncRoster || []).length; i++) {
    if (!pilotHasComputedHours(syncedPilotKeys, syncRoster[i].pilotName)) {
      return i;
    }
  }
  return (syncRoster || []).length;
}

function buildSyncProgress(syncRoster, syncedPilotKeys, batchOffset, batchLimit, extra) {
  let total = (syncRoster || []).length;
  let processed = (syncRoster || []).filter(r => pilotHasComputedHours(syncedPilotKeys, r.pilotName)).length;
  let nextOffset = firstUnsyncedPilotOffset(syncRoster, syncedPilotKeys, 0);
  let done = total === 0 || processed >= total || nextOffset >= total;
  let progress = {
    done: done,
    processed: processed,
    total: total,
    nextOffset: nextOffset
  };
  if (extra) Object.assign(progress, extra);
  return progress;
}

function rosterPilotByEmployeeId(roster, employeeKeyIndex, fbPilots) {
  let map = {};
  (roster || []).forEach(r => {
    let eid = r.employeeId || matchPilotEmployeeId(r.pilotName, employeeKeyIndex, fbPilots);
    if (!eid) return;
    let s = String(eid);
    map[s] = r;
    if (/^\d+$/.test(s)) map[String(parseInt(s, 10))] = r;
  });
  return map;
}

async function buildPriorYearQ4HoursMap(year, roster, employeeKeyIndex, fbPilots) {
  let map = {};
  if (year < COMPUTED_HOURS_FROM_YEAR) return map;
  let py = year - 1;
  let importMap = await loadImportHoursMap(py);
  let pgState = await loadComputedHoursState(py);
  roster.forEach(row => {
    let key = normalizePilotName(row.pilotName);
    let q4 = null;
    if (pilotHasComputedHours(pgState.syncedPilotKeys, row.pilotName)) {
      let eid = row.employeeId || matchPilotEmployeeId(row.pilotName, employeeKeyIndex, fbPilots);
      let mh = resolveCachedMonthHours(pgState.byEmployee, eid);
      if (mh) {
        q4 = roundHour(num(mh[10]) + num(mh[11]) + num(mh[12]));
      }
    } else {
      let imp = importMap[key] || {};
      if (imp[10] !== undefined || imp[11] !== undefined || imp[12] !== undefined) {
        q4 = roundHour(num(imp[10]) + num(imp[11]) + num(imp[12]));
      }
    }
    map[key] = q4;
  });
  return map;
}

function importHoursRow(importHoursMap, pilotName) {
  let imp = importHoursMap[normalizePilotName(pilotName)] || {};
  let monthMap = {};
  MONTHS.forEach((m, idx) => {
    let v = imp[idx + 1];
    monthMap[m] = (v === null || v === undefined) ? null : v;
  });
  return buildHoursRow(monthMap);
}

export async function updateFdrYearSettings(year, hoursLocked, user) {
  await ensureFdrImported(fdrModels);
  let userName = user && (user.name || user.email) ? (user.name || user.email) : '';
  await setFdrYearHoursLocked(year, !!hoursLocked, userName);
  return buildFdrYear(year, {viewer: user});
}

export async function computeFdrYearHours(year, options) {
  options = options || {};
  let offset = Math.max(0, parseInt(options.offset, 10) || 0);
  let limit = Math.min(4, Math.max(1, parseInt(options.limit, 10) || 1));
  let continuePrior = !!options.continue;
  let scope = options.scope || 'all';

  let computeOnceKey = scope === 'all'
    ? 'all'
    : scope + ':' + String(options.pilotName || options.base || options.section || '') + ':' + offset;
  return runComputeOnce('fdr-hours-' + year, async () => {
    await ensureFdrImported(fdrModels);
    let yearSettings = await loadFdrYearSettings(year);
    if (yearSettings.hoursLocked) {
      throw new Error('hours_locked');
    }
    let roster = await FdrPilot.findAll({
      where: {year},
      order: [['sortOrder', 'ASC']]
    });
    if (!roster.length) throw new Error('no_data');

    let fbPilots = await loadFirebasePilots();
    let employeeKeyIndex = buildPilotEmployeeIndex(fbPilots);
    let syncRoster = filterRosterForSyncScope(roster, scope, options);
    if (!syncRoster.length) throw new Error('no_pilots_in_scope');

    let pilotByEid = rosterPilotByEmployeeId(syncRoster, employeeKeyIndex, fbPilots);
    let ids = rosterEmployeeIds(syncRoster, employeeKeyIndex, fbPilots);

    if (scope === 'all' && offset === 0 && !continuePrior && options.replaceAll) {
      await clearComputedHoursForYear(year);
      await clearComputedDutyForYear(year);
    }

    let pgBeforeSync = await loadComputedHoursState(year);
    let scopedSync = scope === 'pilot' || scope === 'section' || scope === 'base';
    let startOffset;
    if (scopedSync) {
      startOffset = Math.max(0, parseInt(offset, 10) || 0);
      if (startOffset >= syncRoster.length) {
        let builtEarly = await buildFdrYear(year, {viewer: options.viewer});
        if (!builtEarly) throw new Error('no_data');
        builtEarly.hoursCompute = buildSyncProgress(syncRoster, pgBeforeSync.syncedPilotKeys, startOffset, limit);
        builtEarly.hoursCompute.syncedPilotNames = [];
        builtEarly.hoursCompute.done = true;
        builtEarly.hoursPending = false;
        return builtEarly;
      }
    } else {
      startOffset = continuePrior
        ? firstUnsyncedPilotOffset(syncRoster, pgBeforeSync.syncedPilotKeys, offset)
        : firstUnsyncedPilotOffset(syncRoster, pgBeforeSync.syncedPilotKeys, 0);
      if (startOffset >= syncRoster.length) {
        let builtEarly = await buildFdrYear(year, {viewer: options.viewer});
        if (!builtEarly) throw new Error('no_data');
        builtEarly.hoursCompute = buildSyncProgress(syncRoster, pgBeforeSync.syncedPilotKeys, startOffset, limit);
        builtEarly.hoursCompute.syncedPilotNames = [];
        builtEarly.hoursPending = false;
        return builtEarly;
      }
    }
    let sliceRoster = syncRoster.slice(startOffset, startOffset + limit);
    let todoIds = [];
    sliceRoster.forEach(r => {
      let eid = r.employeeId || matchPilotEmployeeId(r.pilotName, employeeKeyIndex, fbPilots);
      if (eid) todoIds.push(String(eid));
    });

    if (scope === 'all' && continuePrior) {
      todoIds = todoIds.filter(eid => {
        let row = pilotByEid[eid];
        return row && !pilotHasComputedHours(pgBeforeSync.syncedPilotKeys, row.pilotName);
      });
    }

    let t0 = Date.now();
    let snapNow = snapshotTodayForFdrYear(year);
    console.log(
      'fdr compute-hours', year, 'scope', scope, 'startOffset', startOffset, 'todo', todoIds.length,
      'alaskaYear', alaskaCalendarYear(), 'dutySnap', formatSnapshotTodayAk(snapNow) || 'null'
    );
    let syncedPilotNames = [];
    let dutySyncFailed = [];
    let dutySyncReport = [];
    let justSyncedDuty = {};
    let stallExtra = null;
    if (sliceRoster.length && !todoIds.length) {
      let row = sliceRoster[0];
      let name = row && row.pilotName ? row.pilotName : '';
      console.log('fdr compute-hours stall: no Firebase employee match', year, name);
      stallExtra = {
        stalled: true,
        stalledPilotName: name,
        stallReason: 'no_employee_match'
      };
    } else if (todoIds.length) {
      let partial = await computeHoursForEmployeeIds(todoIds, year, 1);
      let syncedBy = options.syncedBy || '';
      await Promise.all(Object.keys(partial).map(eid => {
        let row = pilotByEid[eid] || pilotByEid[String(parseInt(eid, 10))];
        if (!row) return Promise.resolve();
        syncedPilotNames.push(row.pilotName);
        return upsertComputedHoursForPilot(year, row.pilotName, eid, partial[eid], syncedBy)
          .then(() => computeDutyForEmployeeYear(eid, year))
          .then(duty => {
            justSyncedDuty[normalizePilotName(row.pilotName)] = duty;
            if (duty.sheetYearNotStarted) {
              dutySyncReport.push({
                pilotName: row.pilotName,
                dutySkipped: 'sheet_year_not_started',
                dutySkippedDetail: year + ' days off stay blank until ' + year + '-01-01 Alaska'
              });
              return;
            }
            return upsertComputedDutyForPilot(year, row.pilotName, eid, duty, syncedBy)
              .then(stats => {
                if (stats && stats.calendarSparse) {
                  dutySyncReport.push({
                    pilotName: row.pilotName,
                    dutySkipped: 'sparse_duty_calendar',
                    dutySkippedDetail: 'Too few ON days in the duty index — enter days off from paper F&D',
                    indexDocCount: duty.indexDocCount || 0,
                    onDatesInYear: duty.onDatesInYear || 0,
                    hasAnyIndex: !!duty.hasAnyIndex
                  });
                  return;
                }
                if (stats && stats.indexMissing) {
                  dutySyncReport.push({
                    pilotName: row.pilotName,
                    dutySkipped: 'no_duty_index',
                    dutySkippedDetail: 'No flightIndex docs for this employee — enter days off manually',
                    indexDocCount: duty.indexDocCount || 0,
                    hasAnyIndex: false
                  });
                  return;
                }
                dutySyncReport.push({
                  pilotName: row.pilotName,
                  indexDocCount: duty.indexDocCount,
                  hasAnyIndex: duty.hasAnyIndex,
                  dutyMonthsSaved: stats.monthsWithDaysOff,
                  dutySnapshotAk: duty.dutySnapshotAk
                });
              });
          })
          .catch(err => {
            let msg = err && err.message ? String(err.message) : 'duty_sync_failed';
            console.log('fdr duty sync failed', year, eid, row.pilotName, msg);
            dutySyncFailed.push({pilotName: row.pilotName, employeeId: eid, message: msg});
          });
      }));
    }
    if (!stallExtra && todoIds.length && !syncedPilotNames.length) {
      let row = sliceRoster[0];
      stallExtra = {
        stalled: true,
        stalledPilotName: row && row.pilotName ? row.pilotName : '',
        stallReason: 'sync_no_pilot_saved'
      };
    }
    console.log('fdr compute-hours firebase', year, 'ms', Date.now() - t0);

    let built = await buildFdrYear(year, {viewer: options.viewer});
    if (!built) throw new Error('no_data');
    overlayJustSyncedDuty(built, justSyncedDuty);

    let pgAfter = await loadComputedHoursState(year);
    let progress = buildSyncProgress(syncRoster, pgAfter.syncedPilotKeys, offset, limit, stallExtra);
    progress.syncedPilotNames = syncedPilotNames;
    if (dutySyncFailed.length) progress.dutySyncFailed = dutySyncFailed;
    if (dutySyncReport.length) progress.dutySyncReport = dutySyncReport;
    if (scopedSync && !stallExtra) {
      let advanced = startOffset + sliceRoster.length;
      progress.nextOffset = advanced;
      progress.done = advanced >= syncRoster.length;
      progress.processed = Math.min(syncRoster.length, advanced);
    }
    if (stallExtra && stallExtra.stalled) {
      progress.done = true;
    }
    built.hoursCompute = progress;
    built.hoursPending = false;
    return built;
  }, computeOnceKey);
}

export async function buildFdrYear(year, options) {
  options = options || {};
  await ensureFdrImported(fdrModels);
  let roster = await FdrPilot.findAll({
    where: {year},
    order: [['sortOrder', 'ASC']]
  });
  if (!roster.length) {
    return null;
  }

  let daysMap = await loadDaysOffMap(year);
  let importHoursMap = await loadImportHoursMap(year);
  let hourNotesMap = await loadHourNotesMap(year);
  let useComputed = year >= COMPUTED_HOURS_FROM_YEAR;
  let computedByEmployee = {};
  let fbPilots = [];
  let employeeKeyIndex = {};
  let hoursPending = false;
  let hoursSource = useComputed ? 'import' : 'static';
  let hoursLastSyncedAt = null;
  let syncedPilotKeys = {};
  let syncedAtByPilot = {};
  let dutyByPilotMonth = {};
  let dutyByEmployeeMonth = {};
  let dutySyncedPilotKeys = {};
  let dutySyncedAtByPilot = {};
  let dutyIndexMissingPilotKeys = {};
  let dutySparseCalendarPilotKeys = {};
  let dutyLastSyncedAt = null;

  if (useComputed) {
    let pgState = await loadComputedHoursState(year);
    computedByEmployee = pgState.byEmployee;
    syncedPilotKeys = pgState.syncedPilotKeys;
    syncedAtByPilot = pgState.syncedAtByPilot || {};
    hoursLastSyncedAt = pgState.lastSyncedAt;

    fbPilots = await loadFirebasePilots();
    employeeKeyIndex = buildPilotEmployeeIndex(fbPilots);

    let syncedCount = roster.filter(r => pilotHasComputedHours(syncedPilotKeys, r.pilotName)).length;
    let hasAny = syncedCount > 0;
    let hasFull = roster.length > 0 && syncedCount === roster.length;

    if (hasFull) {
      hoursSource = 'firebase';
    } else if (hasAny) {
      hoursSource = 'firebase_partial';
    } else {
      hoursSource = 'import';
      computedByEmployee = {};
    }

    let dutyState = await loadComputedDutyState(year);
    dutyByPilotMonth = dutyState.byPilotMonth;
    dutyByEmployeeMonth = dutyState.byEmployeeMonth || {};
    dutySyncedPilotKeys = dutyState.syncedPilotKeys;
    dutySyncedAtByPilot = dutyState.syncedAtByPilot || {};
    dutyIndexMissingPilotKeys = dutyState.indexMissingPilotKeys || {};
    dutySparseCalendarPilotKeys = dutyState.sparseCalendarPilotKeys || {};
    dutyLastSyncedAt = dutyState.lastSyncedAt;
  }

  let priorQ4Map = {};
  if (useComputed && year >= COMPUTED_HOURS_FROM_YEAR) {
    priorQ4Map = await buildPriorYearQ4HoursMap(year, roster, employeeKeyIndex, fbPilots);
  }

  let yearSettings = useComputed ? await loadFdrYearSettings(year) : {hoursLocked: false};
  let monthAuditMap = useComputed ? await loadMonthAuditMap(year) : {};

  return assembleFdrYearPayload(
    year, roster, daysMap, importHoursMap, hourNotesMap, useComputed,
    computedByEmployee, fbPilots, employeeKeyIndex, syncedPilotKeys, syncedAtByPilot, priorQ4Map,
    dutyByPilotMonth, dutyByEmployeeMonth, dutySyncedPilotKeys, dutySyncedAtByPilot,
    dutyIndexMissingPilotKeys, dutySparseCalendarPilotKeys, monthAuditMap,
    {
      hoursPending,
      hoursSource,
      hoursLastSyncedAt,
      dutyLastSyncedAt,
      hoursLocked: !!yearSettings.hoursLocked,
      hoursLockedAt: yearSettings.lockedAt,
      hoursLockedBy: yearSettings.lockedBy,
      hoursLockEditable: options.viewer ? canManageFdrYearLock(options.viewer) : false
    }
  );
}

function dutyMonthEntry(dutyMonths, month) {
  if (!dutyMonths) return null;
  return dutyMonths[month] || dutyMonths[String(month)] || null;
}

function resolveDutyMonthsMap(byPilotMonth, byEmployeeMonth, pilotName, employeeId) {
  let key = normalizePilotName(pilotName);
  let dutyMonths = (byPilotMonth && byPilotMonth[key]) || {};
  let hasValues = false;
  for (let m = 1; m <= 12; m++) {
    let entry = dutyMonthEntry(dutyMonths, m);
    if (entry && entry.daysOff !== null && entry.daysOff !== undefined) {
      hasValues = true;
      break;
    }
  }
  if (!hasValues && employeeId && byEmployeeMonth) {
    let ek = String(employeeId);
    dutyMonths = byEmployeeMonth[ek] || byEmployeeMonth[String(parseInt(ek, 10))] || {};
  }
  return dutyMonths;
}

function buildDaysOffRowForPilot(manualMonthInts, byPilotMonth, byEmployeeMonth, pilotName, employeeId, hasDutySynced) {
  if (!hasDutySynced) return buildDaysOffRow(manualMonthInts || {});
  let dutyMonths = resolveDutyMonthsMap(byPilotMonth, byEmployeeMonth, pilotName, employeeId);
  let merged = {};
  for (let m = 1; m <= 12; m++) {
    let entry = dutyMonthEntry(dutyMonths, m);
    if (entry && entry.daysOff !== null && entry.daysOff !== undefined) {
      merged[m] = entry.daysOff;
    } else {
      merged[m] = manualMonthInts && manualMonthInts[m] !== undefined ? manualMonthInts[m] : null;
    }
  }
  return buildDaysOffRow(merged);
}

function overlayJustSyncedDuty(built, justSyncedDuty) {
  if (!built || !built.sections || !justSyncedDuty) return;
  (built.sections || []).forEach(function(sec) {
    (sec.pilots || []).forEach(function(p) {
      if (!p || !p.name) return;
      let duty = justSyncedDuty[normalizePilotName(p.name)];
      if (!duty) return;
      if (duty.sheetYearNotStarted) return;
      if (!dutyHasIndexOrFlightSignal(duty) || duty.calendarSparse) {
        p.dutyIndexMissing = true;
        p.dutyCalendarSparse = !!duty.calendarSparse;
        p.dutyFromFirebase = false;
        p.dutySyncNeeded = false;
        p.daysOffEditable = true;
        return;
      }
      p.duty = buildDaysOffRow(duty.months || {});
      p.dutyFromFirebase = true;
      p.dutySyncNeeded = false;
      p.dutyIndexMissing = false;
      p.dutyCalendarSparse = false;
      p.daysOffEditable = false;
      if (p.dutyAudit) p.duty = applyDutyAuditOverrides(p.duty, p.dutyAudit);
    });
  });
}

function applyDutyAuditOverrides(daysOff, dutyAudit) {
  if (!daysOff || !dutyAudit) return daysOff;
  let monthInts = {};
  MONTHS.forEach((m, idx) => {
    let cell = dutyAudit[m];
    let ov = cell && cell.overrideDaysOff;
    if (ov !== null && ov !== undefined && ov !== '') {
      monthInts[idx + 1] = parseInt(ov, 10);
    } else {
      let v = daysOff.months ? daysOff.months[m] : null;
      monthInts[idx + 1] = v;
    }
  });
  return buildDaysOffRow(monthInts);
}

function assembleFdrYearPayload(year, roster, daysMap, importHoursMap, hourNotesMap, useComputed, computedByEmployee, fbPilots, employeeKeyIndex, syncedPilotKeys, syncedAtByPilot, priorQ4Map, dutyByPilotMonth, dutyByEmployeeMonth, dutySyncedPilotKeys, dutySyncedAtByPilot, dutyIndexMissingPilotKeys, dutySparseCalendarPilotKeys, monthAuditMap, meta) {
  meta = meta || {};
  syncedPilotKeys = syncedPilotKeys || {};
  syncedAtByPilot = syncedAtByPilot || {};
  priorQ4Map = priorQ4Map || {};
  dutyByPilotMonth = dutyByPilotMonth || {};
  dutyByEmployeeMonth = dutyByEmployeeMonth || {};
  dutySyncedPilotKeys = dutySyncedPilotKeys || {};
  dutySyncedAtByPilot = dutySyncedAtByPilot || {};
  dutyIndexMissingPilotKeys = dutyIndexMissingPilotKeys || {};
  dutySparseCalendarPilotKeys = dutySparseCalendarPilotKeys || {};
  let sections = [];
  let sectionOrder = [];
  let sectionMap = {};
  roster.forEach(row => {
    if (!sectionMap[row.section]) {
      sectionMap[row.section] = {title: row.section, pilots: []};
      sectionOrder.push(row.section);
    }
    let key = normalizePilotName(row.pilotName);
    let monthInts = daysMap[key] || {};
    let eid = useComputed
      ? (row.employeeId || matchPilotEmployeeId(row.pilotName, employeeKeyIndex, fbPilots))
      : null;
    let hasDutySynced = useComputed && pilotHasComputedDuty(dutySyncedPilotKeys, row.pilotName);
    let dutyIndexMissing = useComputed && !!dutyIndexMissingPilotKeys[key];
    let dutyCalendarSparse = useComputed && !!dutySparseCalendarPilotKeys[key];
    let daysOff = buildDaysOffRowForPilot(
      monthInts, dutyByPilotMonth, dutyByEmployeeMonth, row.pilotName, eid, hasDutySynced
    );
    let hours;
    let hasComputed = false;
    if (useComputed) {
      let monthHours = resolveCachedMonthHours(computedByEmployee, eid);
      hasComputed = pilotHasComputedHours(syncedPilotKeys, row.pilotName);
      if (hasComputed && monthHours) {
        hours = hoursFromMonthInts(monthHours);
      } else {
        hours = importHoursRow(importHoursMap, row.pilotName);
      }
    } else {
      let imp = importHoursMap[key] || {};
      let monthMap = {};
      MONTHS.forEach((m, idx) => {
        let v = imp[idx + 1];
        monthMap[m] = (v === null || v === undefined) ? null : v;
      });
      hours = buildHoursRow(monthMap);
    }
    let hourNotes = hourNotesForPilot(hourNotesMap, row.pilotName);
    let auditRows = monthAuditRowsForPilot(monthAuditMap, row.pilotName);
    daysOff = applyDutyAuditOverrides(daysOff, auditRows.dutyAudit);
    let monthStatus = buildPilotMonthStatus(year, hours.months, daysOff.months, undefined, {
      treatNullHoursAsZero: useComputed && (meta.hoursSource === 'firebase' || meta.hoursSource === 'firebase_partial')
    });
    let limits = null;
    if (useComputed && limitAppliesToComputedYears(year)) {
      let priorQ4 = priorQ4Map[normalizePilotName(row.pilotName)];
      limits = buildPilotLimits(year, hours, daysOff, priorQ4);
    }
    sectionMap[row.section].pilots.push({
      name: row.pilotName,
      employeeId: row.employeeId || matchPilotEmployeeId(row.pilotName, employeeKeyIndex, fbPilots),
      hours,
      duty: daysOff,
      hourNotes,
      hoursAudit: auditRows.hoursAudit,
      dutyAudit: auditRows.dutyAudit,
      monthStatus,
      limits,
      hoursFromFirebase: hasComputed,
      hoursSyncedAt: pilotSyncedAt(syncedAtByPilot, row.pilotName),
      dutyFromFirebase: hasDutySynced,
      dutySyncNeeded: hasComputed && !hasDutySynced && !dutyIndexMissing,
      dutyIndexMissing: dutyIndexMissing,
      dutyCalendarSparse: dutyCalendarSparse,
      dutySyncedAt: pilotDutySyncedAt(dutySyncedAtByPilot, row.pilotName),
      hoursEditable: false,
      daysOffEditable: year >= COMPUTED_HOURS_FROM_YEAR && (!hasDutySynced || dutyIndexMissing),
      hourNotesEditable: year >= COMPUTED_HOURS_FROM_YEAR
    });
  });

  sectionOrder.forEach(title => {
    let sec = sectionMap[title];
    sec.totalRow = {
      label: sectionTotalLabel(title),
      values: sumPilotHourRows(sec.pilots)
    };
    sec.monthColumnIncomplete = {};
    MONTHS.forEach(m => {
      sec.monthColumnIncomplete[m] = monthColumnHasIncomplete(sec.pilots, m);
    });
    sections.push(sec);
  });

  let allPilots = [];
  sections.forEach(s => { allPilots = allPilots.concat(s.pilots); });
  let pilotsSyncedSaved = roster.filter(r => pilotHasComputedHours(syncedPilotKeys, r.pilotName)).length;
  let dutySyncedSaved = roster.filter(r => pilotHasComputedDuty(dutySyncedPilotKeys, r.pilotName)).length;
  let alerts = compareAlerts(year, allPilots, importHoursMap);
  let dutyAlerts = compareDutyAlerts(year, allPilots, daysMap);

  let compare = (meta.hoursSource === 'firebase' || meta.hoursSource === 'firebase_partial') ? alerts : [];
  let dutyCompare = useComputed ? dutyAlerts : [];

  return {
    year,
    title: 'Flight & Duty Audit Report - ' + year,
    months: MONTHS,
    quarters: QUARTERS,
    sections,
    companyTotal: {
      label: 'Total HOURS',
      values: sumPilotHourRows(allPilots)
    },
    mode: useComputed ? 'computed' : 'static',
    hoursSource: meta.hoursSource || (useComputed ? 'import' : 'static'),
    hoursPending: !!meta.hoursPending,
    hoursLastSyncedAt: meta.hoursLastSyncedAt || null,
    syncSummary: useComputed ? {
      total: roster.length,
      saved: pilotsSyncedSaved,
      dutySaved: dutySyncedSaved
    } : null,
    dutyLastSyncedAt: meta.dutyLastSyncedAt || null,
    compareAlerts: compare,
    dutyCompareAlerts: dutyCompare,
    rosterEditable: year >= COMPUTED_HOURS_FROM_YEAR,
    hourNotesEditable: year >= COMPUTED_HOURS_FROM_YEAR,
    monthAuditEditable: year >= COMPUTED_HOURS_FROM_YEAR,
    incompletePilotMonths: countIncompletePilotMonths(allPilots),
    limitsEnabled: useComputed && limitAppliesToComputedYears(year),
    hoursLocked: !!meta.hoursLocked,
    hoursLockedAt: meta.hoursLockedAt || null,
    hoursLockedBy: meta.hoursLockedBy || null,
    hoursLockEditable: !!meta.hoursLockEditable
  };
}

export async function buildFdrSummary() {
  await ensureFdrImported(fdrModels);
  let visibleYears = fdrYearsForUiTabs(await distinctFdrPilotYears());
  let rows = [];
  for (let i = 0; i < visibleYears.length; i++) {
    let y = visibleYears[i];
    if (y < COMPUTED_HOURS_FROM_YEAR) {
      let totals = await companyTotalsFromImportHours(y);
      rows.push({
        year: y,
        months: totals.months,
        quarters: totals.quarters
      });
      continue;
    }
    let data = await buildFdrYear(y);
    if (!data || !data.companyTotal) {
      let totals = await companyTotalsFromImportHours(y);
      rows.push({year: y, months: totals.months, quarters: totals.quarters});
      continue;
    }
    rows.push({
      year: y,
      months: data.companyTotal.values.months,
      quarters: data.companyTotal.values.quarters
    });
  }
  return {months: MONTHS, quarters: QUARTERS, rows};
}

export async function exportFdrYearXlsx(year) {
  let data = await buildFdrYear(year);
  if (!data) throw new Error('no_data');
  return {
    buffer: buildFdrYearXlsxBuffer(data),
    filename: fdrExportFilename('year', year)
  };
}

export async function exportFdrSummaryXlsx() {
  let summary = await buildFdrSummary();
  return {
    buffer: buildFdrSummaryXlsxBuffer(summary),
    filename: fdrExportFilename('summary')
  };
}

export async function exportFdrWorkbookXlsx() {
  await ensureFdrImported(fdrModels);
  let visibleYears = fdrYearsForUiTabs(await distinctFdrPilotYears());
  let yearDataList = [];
  for (let i = 0; i < visibleYears.length; i++) {
    let y = visibleYears[i];
    let data = await buildFdrYear(y);
    if (data) yearDataList.push(data);
  }
  let summary = await buildFdrSummary();
  return {
    buffer: buildFdrWorkbookXlsxBuffer(yearDataList, summary),
    filename: fdrExportFilename('workbook')
  };
}
