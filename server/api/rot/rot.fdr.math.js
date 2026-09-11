'use strict';

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'YEAR'];

const MONTH_INDEX = {};
MONTHS.forEach((m, i) => { MONTH_INDEX[m] = i + 1; });

export function monthKeyToIndex(key) {
  if (typeof key === 'number') return key;
  return MONTH_INDEX[String(key).toUpperCase()] || 0;
}

export function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  let n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function roundHour(n) {
  return Math.round(n * 10) / 10;
}

export function monthMapToArray(monthMap) {
  let out = {};
  MONTHS.forEach(m => {
    let v = monthMap && monthMap[m];
    if (v === null || v === undefined || v === '') {
      out[m] = null;
    } else {
      out[m] = roundHour(num(v));
    }
  });
  return out;
}

export function sumMonths(monthMap) {
  let total = 0;
  MONTHS.forEach(m => { total += num(monthMap[m]); });
  return roundHour(total);
}

export function addQuarters(monthMap) {
  let q1 = num(monthMap.JAN) + num(monthMap.FEB) + num(monthMap.MAR);
  let q2 = num(monthMap.APR) + num(monthMap.MAY) + num(monthMap.JUNE);
  let q3 = num(monthMap.JULY) + num(monthMap.AUG) + num(monthMap.SEPT);
  let q4 = num(monthMap.OCT) + num(monthMap.NOV) + num(monthMap.DEC);
  return {
    Q1: roundHour(q1),
    Q2: roundHour(q2),
    Q3: roundHour(q3),
    Q4: roundHour(q4),
    YEAR: roundHour(q1 + q2 + q3 + q4)
  };
}

export function buildHoursRow(monthMap) {
  let months = monthMapToArray(monthMap);
  return {months, quarters: addQuarters(months)};
}

export function buildDaysOffRow(monthInts) {
  let months = {};
  MONTHS.forEach((m, i) => {
    let v = monthInts[i + 1];
    months[m] = (v === null || v === undefined) ? null : parseInt(v, 10);
  });
  let q1 = num(months.JAN) + num(months.FEB) + num(months.MAR);
  let q2 = num(months.APR) + num(months.MAY) + num(months.JUNE);
  let q3 = num(months.JULY) + num(months.AUG) + num(months.SEPT);
  let q4 = num(months.OCT) + num(months.NOV) + num(months.DEC);
  return {
    months,
    quarters: {
      Q1: q1 || null,
      Q2: q2 || null,
      Q3: q3 || null,
      Q4: q4 || null,
      YEAR: (q1 + q2 + q3 + q4) || null
    }
  };
}

export function sumPilotHourRows(pilots) {
  let months = {};
  MONTHS.forEach(m => { months[m] = 0; });
  (pilots || []).forEach(p => {
    MONTHS.forEach(m => {
      months[m] += num(p.hours && p.hours.months && p.hours.months[m]);
    });
  });
  return buildHoursRow(months);
}

export function normalizePilotName(name) {
  return String(name || '').trim().toUpperCase().replace(/\s+/g, ' ');
}
