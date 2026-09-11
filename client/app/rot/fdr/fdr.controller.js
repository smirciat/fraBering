'use strict';

(function() {

class RotFdrComponent {
  constructor($http, Auth, RotAccess, $interval) {
    this.http = $http;
    this.Auth = Auth;
    this.RotAccess = RotAccess;
    this.interval = $interval;
    this.user = null;
    this.years = [];
    this.selectedYear = null;
    this.viewSummary = false;
    this.months = [];
    this.quarters = [];
    this.sections = [];
    this.summaryRows = [];
    this.sheetTitle = '';
    this.mode = '';
    this.hoursSource = '';
    this.compareAlerts = [];
    this.loading = false;
    this.hoursLoading = false;
    this.hoursProgress = null;
    this.hoursLoadError = '';
    this.hoursRefreshElapsedSec = 0;
    this.loadError = '';
    this.savingDaysOff = false;
    this.companyTotal = null;
    this.sectionOptions = [];
    this.rosterEditableFromYear = 2025;
    this.rosterEditable = false;
    this.editRoster = false;
    this.rosterRows = [];
    this.newPilotName = '';
    this.newPilotSection = '';
    this.savingRoster = false;
    this.copyRosterReplace = false;
    this.hourNotesEditable = false;
    this.incompletePilotMonths = 0;
    this.limitsEnabled = false;
    this.noteEditor = null;
    this.savingHourNote = false;
    this.exporting = false;
    this.hoursLastSyncedAt = null;
    this.syncBase = 'OME';
    this.syncPilotName = '';
    this.syncPilotOptions = [];
    this.syncSummary = null;
    this.syncPilotFilter = 'all';
    this.hoursLocked = false;
    this.hoursLockedAt = null;
    this.hoursLockedBy = null;
    this.hoursLockEditable = false;
    this.savingYearLock = false;
  }

  loggedIn() {
    return !!(this.user && this.user._id);
  }

  canAccessFdr() {
    return this.RotAccess.canAccessFdr(this.user);
  }

  $onInit() {
    var self = this;
    this.Auth.getCurrentUser(function(u) {
      self.user = u;
      if (!self.canAccessFdr()) {
        return;
      }
      self.loadMeta();
    });
  }

  loadMeta() {
    this.loading = true;
    this.http.get('/api/rot/fdr/meta').then(res => {
      this.years = res.data.years || [];
      this.computedHoursFromYear = res.data.computedHoursFromYear || 2025;
      this.rosterEditableFromYear = res.data.rosterEditableFromYear || this.computedHoursFromYear;
      this.sectionOptions = res.data.sections || [];
      if (this.years.length) {
        this.selectYear(this.years[this.years.length - 1]);
      } else {
        this.loading = false;
        this.loadError = 'No FDR data. Import the workbook (uploads/Flight&DutyRecordReport.xls) and reload.';
      }
    }, err => {
      this.loading = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Could not load FDR.';
    });
  }

  selectYear(year) {
    if (year === 'summary') {
      this.viewSummary = true;
      this.selectedYear = 'summary';
      this.fetchSummary();
      return;
    }
    this.viewSummary = false;
    if (!year || this.selectedYear === year) {
      if (this.selectedYear === year && !this.sections.length) {
        this.fetchYear(year);
      }
      return;
    }
    this.selectedYear = year;
    this.fetchYear(year);
  }

  fetchSummary() {
    this.loading = true;
    this.loadError = '';
    this.http.get('/api/rot/fdr/summary').then(res => {
      this.loading = false;
      this.months = res.data.months || [];
      this.quarters = res.data.quarters || [];
      this.summaryRows = res.data.rows || [];
    }, err => {
      this.loading = false;
      this.loadError = (err && err.data && err.data.message) || 'Failed to load summary';
    });
  }

  applyYearData(data) {
    this.months = data.months || [];
    this.quarters = data.quarters || [];
    this.sections = data.sections || [];
    this.sheetTitle = data.title || '';
    this.mode = data.mode || '';
    this.hoursSource = data.hoursSource || '';
    this.hoursLastSyncedAt = data.hoursLastSyncedAt || null;
    if (data.hoursCompute) {
      this.hoursProgress = data.hoursCompute;
    }
    this.compareAlerts = data.compareAlerts || [];
    this.refreshSyncPilotOptions();
    this.companyTotal = data.companyTotal || null;
    this.rosterEditable = !!data.rosterEditable;
    this.hourNotesEditable = !!data.hourNotesEditable;
    this.incompletePilotMonths = data.incompletePilotMonths || 0;
    this.limitsEnabled = !!data.limitsEnabled;
    this.syncSummary = data.syncSummary || null;
    this.hoursLocked = !!data.hoursLocked;
    this.hoursLockedAt = data.hoursLockedAt || null;
    this.hoursLockedBy = data.hoursLockedBy || null;
    this.hoursLockEditable = this.RotAccess.canManageFdrYearLock(this.user);
    if (!this.editRoster) {
      this.syncRosterRowsFromSections();
    }
  }

  syncRosterRowsFromSections() {
    let rows = [];
    (this.sections || []).forEach(sec => {
      (sec.pilots || []).forEach(p => {
        rows.push({name: p.name, section: sec.title});
      });
    });
    this.rosterRows = rows;
  }

  canEditRoster() {
    return this.rosterEditable && !this.viewSummary && this.selectedYear !== 'summary';
  }

  toggleEditRoster() {
    this.editRoster = !this.editRoster;
    if (this.editRoster) {
      this.syncRosterRowsFromSections();
      if (!this.newPilotSection && this.sectionOptions.length) {
        this.newPilotSection = this.sectionOptions[0];
      }
    }
  }

  rosterPayload() {
    return (this.rosterRows || []).map((row, idx) => ({
      pilotName: row.name,
      section: row.section,
      sortOrder: idx
    }));
  }

  saveRoster() {
    if (!this.canEditRoster()) return;
    this.savingRoster = true;
    this.loadError = '';
    this.http.put('/api/rot/fdr/' + this.selectedYear + '/pilots', {pilots: this.rosterPayload()}).then(res => {
      this.savingRoster = false;
      this.editRoster = false;
      this.applyYearData(res.data);
      this.refreshMetaYears();
    }, err => {
      this.savingRoster = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Failed to save roster';
    });
  }

  copyRosterFromPrevious() {
    if (!this.canEditRoster()) return;
    let fromYear = parseInt(this.selectedYear, 10) - 1;
    if (!window.confirm('Copy section roster from ' + fromYear + ' into ' + this.selectedYear + '?')) {
      return;
    }
    this.savingRoster = true;
    this.loadError = '';
    this.http.post('/api/rot/fdr/' + this.selectedYear + '/copy-roster', {
      fromYear: fromYear,
      replace: this.copyRosterReplace
    }).then(res => {
      this.savingRoster = false;
      this.editRoster = false;
      this.applyYearData(res.data);
      this.refreshMetaYears();
    }, err => {
      this.savingRoster = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Failed to copy roster';
    });
  }

  removeRosterRow(row) {
    this.rosterRows = (this.rosterRows || []).filter(r => r !== row);
  }

  addRosterPilot() {
    let name = String(this.newPilotName || '').trim();
    let section = String(this.newPilotSection || '').trim();
    if (!name || !section) return;
    let upper = name.toUpperCase();
    let dup = (this.rosterRows || []).some(r => String(r.name || '').toUpperCase() === upper);
    if (dup) {
      this.loadError = 'That pilot is already on the roster for this year.';
      return;
    }
    this.rosterRows.push({name: name, section: section});
    this.newPilotName = '';
    this.loadError = '';
  }

  refreshMetaYears() {
    this.http.get('/api/rot/fdr/meta').then(res => {
      this.years = res.data.years || this.years;
      this.sectionOptions = res.data.sections || this.sectionOptions;
    });
  }

  fetchYear(year) {
    this.loading = true;
    this.hoursLoading = false;
    this.loadError = '';
    this.http.get('/api/rot/fdr/' + year).then(res => {
      this.loading = false;
      this.applyYearData(res.data);
      this.sessionPilotMap = this.readSessionPilotMap();
    }, err => {
      this.loading = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Failed to load year ' + year;
    });
  }

  refreshSyncPilotOptions() {
    let names = [];
    (this.sections || []).forEach(sec => {
      (sec.pilots || []).forEach(p => {
        if (p && p.name) names.push(p.name);
      });
    });
    this.syncPilotOptions = names;
    if (!this.syncPilotName && names.length) {
      this.syncPilotName = names[0];
    }
  }

  sessionPilotsKey(year) {
    return 'fdrSessionPilots:' + year;
  }

  readSessionPilotMap() {
    if (!this.selectedYear || this.selectedYear === 'summary') return {};
    try {
      return JSON.parse(sessionStorage.getItem(this.sessionPilotsKey(this.selectedYear)) || '{}');
    } catch (e) {
      return {};
    }
  }

  normalizePilotKey(name) {
    return String(name || '').trim().toUpperCase().replace(/\s+/g, ' ');
  }

  markPilotsSyncedThisSession(pilotNames) {
    if (!this.selectedYear || this.selectedYear === 'summary') return;
    let map = this.readSessionPilotMap();
    (pilotNames || []).forEach(name => {
      if (!name) return;
      map[this.normalizePilotKey(name)] = Date.now();
    });
    sessionStorage.setItem(this.sessionPilotsKey(this.selectedYear), JSON.stringify(map));
    this.sessionPilotMap = map;
  }

  sessionPilotSyncCount() {
    let map = this.sessionPilotMap || this.readSessionPilotMap();
    return Object.keys(map).length;
  }

  pilotSyncedThisSession(pilot) {
    if (!pilot || !pilot.name) return false;
    let map = this.sessionPilotMap || this.readSessionPilotMap();
    return !!map[this.normalizePilotKey(pilot.name)];
  }

  pilotSyncedOverall(pilot) {
    return !!(pilot && pilot.hoursFromFirebase);
  }

  pilotSyncSavedTitle(pilot) {
    if (!this.pilotSyncedOverall(pilot)) return 'Hours not saved from Firebase yet';
    if (pilot.hoursSyncedAt) {
      return 'Firebase hours saved — last sync ' + this.formatSyncDate(pilot.hoursSyncedAt);
    }
    return 'Firebase hours saved in database';
  }

  pilotSyncSessionTitle(pilot) {
    if (!this.pilotSyncedThisSession(pilot)) return '';
    return 'Synced from Firebase in this browser session';
  }

  pilotPassesSyncFilter(pilot) {
    if (!pilot || this.syncPilotFilter === 'all') return true;
    if (this.syncPilotFilter === 'saved') return this.pilotSyncedOverall(pilot);
    if (this.syncPilotFilter === 'unsaved') return !this.pilotSyncedOverall(pilot);
    if (this.syncPilotFilter === 'session') return this.pilotSyncedThisSession(pilot);
    return true;
  }

  syncSummaryLabel() {
    let saved = (this.syncSummary && this.syncSummary.saved) || 0;
    let total = (this.syncSummary && this.syncSummary.total) || 0;
    let session = this.sessionPilotSyncCount();
    let line = saved + ' of ' + total + ' pilots have saved Firebase hours';
    if (session > 0) {
      line += '; ' + session + ' synced this session';
    }
    return line;
  }

  showSyncSummary() {
    return this.mode === 'computed' && !this.viewSummary && this.syncSummary && this.syncSummary.total > 0;
  }

  formatSyncDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return '';
    }
  }

  syncDisabled() {
    return this.hoursLoading || !!this.hoursLocked;
  }

  toggleYearHoursLock() {
    if (!this.hoursLockEditable || !this.selectedYear || this.selectedYear === 'summary') return;
    let locking = !this.hoursLocked;
    let msg = locking
      ? 'Lock Firebase hour sync for ' + this.selectedYear + '? Saved hours stay on screen; sync buttons will be disabled until you unlock.'
      : 'Unlock Firebase hour sync for ' + this.selectedYear + '? Anyone with FDR access can run sync again.';
    if (!window.confirm(msg)) return;
    this.savingYearLock = true;
    this.loadError = '';
    this.http.put('/api/rot/fdr/' + this.selectedYear + '/settings', {hoursLocked: locking}).then(res => {
      this.savingYearLock = false;
      this.applyYearData(res.data);
    }, err => {
      this.savingYearLock = false;
      this.loadError = (err && err.data && err.data.message) || 'Failed to update year lock';
    });
  }

  yearLockLabel() {
    if (!this.hoursLocked) return '';
    let line = this.selectedYear + ' Firebase hour sync is frozen; sync is disabled.';
    if (this.hoursLockedBy || this.hoursLockedAt) {
      let parts = [];
      if (this.hoursLockedBy) parts.push('by ' + this.hoursLockedBy);
      if (this.hoursLockedAt) parts.push(this.formatSyncDate(this.hoursLockedAt));
      line += ' Locked ' + parts.join(', ') + '.';
    }
    line += ' Days off can still be edited.';
    return line;
  }

  syncFirebaseHours(scope) {
    if (!this.selectedYear || this.selectedYear === 'summary' || this.hoursLoading || this.hoursLocked) return;
    let opts = {
      scope: scope || 'all',
      offset: 0,
      continue: false,
      replaceAll: scope === 'all'
    };
    if (scope === 'base') {
      opts.base = this.syncBase || 'OME';
    }
    if (scope === 'pilot') {
      opts.pilotName = this.syncPilotName;
      if (!opts.pilotName) return;
    }
    this.loadFirebaseHours(this.selectedYear, opts);
  }

  clearHoursRefreshTimer() {
    if (this.hoursRefreshTimer) {
      this.interval.cancel(this.hoursRefreshTimer);
      this.hoursRefreshTimer = null;
    }
  }

  startHoursRefreshTimer() {
    this.clearHoursRefreshTimer();
    this.hoursRefreshStartedAt = Date.now();
    this.hoursRefreshElapsedSec = 0;
    this.hoursRefreshTimer = this.interval(() => {
      this.hoursRefreshElapsedSec = Math.floor((Date.now() - this.hoursRefreshStartedAt) / 1000);
    }, 1000);
  }

  loadFirebaseHours(year, options) {
    if (this.hoursLoading) return;
    options = options || {};
    let offset = options.offset || 0;
    let continuePrior = !!options.continue;
    let limit = 1;
    let scope = options.scope || 'all';
    let syncBody = {
      limit: limit,
      scope: scope,
      replaceAll: !!options.replaceAll
    };
    if (scope === 'base') syncBody.base = options.base || this.syncBase || 'OME';
    if (scope === 'pilot') syncBody.pilotName = options.pilotName || this.syncPilotName;
    this.hoursLoading = true;
    this.hoursLoadError = '';
    this.startHoursRefreshTimer();

    let runBatch = () => {
      let body = Object.assign({}, syncBody, {
        offset: offset,
        continue: continuePrior
      });
      return this.http.post('/api/rot/fdr/' + year + '/compute-hours', body, {timeout: 120000}).then(res => {
        this.applyYearData(res.data);
        let hc = res.data.hoursCompute;
        if (hc && !hc.done) {
          offset = hc.nextOffset;
          continuePrior = true;
          this.hoursProgress = hc;
          return runBatch();
        }
        this.hoursLoading = false;
        this.hoursProgress = hc || null;
        this.hoursLoadError = '';
        this.clearHoursRefreshTimer();
        if (hc && hc.syncedPilotNames && hc.syncedPilotNames.length) {
          this.markPilotsSyncedThisSession(hc.syncedPilotNames);
        }
      });
    };

    return runBatch().catch(err => {
      this.hoursLoading = false;
      this.clearHoursRefreshTimer();
      let status = err && err.status;
      let apiMsg = err && err.data && err.data.message;
      this.hoursLoadError = status === 403 && apiMsg
        ? apiMsg
        : status === 504
          ? 'Firebase update timed out partway through. Hours on screen are from the last batch that finished. Use Continue refresh to load the rest.'
          : 'Firebase update failed. Hours on screen are from the last successful load.';
    });
  }

  daysOffEditable(pilot) {
    return pilot && pilot.daysOffEditable;
  }

  onDaysOffBlur(pilot, monthKey) {
    if (!this.daysOffEditable(pilot) || this.selectedYear === 'summary') return;
    let monthIndex = this.months.indexOf(monthKey) + 1;
    if (!monthIndex) return;
    let raw = pilot.duty && pilot.duty.months ? pilot.duty.months[monthKey] : '';
    let entry = {
      pilotName: pilot.name,
      month: monthIndex,
      daysOff: raw === '' || raw === null || raw === undefined ? '' : parseInt(raw, 10)
    };
    this.savingDaysOff = true;
    this.http.put('/api/rot/fdr/' + this.selectedYear + '/days-off', {entries: [entry]}).then(res => {
      this.savingDaysOff = false;
      this.applyYearData(res.data);
    }, () => {
      this.savingDaysOff = false;
    });
  }

  hoursStatusBanner() {
    if (this.hoursLocked && this.mode === 'computed') {
      return this.yearLockLabel();
    }
    if (this.hoursLoading) {
      let elapsed = this.hoursRefreshElapsedSec || 0;
      let waitNote = '';
      if (this.hoursProgress && this.hoursProgress.processed === 0 && elapsed >= 12) {
        waitNote = ' Still waiting on the first Firebase batch (' + elapsed + 's) — each pilot query can take 15–45s.';
      } else if (elapsed >= 8 && (!this.hoursProgress || !this.hoursProgress.total)) {
        waitNote = ' Connecting (' + elapsed + 's)…';
      }
      if (this.hoursProgress && this.hoursProgress.total) {
        return 'Updating flight hours from Firebase — ' + this.hoursProgress.processed + ' of ' +
          this.hoursProgress.total + ' pilots loaded. The table updates as each batch finishes; ' +
          'numbers on screen are from the last successful load until a pilot’s batch completes.' + waitNote;
      }
      return 'Starting Firebase flight-hour update…' + waitNote;
    }
    if (this.hoursSource === 'firebase_partial') {
      return 'Some pilots use saved Firebase hours; others still show imported spreadsheet values until you sync them.';
    }
    if (this.mode === 'computed' && this.hoursSource === 'import') {
      return 'Flight hours are from the imported spreadsheet. Use Sync below to load Firebase hours (on demand).';
    }
    if (this.mode === 'computed' && (this.hoursSource === 'firebase' || this.hoursSource === 'firebase_partial')) {
      let line = 'Saved Firebase flight hours';
      if (this.hoursLastSyncedAt) {
        line += ' (last sync ' + this.formatSyncDate(this.hoursLastSyncedAt) + ')';
      }
      if (this.sessionPilotSyncCount() < (this.syncSummary && this.syncSummary.saved)) {
        line += '. Some pilots were not refreshed this browser session (see row markers)';
      }
      line += '. Days off are from paper F&D — edit below.';
      return line;
    }
    return '';
  }

  showHoursStatusBanner() {
    return !!this.hoursStatusBanner() && !this.viewSummary && !this.loading;
  }

  retryHoursRefresh() {
    if (!this.selectedYear || this.selectedYear === 'summary') return;
    if (this.hoursLoadError) {
      let offset = (this.hoursProgress && this.hoursProgress.nextOffset) || 0;
      this.loadFirebaseHours(this.selectedYear, {
        offset: offset,
        continue: true,
        scope: 'all',
        replaceAll: false
      });
      return;
    }
    this.syncFirebaseHours('all');
  }

  displayCell(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (typeof value === 'number') {
      let rounded = Math.round(value * 10) / 10;
      return String(rounded);
    }
    return String(value);
  }

  monthLabel(monthNum) {
    let names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[monthNum - 1] || String(monthNum);
  }

  hasHourNote(pilot, monthKey) {
    if (!pilot || !pilot.hourNotes) return false;
    return !!String(pilot.hourNotes[monthKey] || '').trim();
  }

  hourNoteTitle(pilot, monthKey) {
    if (!this.hasHourNote(pilot, monthKey)) return '';
    return String(pilot.hourNotes[monthKey]).trim();
  }

  hourCellClass(pilot, monthKey) {
    return this.pilotMonthCellClass(pilot, monthKey, true);
  }

  dutyCellClass(pilot, monthKey) {
    return this.pilotMonthCellClass(pilot, monthKey, false);
  }

  pilotStripeClass(pilotIndex) {
    return pilotIndex % 2 === 1 ? 'rot-fdr-pilot-block-b' : 'rot-fdr-pilot-block-a';
  }

  pilotMonthCellClass(pilot, monthKey, isHoursRow) {
    let classes = {};
    if (isHoursRow && this.hasHourNote(pilot, monthKey)) {
      classes['rot-fdr-cell-has-note'] = true;
    }
    if (!pilot || !pilot.monthStatus) return classes;
    if (pilot.monthStatus.complete && pilot.monthStatus.complete[monthKey]) {
      classes['rot-fdr-cell-complete'] = true;
    } else if (pilot.monthStatus.incomplete && pilot.monthStatus.incomplete[monthKey]) {
      classes['rot-fdr-cell-incomplete'] = true;
    }
    return classes;
  }

  monthHeaderClass(monthKey) {
    let incomplete = false;
    (this.sections || []).forEach(sec => {
      if (sec.monthColumnIncomplete && sec.monthColumnIncomplete[monthKey]) {
        incomplete = true;
      }
    });
    return incomplete ? 'rot-fdr-th-incomplete' : '';
  }

  openHourNote(pilot, monthKey) {
    if (!pilot || !pilot.hourNotesEditable) return;
    this.noteEditor = {
      pilotName: pilot.name,
      monthKey: monthKey,
      text: (pilot.hourNotes && pilot.hourNotes[monthKey]) || ''
    };
  }

  closeHourNote() {
    this.noteEditor = null;
  }

  saveHourNote() {
    if (!this.noteEditor || this.selectedYear === 'summary') return;
    let monthIndex = this.months.indexOf(this.noteEditor.monthKey) + 1;
    if (!monthIndex) return;
    this.savingHourNote = true;
    this.http.put('/api/rot/fdr/' + this.selectedYear + '/hour-notes', {
      entries: [{
        pilotName: this.noteEditor.pilotName,
        month: monthIndex,
        note: this.noteEditor.text
      }]
    }).then(res => {
      this.savingHourNote = false;
      this.noteEditor = null;
      this.applyYearData(res.data);
    }, err => {
      this.savingHourNote = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Failed to save hour note';
    });
  }

  showLimitsKey() {
    return this.limitsEnabled && !this.viewSummary;
  }

  applyLimitClasses(classes, metric) {
    if (!metric || metric.status === 'ok') return;
    if (metric.status === 'violation') {
      classes['rot-fdr-limit-violation'] = true;
    } else if (metric.status === 'warn') {
      classes['rot-fdr-limit-warn'] = true;
    }
  }

  limitMetricTitle(metric, prefix) {
    if (!metric || metric.status === 'ok') return '';
    let val = metric.value !== null && metric.value !== undefined ? metric.value : '—';
    if (metric.label) {
      return prefix + metric.label + ': ' + val + 'h (max ' + metric.max + 'h)';
    }
    if (metric.max !== undefined) {
      return prefix + val + 'h (max ' + metric.max + 'h)';
    }
    if (metric.min !== undefined) {
      return prefix + val + ' days off (min ' + metric.min + ')';
    }
    return '';
  }

  quarterHourClass(pilot, qKey) {
    let classes = {};
    if (!pilot || !pilot.limits) return classes;
    if (qKey === 'YEAR') {
      this.applyLimitClasses(classes, pilot.limits.hoursYear);
      return classes;
    }
    if (pilot.limits.hoursQuarter && pilot.limits.hoursQuarter[qKey]) {
      this.applyLimitClasses(classes, pilot.limits.hoursQuarter[qKey]);
    }
    if (qKey === 'Q2' && pilot.limits.rollingQuarter) {
      this.applyLimitClasses(classes, pilot.limits.rollingQuarter.Q1_Q2);
    }
    if (qKey === 'Q3' && pilot.limits.rollingQuarter) {
      this.applyLimitClasses(classes, pilot.limits.rollingQuarter.Q2_Q3);
    }
    if (qKey === 'Q4' && pilot.limits.rollingQuarter) {
      this.applyLimitClasses(classes, pilot.limits.rollingQuarter.Q3_Q4);
    }
    if (qKey === 'Q1' && pilot.limits.crossYearQ4Q1) {
      this.applyLimitClasses(classes, pilot.limits.crossYearQ4Q1);
    }
    return classes;
  }

  quarterHourTitle(pilot, qKey) {
    if (!pilot || !pilot.limits) return '';
    let titles = [];
    if (qKey === 'YEAR') {
      return this.limitMetricTitle(pilot.limits.hoursYear, 'Year hours: ');
    }
    if (pilot.limits.hoursQuarter && pilot.limits.hoursQuarter[qKey]) {
      let t = this.limitMetricTitle(pilot.limits.hoursQuarter[qKey], 'Quarter hours: ');
      if (t) titles.push(t);
    }
    if (qKey === 'Q2' && pilot.limits.rollingQuarter) {
      let t = this.limitMetricTitle(pilot.limits.rollingQuarter.Q1_Q2, '');
      if (t) titles.push(t);
    }
    if (qKey === 'Q3' && pilot.limits.rollingQuarter) {
      let t = this.limitMetricTitle(pilot.limits.rollingQuarter.Q2_Q3, '');
      if (t) titles.push(t);
    }
    if (qKey === 'Q4' && pilot.limits.rollingQuarter) {
      let t = this.limitMetricTitle(pilot.limits.rollingQuarter.Q3_Q4, '');
      if (t) titles.push(t);
    }
    if (qKey === 'Q1' && pilot.limits.crossYearQ4Q1) {
      let c = pilot.limits.crossYearQ4Q1;
      if (c && c.status !== 'ok') {
        titles.push(c.label + ': ' + c.value + 'h (max ' + c.max + 'h)');
      }
    }
    return titles.join(' · ');
  }

  quarterDutyClass(pilot, qKey) {
    let classes = {};
    if (!pilot || !pilot.limits || !pilot.limits.daysOffQuarter) return classes;
    this.applyLimitClasses(classes, pilot.limits.daysOffQuarter[qKey]);
    return classes;
  }

  quarterDutyTitle(pilot, qKey) {
    if (!pilot || !pilot.limits || !pilot.limits.daysOffQuarter) return '';
    return this.limitMetricTitle(pilot.limits.daysOffQuarter[qKey], 'Days off: ');
  }

  showCompletionKey() {
    return this.mode === 'computed' && !this.viewSummary && this.incompletePilotMonths > 0;
  }

  downloadXlsx(url, filename) {
    this.exporting = true;
    this.loadError = '';
    return this.http.get(url, {responseType: 'arraybuffer'}).then(res => {
      this.exporting = false;
      let blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      let link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, err => {
      this.exporting = false;
      let msg = err && err.data && err.data.message;
      this.loadError = msg || 'Export failed';
    });
  }

  exportCurrentExcel() {
    if (this.viewSummary) {
      this.downloadXlsx('/api/rot/fdr/summary/export', 'Flight-Duty-Summary.xlsx');
      return;
    }
    if (!this.selectedYear || this.selectedYear === 'summary') return;
    this.downloadXlsx(
      '/api/rot/fdr/' + this.selectedYear + '/export',
      'Flight-Duty-' + this.selectedYear + '.xlsx'
    );
  }

  exportFullWorkbook() {
    this.downloadXlsx('/api/rot/fdr/export/workbook', 'Flight-Duty-Report.xlsx');
  }

  printForPdf() {
    window.print();
  }
}

RotFdrComponent.$inject = ['$http', 'Auth', 'RotAccess', '$interval'];

angular.module('workspaceApp')
  .component('rotFdr', {
    templateUrl: 'app/rot/fdr/fdr.html',
    controller: RotFdrComponent,
    controllerAs: 'fdr'
  });

})();
