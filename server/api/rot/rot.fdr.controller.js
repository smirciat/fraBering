'use strict';

import * as fdrService from './rot.fdr.service';
import {canManageFdrYearLock} from './rot.access.js';

function sendXlsxDownload(res, result) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="' + result.filename + '"');
  return res.send(result.buffer);
}

export function fdrMeta(req, res) {
  return fdrService.getFdrMeta()
    .then(data => res.json(data))
    .catch(err => {
      console.log('fdrMeta error', err);
      if (String(err.message) === 'workbook_not_found') {
        return res.status(404).json({
          message: 'Flight & Duty workbook not found. Place Flight&DutyRecordReport.xls in uploads/ or set FDR_WORKBOOK_PATH in local.env.js.',
          years: []
        });
      }
      return res.status(500).json({message: 'Failed to load FDR metadata'});
    });
}

export function fdrYear(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return res.status(400).json({message: 'Invalid year'});
  }
  return fdrService.buildFdrYear(year, {viewer: req.user})
    .then(data => {
      if (!data) return res.status(404).json({message: 'No FDR data for year ' + year});
      return res.json(data);
    })
    .catch(err => {
      console.log('fdrYear error', year, err);
      if (String(err.message) === 'workbook_not_found') {
        return res.status(404).json({message: 'Flight & Duty workbook not found'});
      }
      return res.status(500).json({message: 'Failed to build FDR year'});
    });
}

export function fdrSummary(req, res) {
  return fdrService.buildFdrSummary()
    .then(data => res.json(data))
    .catch(err => {
      console.log('fdrSummary error', err);
      return res.status(500).json({message: 'Failed to build FDR summary'});
    });
}

export function fdrExportWorkbook(req, res) {
  return fdrService.exportFdrWorkbookXlsx()
    .then(result => sendXlsxDownload(res, result))
    .catch(err => {
      console.log('fdrExportWorkbook error', err);
      return res.status(500).json({message: 'Failed to export FDR workbook'});
    });
}

export function fdrExportSummary(req, res) {
  return fdrService.exportFdrSummaryXlsx()
    .then(result => sendXlsxDownload(res, result))
    .catch(err => {
      console.log('fdrExportSummary error', err);
      return res.status(500).json({message: 'Failed to export FDR summary'});
    });
}

export function fdrExportYear(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return res.status(400).json({message: 'Invalid year'});
  }
  return fdrService.exportFdrYearXlsx(year)
    .then(result => sendXlsxDownload(res, result))
    .catch(err => {
      console.log('fdrExportYear error', year, err);
      if (String(err.message) === 'no_data') {
        return res.status(404).json({message: 'No FDR data for year ' + year});
      }
      return res.status(500).json({message: 'Failed to export FDR year'});
    });
}

export function fdrComputeHours(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let body = req.body || {};
  let user = req.user || {};
  let syncedBy = user.name || user.email || '';
  return fdrService.computeFdrYearHours(year, {
    offset: body.offset,
    limit: body.limit,
    continue: body.continue,
    scope: body.scope,
    base: body.base,
    section: body.section,
    pilotName: body.pilotName,
    replaceAll: !!body.replaceAll,
    syncedBy: syncedBy,
    viewer: req.user
  })
    .then(data => {
      if (!data) return res.status(404).json({message: 'No FDR data for year ' + year});
      return res.json(data);
    })
    .catch(err => {
      console.log('fdrComputeHours error', year, err);
      if (String(err.message) === 'hours_locked') {
        return res.status(403).json({
          message: year + ' Firebase hour sync is locked for this year. Unlock in year settings to refresh hours.'
        });
      }
      if (String(err.message) === 'no_pilots_in_scope') {
        return res.status(400).json({message: 'No pilots matched that sync scope.'});
      }
      return res.status(500).json({
        message: 'Failed to aggregate flight hours from Firebase. Check server logs.'
      });
    });
}

export function fdrUpdateYearSettings(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return res.status(400).json({message: 'Invalid year'});
  }
  if (!canManageFdrYearLock(req.user)) {
    return res.status(403).json({message: 'Not allowed to change FDR year lock settings.'});
  }
  let body = req.body || {};
  if (!body.hasOwnProperty('hoursLocked')) {
    return res.status(400).json({message: 'hoursLocked (boolean) required'});
  }
  return fdrService.updateFdrYearSettings(year, !!body.hoursLocked, req.user)
    .then(data => {
      if (!data) return res.status(404).json({message: 'No FDR data for year ' + year});
      return res.json(data);
    })
    .catch(err => {
      console.log('fdrUpdateYearSettings error', year, err);
      if (String(err.message) === 'year_settings_unavailable') {
        return res.status(500).json({message: 'Year settings are not available on this server.'});
      }
      return res.status(500).json({message: 'Failed to update FDR year settings'});
    });
}

export function fdrSaveRoster(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year)) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let pilots = req.body && req.body.pilots;
  if (!Array.isArray(pilots)) {
    return res.status(400).json({message: 'pilots array required'});
  }
  return fdrService.updateFdrRoster(year, pilots)
    .then(data => {
      if (!data) return res.status(404).json({message: 'No FDR data for year ' + year});
      return res.json(data);
    })
    .catch(err => {
      console.log('fdrSaveRoster error', year, err);
      if (String(err.message) === 'roster_readonly') {
        return res.status(403).json({message: 'Roster is read-only for years through 2024.'});
      }
      if (String(err.message) === 'duplicate_pilot') {
        return res.status(400).json({message: 'Each pilot can only appear once per year (' + (err.pilotName || '') + ').'});
      }
      return res.status(500).json({message: 'Failed to save roster'});
    });
}

export function fdrCopyRoster(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year)) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let fromYear = req.body && req.body.fromYear;
  let replace = !!(req.body && req.body.replace);
  return fdrService.copyFdrRoster(year, fromYear, {replace})
    .then(data => {
      if (!data) return res.status(404).json({message: 'No FDR data for year ' + year});
      return res.json(data);
    })
    .catch(err => {
      console.log('fdrCopyRoster error', year, err);
      if (String(err.message) === 'roster_readonly') {
        return res.status(403).json({message: 'Roster is read-only for years through 2024.'});
      }
      if (String(err.message) === 'no_source_roster') {
        return res.status(404).json({message: 'No roster to copy from year ' + (err.sourceYear || (year - 1))});
      }
      if (String(err.message) === 'target_not_empty') {
        return res.status(409).json({message: 'This year already has a roster. Check “Replace existing roster” to copy anyway.'});
      }
      return res.status(500).json({message: 'Failed to copy roster'});
    });
}

export function fdrSaveMonthAudit(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year)) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let entries = req.body && req.body.entries;
  if (!Array.isArray(entries)) {
    return res.status(400).json({message: 'entries array required'});
  }
  let userName = req.user && req.user.name ? req.user.name : '';
  return fdrService.saveMonthAuditEntriesForYear(year, entries, userName)
    .then(data => res.json(data))
    .catch(err => {
      console.log('fdrSaveMonthAudit error', year, err);
      if (String(err.message) === 'month_audit_readonly') {
        return res.status(403).json({message: 'Month audit is only available for 2025 and later.'});
      }
      return res.status(500).json({message: 'Failed to save month audit'});
    });
}

export function fdrSaveHourNotes(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year)) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let entries = req.body && req.body.entries;
  if (!Array.isArray(entries)) {
    return res.status(400).json({message: 'entries array required'});
  }
  let userName = req.user && req.user.name ? req.user.name : '';
  return fdrService.saveHourNoteEntries(year, entries, userName)
    .then(data => res.json(data))
    .catch(err => {
      console.log('fdrSaveHourNotes error', year, err);
      if (String(err.message) === 'hour_notes_readonly') {
        return res.status(403).json({message: 'Hour notes are only editable for 2025 and later.'});
      }
      return res.status(500).json({message: 'Failed to save hour note'});
    });
}

export function fdrSaveDaysOff(req, res) {
  let year = parseInt(String(req.params.year || '').trim(), 10);
  if (!Number.isFinite(year)) {
    return res.status(400).json({message: 'Invalid year'});
  }
  let entries = req.body && req.body.entries;
  if (!Array.isArray(entries)) {
    return res.status(400).json({message: 'entries array required'});
  }
  let userName = req.user && req.user.name ? req.user.name : '';
  return fdrService.saveDaysOffEntries(year, entries, userName)
    .then(data => res.json(data))
    .catch(err => {
      console.log('fdrSaveDaysOff error', year, err);
      return res.status(500).json({message: 'Failed to save days off'});
    });
}
