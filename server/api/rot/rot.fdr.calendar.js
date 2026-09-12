'use strict';

function pad2(n) {
  let s = String(n);
  return s.length < 2 ? '0' + s : s;
}

function isValidYmdParts(year, month, day) {
  return Number.isFinite(year) && year >= 1990 && year <= 2100
    && Number.isFinite(month) && month >= 1 && month <= 12
    && Number.isFinite(day) && day >= 1 && day <= 31;
}

function ymdFromParts(year, month, day) {
  if (!isValidYmdParts(year, month, day)) return null;
  return year + '-' + pad2(month) + '-' + pad2(day);
}

/** Node 12 en-CA can return 12/09/2026; never treat 12 as the calendar year. */
export function parseLooseYmd(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  let iso = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) {
    return ymdFromParts(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10));
  }
  let us = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (us) {
    return ymdFromParts(parseInt(us[3], 10), parseInt(us[1], 10), parseInt(us[2], 10));
  }
  return null;
}

function ymdFromFormatToParts(date) {
  try {
    let fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Anchorage',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    if (typeof fmt.formatToParts !== 'function') return null;
    let year = null;
    let month = null;
    let day = null;
    fmt.formatToParts(date).forEach(function(p) {
      if (p.type === 'year') year = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'day') day = p.value;
    });
    return ymdFromParts(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
  } catch (e) {
    return null;
  }
}

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
  let fromParts = ymdFromFormatToParts(date);
  if (fromParts) return fromParts;
  try {
    let formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Anchorage',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
    return parseLooseYmd(formatted);
  } catch (e) {
    return null;
  }
}

export function alaskaTodayParts(asOfDate) {
  let d = asOfDate || new Date();
  let ymd = timestampToAlaskaYmd(d);
  if (ymd) {
    let bits = ymd.split('-');
    let year = parseInt(bits[0], 10);
    let month = parseInt(bits[1], 10);
    let day = parseInt(bits[2], 10);
    if (isValidYmdParts(year, month, day)) {
      return {year: year, month: month, day: day};
    }
  }
  return {year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate()};
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
  return (yearList || []).filter(function(y) {
    return fdrTabYearIsAvailable(y, asOfDate);
  });
}

/**
 * "Today" for elapsed vs undetermined within an FDR sheet year at sync time (Alaska).
 * Returns null when the real calendar has not reached Jan 1 of that sheet year yet.
 */
export function snapshotTodayForFdrYear(fdrYear, realAsOf) {
  let real = alaskaTodayParts(realAsOf);
  if (!Number.isFinite(real.year) || real.year < 1990) {
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
  return snap.year + '-' + pad2(snap.month) + '-' + pad2(snap.day);
}
