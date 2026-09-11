'use strict';

import xlsx from 'node-xlsx';
import {MONTHS, QUARTERS} from './rot.fdr.math.js';

function displayHour(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return Math.round(value * 10) / 10;
  }
  return value;
}

function displayDaysOff(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return value;
}

export function fdrYearToSheetRows(yearData) {
  let rows = [];
  let title = yearData.title || ('Flight & Duty Audit Report - ' + yearData.year);
  rows.push([title]);
  rows.push([]);

  (yearData.sections || []).forEach(sec => {
    rows.push([sec.title]);
    rows.push(['Instructions'].concat(MONTHS).concat(QUARTERS));
    (sec.pilots || []).forEach(p => {
      let hourRow = [p.name];
      MONTHS.forEach(m => hourRow.push(displayHour(p.hours && p.hours.months ? p.hours.months[m] : '')));
      QUARTERS.forEach(q => hourRow.push(displayHour(p.hours && p.hours.quarters ? p.hours.quarters[q] : '')));
      rows.push(hourRow);

      let dutyRow = ['Days off'];
      MONTHS.forEach(m => dutyRow.push(displayDaysOff(p.duty && p.duty.months ? p.duty.months[m] : '')));
      QUARTERS.forEach(q => dutyRow.push(displayDaysOff(p.duty && p.duty.quarters ? p.duty.quarters[q] : '')));
      rows.push(dutyRow);

      let notes = MONTHS.map(m => {
        let n = p.hourNotes && p.hourNotes[m];
        return n ? String(n).trim() : '';
      });
      if (notes.some(n => n)) {
        rows.push(['Hour notes'].concat(notes).concat(QUARTERS.map(() => '')));
      }
    });
    if (sec.totalRow) {
      let tr = [sec.totalRow.label];
      MONTHS.forEach(m => tr.push(displayHour(sec.totalRow.values.months[m])));
      QUARTERS.forEach(q => tr.push(displayHour(sec.totalRow.values.quarters[q])));
      rows.push(tr);
    }
    rows.push([]);
  });

  if (yearData.companyTotal) {
    let cr = [yearData.companyTotal.label];
    MONTHS.forEach(m => cr.push(displayHour(yearData.companyTotal.values.months[m])));
    QUARTERS.forEach(q => cr.push(displayHour(yearData.companyTotal.values.quarters[q])));
    rows.push(cr);
  }

  return rows;
}

export function fdrSummaryToSheetRows(summaryData) {
  let rows = [];
  rows.push(['Flight & Duty Audit Report — Summary']);
  rows.push([]);
  rows.push(['Year'].concat(MONTHS).concat(QUARTERS));
  (summaryData.rows || []).forEach(r => {
    let row = [r.year];
    MONTHS.forEach(m => row.push(displayHour(r.months && r.months[m])));
    QUARTERS.forEach(q => row.push(displayHour(r.quarters && r.quarters[q])));
    rows.push(row);
  });
  return rows;
}

export function buildFdrYearXlsxBuffer(yearData) {
  return xlsx.build([{
    name: String(yearData.year),
    data: fdrYearToSheetRows(yearData)
  }]);
}

export function buildFdrSummaryXlsxBuffer(summaryData) {
  return xlsx.build([{
    name: 'Summary',
    data: fdrSummaryToSheetRows(summaryData)
  }]);
}

export function buildFdrWorkbookXlsxBuffer(yearDataList, summaryData) {
  let sheets = [];
  (yearDataList || []).forEach(yearData => {
    if (!yearData) return;
    sheets.push({
      name: String(yearData.year),
      data: fdrYearToSheetRows(yearData)
    });
  });
  if (summaryData && summaryData.rows && summaryData.rows.length) {
    sheets.push({
      name: 'Summary',
      data: fdrSummaryToSheetRows(summaryData)
    });
  }
  return xlsx.build(sheets);
}

export function fdrExportFilename(kind, year) {
  if (kind === 'summary') return 'Flight-Duty-Summary.xlsx';
  if (kind === 'workbook') return 'Flight-Duty-Report.xlsx';
  return 'Flight-Duty-' + year + '.xlsx';
}
