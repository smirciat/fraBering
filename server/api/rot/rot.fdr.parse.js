'use strict';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'YEAR'];

function isBlankCell(value) {
  return value === null || value === undefined || value === '';
}

function isSectionHeader(row) {
  let cell = row[0];
  if (isBlankCell(cell) || typeof cell !== 'string') {
    return false;
  }
  let title = cell.trim();
  if (!title || title === 'Instructions') {
    return false;
  }
  if (title.indexOf('Total ') === 0) {
    return false;
  }
  if (title.indexOf(',') >= 0) {
    return false;
  }
  for (let c = 1; c < row.length; c++) {
    if (!isBlankCell(row[c])) {
      return false;
    }
  }
  return true;
}

function isPilotName(cell) {
  return typeof cell === 'string' && cell.indexOf(',') >= 0;
}

function extractValues(row, monthCols, quarterCols) {
  let months = {};
  let quarters = {};
  MONTHS.forEach(m => {
    let col = monthCols[m];
    if (col >= 0) {
      months[m] = row[col];
    }
  });
  QUARTERS.forEach(q => {
    let col = quarterCols[q];
    if (col >= 0) {
      quarters[q] = row[col];
    }
  });
  return {months, quarters};
}

export function parseFdrYearSheet(rows) {
  let monthCols = {};
  let quarterCols = {};
  let sections = [];
  let currentSection = null;
  let expectDuty = false;
  let headerReady = false;
  let sheetTitle = null;

  if (!Array.isArray(rows)) {
    return {months: MONTHS, quarters: QUARTERS, sections: [], title: null};
  }

  for (let i = 0; i < rows.length; i++) {
    let row = rows[i] || [];

    if (row[0] === 'Instructions' && row[1] === 'JAN') {
      MONTHS.forEach(m => {
        monthCols[m] = row.indexOf(m);
      });
      QUARTERS.forEach(q => {
        quarterCols[q] = row.indexOf(q);
      });
      headerReady = true;
      continue;
    }

    if (!headerReady && row[0] && typeof row[0] === 'string' && isSectionHeader(row)) {
      sheetTitle = String(row[0]).trim();
      continue;
    }

    if (headerReady && isSectionHeader(row)) {
      currentSection = {
        title: String(row[0]).trim(),
        pilots: [],
        totalRow: null
      };
      sections.push(currentSection);
      expectDuty = false;
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (row[0] && typeof row[0] === 'string' && row[0].indexOf('Total ') === 0) {
      currentSection.totalRow = {
        label: String(row[0]).trim(),
        values: extractValues(row, monthCols, quarterCols)
      };
      expectDuty = false;
      continue;
    }

    if (isPilotName(row[0])) {
      currentSection.pilots.push({
        name: String(row[0]).trim(),
        hours: extractValues(row, monthCols, quarterCols),
        duty: null
      });
      expectDuty = true;
      continue;
    }

    if (expectDuty && isBlankCell(row[0])) {
      let last = currentSection.pilots[currentSection.pilots.length - 1];
      if (last) {
        last.duty = extractValues(row, monthCols, quarterCols);
      }
      expectDuty = false;
    }
  }

  return {months: MONTHS, quarters: QUARTERS, sections, title: sheetTitle};
}

export function listFdrYearSheetNames(sheets) {
  let years = [];
  (sheets || []).forEach(sheet => {
    let name = String(sheet.name || '').trim();
    if (/^\d{4}$/.test(name)) {
      years.push(parseInt(name, 10));
    }
  });
  years.sort((a, b) => a - b);
  return years;
}
