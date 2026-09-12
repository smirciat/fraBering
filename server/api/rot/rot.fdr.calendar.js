'use strict';

/** Calendar date in America/Anchorage as YYYY-MM-DD */
export function timestampToAlaskaYmd(raw) {
  if (!raw) return null;
  let date;
  if (raw && typeof raw.toDate === 'function') {
    date = raw.toDate();
  } else if (raw instanceof Date) {
    date = raw;
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Anchorage',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (e) {
    return null;
  }
}

export function alaskaTodayParts(asOfDate) {
  let d = asOfDate || new Date();
  let ymd = timestampToAlaskaYmd(d);
  if (!ymd) {
    return {year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate()};
  }
  let parts = ymd.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);
  if (!Number.isFinite(year)) {
    return {year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate()};
  }
  return {year, month, day};
}

export function alaskaCalendarYear(asOfDate) {
  let y = alaskaTodayParts(asOfDate).year;
  if (!Number.isFinite(y) || y < 1990 || y > 2100) {
    return new Date().getFullYear();
  }
  return y;
}

/** Year tabs are not shown until Alaska calendar has reached Jan 1 of that sheet year. */
export function fdrTabYearIsAvailable(fdrYear, asOfDate) {
  let y = parseInt(fdrYear, 10);
  if (!Number.isFinite(y)) return false;
  return y <= alaskaCalendarYear(asOfDate);
}

export function filterFdrTabYears(yearList, asOfDate) {
  return (yearList || []).filter(y => fdrTabYearIsAvailable(y, asOfDate));
}

/**
 * "Today" for elapsed vs undetermined within an FDR sheet year at sync time (Alaska).
 * Returns null when the real calendar has not reached Jan 1 of that sheet year yet.
 */
export function snapshotTodayForFdrYear(fdrYear, realAsOf) {
  let real = alaskaTodayParts(realAsOf);
  if (!Number.isFinite(real.year)) {
    real.year = alaskaCalendarYear(realAsOf);
  }
  if (real.year < fdrYear) {
    return null;
  }
  if (real.year > fdrYear) {
    return {year: fdrYear, month: 12, day: 31};
  }
  return real;
}

export function formatSnapshotTodayAk(snap) {
  if (!snap) return '';
  let m = String(snap.month).padStart(2, '0');
  let d = String(snap.day).padStart(2, '0');
  return snap.year + '-' + m + '-' + d;
}
