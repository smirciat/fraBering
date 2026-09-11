'use strict';

import {num, roundHour, MONTHS, monthKeyToIndex} from './rot.fdr.math.js';
import {valuePresent, isMonthInAuditScope} from './rot.fdr.completion.js';
import {COMPUTED_HOURS_FROM_YEAR} from './rot.fdr.import.js';

export const MAX_QUARTER_HOURS = 500;
export const MAX_YEAR_HOURS = 1400;
export const MAX_ROLLING_QUARTER_HOURS = 800;
export const MIN_DAYS_OFF_PER_QUARTER = 13;
const WARN_FRACTION = 0.9;

const QUARTER_MONTH_KEYS = {
  Q1: ['JAN', 'FEB', 'MAR'],
  Q2: ['APR', 'MAY', 'JUNE'],
  Q3: ['JULY', 'AUG', 'SEPT'],
  Q4: ['OCT', 'NOV', 'DEC']
};

const ROLLING_PAIRS = [
  {key: 'Q1_Q2', a: 'Q1', b: 'Q2', label: 'Q1+Q2'},
  {key: 'Q2_Q3', a: 'Q2', b: 'Q3', label: 'Q2+Q3'},
  {key: 'Q3_Q4', a: 'Q3', b: 'Q4', label: 'Q3+Q4'}
];

function metric(value, max, min) {
  let out = {value: value === null || value === undefined ? null : roundHour(num(value)), status: 'ok'};
  if (out.value === null && min === undefined) return out;
  let v = num(out.value);
  if (min !== undefined) {
    out.min = min;
    if (v < min) out.status = 'violation';
    else if (v < min + 2) out.status = 'warn';
    return out;
  }
  if (max !== undefined) {
    out.max = max;
    if (v > max) out.status = 'violation';
    else if (v > max * WARN_FRACTION) out.status = 'warn';
  }
  return out;
}

function quarterEnded(year, quarterKey, asOfDate) {
  asOfDate = asOfDate || new Date();
  let y = asOfDate.getFullYear();
  let m = asOfDate.getMonth() + 1;
  if (year < y) return true;
  if (year > y) return false;
  let months = QUARTER_MONTH_KEYS[quarterKey];
  if (!months) return false;
  let lastIdx = monthKeyToIndex(months[months.length - 1]);
  return m > lastIdx;
}

function daysOffQuarterAuditable(year, quarterKey, dutyMonths, asOfDate) {
  if (quarterEnded(year, quarterKey, asOfDate)) return true;
  let months = QUARTER_MONTH_KEYS[quarterKey];
  return months.every(m => valuePresent(dutyMonths && dutyMonths[m]));
}

function rollingPairAuditable(year, pair, hoursQuarters, asOfDate) {
  if (quarterEnded(year, pair.b, asOfDate)) return true;
  return valuePresent(hoursQuarters && hoursQuarters[pair.a]) &&
    valuePresent(hoursQuarters && hoursQuarters[pair.b]);
}

export function buildPilotLimits(year, hours, duty, priorYearQ4Hours, asOfDate) {
  asOfDate = asOfDate || new Date();
  let hoursQ = (hours && hours.quarters) || {};
  let dutyQ = (duty && duty.quarters) || {};
  let dutyM = (duty && duty.months) || {};

  let hoursQuarter = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    hoursQuarter[q] = metric(hoursQ[q], MAX_QUARTER_HOURS);
  });

  let hoursYear = metric(hoursQ.YEAR, MAX_YEAR_HOURS);

  let daysOffQuarter = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    let raw = dutyQ[q];
    if (!daysOffQuarterAuditable(year, q, dutyM, asOfDate)) {
      daysOffQuarter[q] = {value: raw === null || raw === undefined ? null : parseInt(raw, 10), status: 'ok', min: MIN_DAYS_OFF_PER_QUARTER};
      return;
    }
    daysOffQuarter[q] = metric(raw, undefined, MIN_DAYS_OFF_PER_QUARTER);
  });

  let rollingQuarter = {};
  ROLLING_PAIRS.forEach(pair => {
    if (!rollingPairAuditable(year, pair, hoursQ, asOfDate)) {
      rollingQuarter[pair.key] = {value: null, status: 'ok', max: MAX_ROLLING_QUARTER_HOURS, label: pair.label};
      return;
    }
    let total = num(hoursQ[pair.a]) + num(hoursQ[pair.b]);
    let m = metric(total, MAX_ROLLING_QUARTER_HOURS);
    m.label = pair.label;
    rollingQuarter[pair.key] = m;
  });

  let crossYearQ4Q1 = null;
  if (year >= COMPUTED_HOURS_FROM_YEAR) {
    let prior = priorYearQ4Hours;
    let q1 = hoursQ.Q1;
    if (prior !== null && prior !== undefined && valuePresent(q1)) {
      let total = num(prior) + num(q1);
      let m = metric(total, MAX_ROLLING_QUARTER_HOURS);
      crossYearQ4Q1 = {
        value: m.value,
        status: m.status,
        max: MAX_ROLLING_QUARTER_HOURS,
        priorYear: year - 1,
        currentYear: year,
        priorQ4Hours: roundHour(num(prior)),
        currentQ1Hours: roundHour(num(q1)),
        label: 'Q4 ' + (year - 1) + ' + Q1 ' + year
      };
    }
  }

  return {
    hoursQuarter,
    hoursYear,
    daysOffQuarter,
    rollingQuarter,
    crossYearQ4Q1
  };
}

export function limitAppliesToComputedYears(year) {
  return year >= COMPUTED_HOURS_FROM_YEAR;
}
