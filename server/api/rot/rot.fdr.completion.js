'use strict';

import {MONTHS, monthKeyToIndex} from './rot.fdr.math.js';

export function valuePresent(value) {
  return value !== null && value !== undefined && value !== '';
}

export function isMonthInAuditScope(year, monthIndex, asOfDate) {
  asOfDate = asOfDate || new Date();
  let y = asOfDate.getFullYear();
  let m = asOfDate.getMonth() + 1;
  if (year < y) return true;
  if (year > y) return false;
  return monthIndex <= m;
}

export function buildPilotMonthStatus(year, hoursMonths, dutyMonths, asOfDate, options) {
  options = options || {};
  let complete = {};
  let incomplete = {};
  MONTHS.forEach(m => {
    let monthIndex = monthKeyToIndex(m);
    let inScope = isMonthInAuditScope(year, monthIndex, asOfDate);
    let hasHours = valuePresent(hoursMonths && hoursMonths[m]);
    if (!hasHours && options.treatNullHoursAsZero) {
      hasHours = true;
    }
    let hasDaysOff = valuePresent(dutyMonths && dutyMonths[m]);
    let isComplete = hasHours && hasDaysOff;
    complete[m] = isComplete;
    incomplete[m] = inScope && !isComplete;
  });
  return {complete, incomplete};
}

export function monthColumnHasIncomplete(pilots, monthKey) {
  return (pilots || []).some(p => p.monthStatus && p.monthStatus.incomplete && p.monthStatus.incomplete[monthKey]);
}

export function countIncompletePilotMonths(pilots) {
  let n = 0;
  (pilots || []).forEach(p => {
    if (!p.monthStatus || !p.monthStatus.incomplete) return;
    MONTHS.forEach(m => {
      if (p.monthStatus.incomplete[m]) n += 1;
    });
  });
  return n;
}
