'use strict';

import xlsx from 'node-xlsx';
import {resolveFdrWorkbookPath} from './rot.storage.js';
import {listFdrYearSheetNames, parseFdrYearSheet} from './rot.fdr.parse.js';
import {MONTHS, monthKeyToIndex} from './rot.fdr.math.js';

const COMPUTED_HOURS_FROM_YEAR = 2025;
const STATIC_HOURS_THROUGH_YEAR = 2024;

function loadWorkbookSheets() {
  let fullPath = resolveFdrWorkbookPath();
  if (!fullPath) {
    throw new Error('workbook_not_found');
  }
  return {path: fullPath, sheets: xlsx.parse(fullPath)};
}

export async function importFdrFromWorkbook(models, options) {
  let replace = options && options.replace;
  let FdrPilot = models.FdrPilot;
  let FdrDaysOff = models.FdrDaysOff;
  let FdrImportHour = models.FdrImportHour;
  let FdrHourNote = models.FdrHourNote;
  let loaded = loadWorkbookSheets();
  let yearNames = listFdrYearSheetNames(loaded.sheets);

  if (replace) {
    await FdrImportHour.destroy({where: {}});
    await FdrDaysOff.destroy({where: {}});
    if (FdrHourNote) await FdrHourNote.destroy({where: {}});
    await FdrPilot.destroy({where: {}});
  }

  let sortBase = 0;
  for (let yi = 0; yi < yearNames.length; yi++) {
    let year = yearNames[yi];
    let sheet = loaded.sheets.find(s => String(s.name) === String(year));
    if (!sheet) continue;
    let parsed = parseFdrYearSheet(sheet.data);
    let order = 0;
    let sections = parsed.sections || [];
    for (let si = 0; si < sections.length; si++) {
      let section = sections[si];
      let pilots = section.pilots || [];
      for (let pi = 0; pi < pilots.length; pi++) {
        let pilot = pilots[pi];
        order += 1;
        let pilotName = String(pilot.name).trim();
        await FdrPilot.create({
          year,
          section: section.title,
          pilotName,
          sortOrder: sortBase + order
        });
        for (let mi = 0; mi < MONTHS.length; mi++) {
          let m = MONTHS[mi];
          let month = monthKeyToIndex(m);
          let hours = pilot.hours && pilot.hours.months ? pilot.hours.months[m] : null;
          let days = pilot.duty && pilot.duty.months ? pilot.duty.months[m] : null;
          if (hours !== null && hours !== undefined && hours !== '') {
            await FdrImportHour.create({
              year,
              pilotName,
              month,
              hours: parseFloat(hours)
            });
          }
          if (days !== null && days !== undefined && days !== '') {
            await FdrDaysOff.create({
              year,
              pilotName,
              month,
              daysOff: parseInt(days, 10)
            });
          }
        }
      }
    }
    sortBase += 1000;
  }

  return {
    workbook: loaded.path,
    years: yearNames,
    computedHoursFromYear: COMPUTED_HOURS_FROM_YEAR,
    staticHoursThroughYear: STATIC_HOURS_THROUGH_YEAR
  };
}

export async function ensureFdrImported(models) {
  let count = await models.FdrPilot.count();
  if (count > 0) {
    return {alreadyImported: true};
  }
  return importFdrFromWorkbook(models, {replace: true});
}

export {COMPUTED_HOURS_FROM_YEAR, STATIC_HOURS_THROUGH_YEAR};
