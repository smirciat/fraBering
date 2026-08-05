'use strict';

(function(){

class RosterComponent {
  constructor($http,$state,$timeout,$scope,uiGridConstants,moment,Modal,socket,Auth) {
    const rosterCtrl=this;
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.Auth=Auth;
    this.dutyCodes=['A','DM','IOE','8','KA','B1','B2','C1','C2','S1','S2','F','OTZ'];
    this.codes=['OC','A','DM','NM','ND','T','V','RA','RV','RO','RP','C8','C','SC','B','KA','B2','C2','SC2','F','IOE','OTZ'];
    this.captainSummaryCodes=['KA','C1','S1','8','B1','OC','A','T','NM'];
    this.foSummaryCodes=['KA','C1','S1','8','B1','OC','A','T','ND'];
    this.captainOnlySummaryCodes=['NM'];
    this.foOnlySummaryCodes=['ND'];
    this.summaryOptionalCodes=['A','T'];
    this.captainTotalExclude=['NM'];
    this.foTotalExclude=['ND'];
    this.staffSummarySeeds={
      'csa-dispatch':['OC','A','DM','8','T','B1'],
      'ground-cargo':['A','DM','8','OC'],
      'maintenance':['A','DM','8'],
      'cleaner':['A','DM'],
      'office-admin':['A','DM','OC'],
      'uncategorized':['OC','A','DM','8'],
      'helicopter':['A','AS','S','T','OC','DM','8']
    };
    this.template=[
      '<div class="ui-grid-cell-contents roster-duty-cell"',
      ' ng-class="grid.options.getDutyCellClasses(row.entity, col.colDef.field)"',
      ' ng-click="grid.options.onDutyCellClick(row.entity, col.colDef.field, $event)"',
      ' title="{{row.entity._cellMeta && row.entity._cellMeta[col.colDef.field] ? row.entity._cellMeta[col.colDef.field].title : COL_FIELD}}">',
      '<span class="roster-grid-pending roster-grid-pending--time-off"',
      ' ng-if="row.entity._cellMeta && row.entity._cellMeta[col.colDef.field].pendingKind === \'time-off\'"></span>',
      '<span class="roster-grid-pending roster-grid-pending--work"',
      ' ng-if="row.entity._cellMeta && row.entity._cellMeta[col.colDef.field].pendingKind === \'work\'"></span>',
      '<span ng-if="COL_FIELD && COL_FIELD !== \'B\' && COL_FIELD !== \'O\'">{{COL_FIELD}}</span>',
      '<i ng-if="COL_FIELD===\'B\' || COL_FIELD===\'O\'" class="fa fa-solid fa-umbrella-beach fa-autosize"></i>',
      '</div>'
    ].join('');
    this.nameCellTemplate=[
      '<div class="ui-grid-cell-contents roster-name-cell-wrap"',
      ' ng-class="{\'roster-name-cell-wrap--brush\': row.entity.isDutyBrushRow && grid.options.showDutyBrushToolbar()}">',
      '<div ng-if="row.entity.isDutyBrushRow && grid.options.showDutyBrushToolbar()"',
      ' class="roster-section-duty-brush-wrap" ng-click="$event.stopPropagation()">',
      '<div class="roster-section-duty-brush-bar">',
      '<i class="fa fa-paint-brush roster-section-duty-brush-icon" aria-hidden="true"></i>',
      '<span class="roster-section-duty-brush-title">Duty event</span>',
      '<span class="roster-section-duty-brush-section">{{row.entity.sectionLabel}}</span>',
      '<span class="roster-section-duty-brush-badge"',
      ' ng-if="grid.options.getSelectedDutyBrush(row.entity.sectionKey) !== null"',
      ' ng-class="{\'roster-section-duty-brush-badge--clear\': !grid.options.getSelectedDutyBrush(row.entity.sectionKey)}">',
      '{{grid.options.getSelectedDutyBrushLabel(row.entity.sectionKey)}}',
      '</span>',
      '<span class="roster-section-duty-brush-badge roster-section-duty-brush-badge--empty"',
      ' ng-if="grid.options.getSelectedDutyBrush(row.entity.sectionKey) === null">',
      'None',
      '</span>',
      '<button type="button"',
      ' class="roster-section-duty-brush-palette-btn"',
      ' ng-class="{\'roster-section-duty-brush-palette-btn--open\': grid.options.isDutyBrushPanelOpen(row.entity.sectionKey)}"',
      ' ng-disabled="!grid.options.canUseDutyPicker()"',
      ' ng-click="grid.options.toggleDutyBrushPanel(row.entity.sectionKey, $event)">',
      '<i class="fa fa-th" aria-hidden="true"></i>',
      '<span>Select</span>',
      '<i class="fa" ng-class="grid.options.isDutyBrushPanelOpen(row.entity.sectionKey) ? \'fa-chevron-up\' : \'fa-chevron-down\'" aria-hidden="true"></i>',
      '</button>',
      '</div>',
      '<div class="roster-section-duty-brush-panel"',
      ' ng-if="grid.options.isDutyBrushPanelOpen(row.entity.sectionKey)">',
      '<div class="roster-section-duty-brush-panel-head">',
      '<span>Select a duty code, then click cells to assign</span>',
      '<button type="button" class="roster-section-duty-brush-panel-close"',
      ' ng-click="grid.options.toggleDutyBrushPanel(row.entity.sectionKey, $event)">',
      '<i class="fa fa-times" aria-hidden="true"></i>',
      '</button>',
      '</div>',
      '<div class="roster-section-duty-brush-codes">',
      '<button type="button" class="btn btn-sm roster-duty-code-btn"',
      ' ng-repeat="code in grid.options.getDutyBrushCodes(row.entity.sectionKey) track by $index"',
      ' ng-class="{\'roster-duty-code-btn--active\': grid.options.canUseDutyPicker() && grid.options.isDutyBrushSelected(row.entity.sectionKey, code)}"',
      ' ng-disabled="!grid.options.canUseDutyPicker()"',
      ' ng-attr-title="{{grid.options.dutyBrushCodeTitle(code)}}"',
      ' ng-click="grid.options.selectDutyBrushForSection(row.entity.sectionKey, code); $event.stopPropagation()">',
      '<span ng-if="code">{{code}}</span><span ng-if="!code">Clear</span>',
      '</button>',
      '</div>',
      '</div>',
      '</div>',
      '<span ng-if="!row.entity.isDutyBrushRow" class="roster-name-cell-text" ng-class="{\'roster-name-cell-text--summary-total\': row.entity.isSummaryTotal, \'roster-name-cell-text--summary-code\': row.entity.isSummaryRow && !row.entity.isSummaryTotal}" ng-attr-title="{{grid.options.nameCellTitle(row.entity)}}">{{COL_FIELD}}</span>',
      '</div>'
    ].join('');
    this.data=[];
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    this.dataSource=this.getStoredDataSource();
    this.localEmpty=false;
    this.importing=false;
    this.savingCell=false;
    this.scheduleDays={};
    this.scheduleDaysByMonth={};
    this.calendarRequestsByRosterId={};
    this.dutyBrushBySection={};
    this.dutyBrushCodesBySection={};
    this.dutyBrushPanelOpenBySection={};
    this.dutyBrushOffCodes=['V','RA','RV','RO','RP','O'];
    this.dutyBrushCodeTitles={
      '':'Clear cell — remove duty and all requests',
      'V':'Vacation (time off)',
      'RA':'Requested absence / approved off',
      'RV':'Vacation relief day',
      'RO':'Regular off day',
      'RP':'Reserve / personal off',
      'O':'Off',
      '8':'Caravan captain',
      'C8':'Caravan captain',
      'KA':'King Air captain',
      'B1':'Beech 1900 — captain (1)',
      'B2':'Beech 1900 — first officer (2)',
      'C1':'C212 captain',
      'C2':'C212 first officer',
      'S1':'Sky Courier / C408 captain',
      'S2':'Sky Courier / C408 first officer',
      'OC':'Operations center',
      'A':'Admin',
      'T':'Training',
      'D':'Dispatch',
      'M':'Medevac',
      'N':'Night',
      'DM':'Dispatch / medevac',
      'NM':'Night — captain',
      'ND':'Night — first officer',
      'F':'Ferry / reposition',
      'OTZ':'Kotzebue base duty',
      'IOE':'Initial operating experience',
      'AS':'Aircraft specialist',
      'S':'Scheduled / standby'
    };
    this.employees=[];
    this.allEmployees=[];
    this.teamCaptains=[];
    this.teamFirstOfficers=[];
    this.activeView=window.sessionStorage.getItem('rosterActiveView') || 'schedule';
    this.showEmployeeForm=false;
    this.editingEmployee=null;
    this.employeeForm={};
    this.savingEmployee=false;
    this.importingEmployees=false;
    this.employeeImportMonthSpan=1;
    this.employeeImportMessage='';
    this.employeeImportMonthOptions=[1, 3, 6];
    this.staffJobCategories=[
      { id:'csa-dispatch', label:'CSA / Dispatch' },
      { id:'ground-cargo', label:'Ground Service / Cargo' },
      { id:'maintenance', label:'Maintenance' },
      { id:'cleaner', label:'Cleaner' },
      { id:'office-admin', label:'Office / Admin' },
      { id:'uncategorized', label:'Staff (Other)' }
    ];
    this.helicopterStaffCategory={ id:'helicopter', label:'Helicopter' };
    this.rosterBases=['OME', 'OTZ', 'UNK', 'HELI'];
    this.staffingMinimums=this.normalizeStaffingMinimumsTree(this.defaultStaffingMinimums());
    this.minimumsEditorGroups=this.buildMinimumsEditorGroups();
    this.minimumsSaveMessage='';
    this.monthLocked=false;
    this.monthLockedBy='';
    this.savingMinimums=false;
    this.allPilots=[];
    this.teamPilotsByBase={};
    this.employeesByBaseAndCategory={};
    this.employeesByCategory={};
    this.sectionFilters=this.getStoredSectionFilters();
    this.sectionPickerOptions=[];
    this.isMonthPickerOpen=false;
    this.monthPickerOptions={
      minMode:'month',
      maxMode:'year',
      showWeeks:false
    };
    this.calendarPerson=null;
    this.calendarPersonOptions=[];
    this.calendarWeeks=[];
    this.calendarEventsByDay={};
    this.calendarDays={};
    this.calendarRequests=[];
    this.calendarUpcoming=[];
    this.selectedCalendarDay=null;
    this.calendarLoading=false;
    this.viewRefreshing=false;
    this.cachedPersonRows=[];
    this.calendarRangeStart=null;
    this.calendarRangeEnd=null;
    this.savingCalendarRequest=false;
    this.calendarModerationMessage='';
    this.gridOptions={rowHeight:26,
                      headerRowHeight:42,
                      enableSorting: false,
                      enableGridMenu: false,
                      enableCellEdit: false,
                      data:this.data,
                      rowTemplate:'<div class="roster-grid-row" ng-class="grid.options.getRosterRowClass(row.entity)"><div ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ui-grid-cell class="ui-grid-cell" ng-class="grid.options.getRosterCellClass(row, col, colRenderIndex)"></div></div>',
                      getRosterRowClass:function(entity) {
                        if (!entity) return {};
                        return {
                          'roster-section-header-row': entity.isSectionHeader,
                          'roster-summary-row': entity.isSummaryRow,
                          'roster-summary-total-row': entity.isSummaryTotal,
                          'roster-summary-code-row': entity.isSummaryRow && !entity.isSummaryTotal,
                          'roster-duty-brush-row': entity.isDutyBrushRow,
                          'roster-duty-brush-row--active': entity.isDutyBrushRow && rosterCtrl.showDutyBrushToolbar(),
                          'roster-duty-brush-row--panel-open': entity.isDutyBrushRow && rosterCtrl.isDutyBrushPanelOpen(entity.sectionKey),
                          'roster-captain-row': entity.rowSection === 'captain',
                          'roster-fo-row': entity.rowSection === 'fo',
                          'roster-employee-row': entity.rowSection === 'employee',
                          'roster-staff-summary-row': entity.rowSection === 'staff-summary',
                          'roster-section-end': entity.sectionEnd,
                          'roster-section-start': entity.sectionStart,
                          'roster-spacer-row': entity.isSpacerRow
                        };
                      },
                      getRosterCellClass:function(row, col, colRenderIndex) {
                        const classes = {
                          'ui-grid-row-header-cell': !!(col && col.isRowHeader)
                        };
                        if (!row || !row.entity || !col || !col.colDef) return classes;
                        if (row.entity.isDutyBrushRow && colRenderIndex > 0) {
                          classes['roster-brush-day-cell'] = true;
                        }
                        const cellClass = col.colDef.cellClass;
                        if (typeof cellClass === 'function') {
                          const resolved = cellClass(row.grid, row, col);
                          if (resolved) {
                            String(resolved).split(' ').forEach(name => {
                              if (name) classes[name] = true;
                            });
                          }
                        } else if (cellClass) {
                          String(cellClass).split(' ').forEach(name => {
                            if (name) classes[name] = true;
                          });
                        }
                        return classes;
                      },
                      showDutyBrushToolbar:function() {
                        return rosterCtrl.showDutyBrushToolbar();
                      },
                      getDutyBrushCodes:function(sectionKey) {
                        return rosterCtrl.getDutyBrushCodes(sectionKey);
                      },
                      selectDutyBrushForSection:function(sectionKey, code) {
                        return rosterCtrl.selectDutyBrushForSection(sectionKey, code);
                      },
                      isDutyBrushSelected:function(sectionKey, code) {
                        return rosterCtrl.isDutyBrushSelected(sectionKey, code);
                      },
                      getSelectedDutyBrush:function(sectionKey) {
                        return rosterCtrl.getSelectedDutyBrushForSection(sectionKey);
                      },
                      getSelectedDutyBrushLabel:function(sectionKey) {
                        return rosterCtrl.getSelectedDutyBrushLabel(sectionKey);
                      },
                      toggleDutyBrushPanel:function(sectionKey, ev) {
                        return rosterCtrl.toggleDutyBrushPanel(sectionKey, ev);
                      },
                      isDutyBrushPanelOpen:function(sectionKey) {
                        return rosterCtrl.isDutyBrushPanelOpen(sectionKey);
                      },
                      dutyBrushCodeTitle:function(code) {
                        return rosterCtrl.dutyBrushCodeTitle(code);
                      },
                      onDutyCellClick:function(entity, dayField, ev) {
                        rosterCtrl.onDutyCellClick(entity, dayField, ev);
                      },
                      canUseDutyPicker:function() {
                        return rosterCtrl.canUseDutyPicker();
                      },
                      getDutyCellClasses:function(entity, dayField) {
                        return rosterCtrl.getDutyCellClasses(entity, dayField);
                      },
                      summaryCodeTitle:function(code) {
                        return rosterCtrl.dutyBrushCodeTitle(code);
                      },
                      nameCellTitle:function(entity) {
                        if (!entity) return '';
                        if (entity.isSummaryRow && !entity.isSummaryTotal && entity.summaryCode) {
                          return rosterCtrl.dutyBrushCodeTitle(entity.summaryCode);
                        }
                        return entity.displayName || '';
                      }
    };
    
  }

  getStoredDataSource() {
    const stored=window.sessionStorage.getItem('rosterDataSource');
    if (stored === 'firebase') return 'local';
    return stored || 'acroroster';
  }

  isLocalMode() {
    return this.dataSource === 'local';
  }

  isRosterSuperAdmin() {
    return this.Auth.isSuperAdmin();
  }

  canViewAllCalendars() {
    return this.isRosterSuperAdmin();
  }

  canSaveMinimums() {
    return this.isRosterSuperAdmin();
  }

  canModerateRoster() {
    return this.isRosterSuperAdmin();
  }

  canImportRoster() {
    return this.isRosterSuperAdmin();
  }

  canEditRosterSchedule() {
    return this.isLocalMode() && (!this.monthLocked || this.isRosterSuperAdmin());
  }

  getCurrentUserName() {
    const user=this.Auth.getCurrentUser();
    return user && user.name ? String(user.name).trim() : '';
  }

  isOwnRosterPerson(personName) {
    const userName=this.getCurrentUserName();
    if (!userName || !personName) return false;
    return this.rosterPersonNamesMatch(userName, personName);
  }

  canEditCalendarForSelectedPerson() {
    if (!this.canEditRosterSchedule()) return false;
    if (this.isRosterSuperAdmin()) return true;
    return this.isOwnRosterPerson(this.calendarPerson);
  }

  canDeleteCalendarRequest(request) {
    if (!request || !this.canEditCalendarForSelectedPerson()) return false;
    if (this.isRosterSuperAdmin()) return request.source === 'local';
    return request.source === 'local' && request.status === 'pending';
  }

  isPilotActive(pilot) {
    if (!pilot) return false;
    if (pilot.pilotBase === 'black') return false;
    if (pilot.isActive === false) return false;
    return true;
  }

  isEmployeeActive(employee) {
    if (!employee) return false;
    if (employee.isActive === false) return false;
    return true;
  }

  employeeDisplayName(employee) {
    if (employee.displayName) return employee.displayName;
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  }

  normalizeRosterPersonName(name) {
    let key=String(name || '').trim().toLowerCase();
    key=key.replace(/\(/g, ' ').replace(/\)/g, ' ').replace(/\s+/g, ' ').trim();
    if (key === 'sophia hobbs') return 'sophia evans';
    if (this.rosterNameAlias(key)) return this.rosterNameAlias(key);
    return key;
  }

  rosterNameAlias(key) {
    const aliases={
      'donald showalter':'keith showalter',
      'donald keith showalter':'keith showalter',
      'timothy kunkel':'tim kunkel',
      'michael k evans':'mike k evans',
      'michael k. evans':'mikey evans',
      'michael r evans':'mike r evans',
      'michael r. evans':'mike r evans',
      'jacob larson':'jake larson',
      'nik la croix':'nikolas lacroix',
      'conor  murray':'conor murray',
      'josh bryant':'joshua bryant'
    };
    return aliases[key] || null;
  }

  parseRosterPersonName(name) {
    let raw=String(name || '').trim();
    let middleFromParen='';
    const parenMatch=raw.match(/\(([^)]+)\)/);
    if (parenMatch) {
      middleFromParen=parenMatch[1].trim();
      raw=raw.replace(/\([^)]+\)/g, ' ').trim();
    }
    const tokens=raw.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
    if (!tokens.length) return {first:'', middle:'', last:''};
    if (tokens.length === 1) return {first:tokens[0], middle:middleFromParen, last:tokens[0]};
    const first=tokens[0];
    const last=tokens[tokens.length - 1];
    let middle=middleFromParen;
    if (!middle && tokens.length > 2) middle=tokens.slice(1, -1).join(' ');
    return {first, middle, last};
  }

  middleNameKey(middle) {
    if (!middle) return '';
    return String(middle).replace(/\./g, '').trim().toLowerCase().charAt(0);
  }

  rosterPersonNamesMatch(a, b) {
    const na=this.normalizeRosterPersonName(a);
    const nb=this.normalizeRosterPersonName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const pa=this.parseRosterPersonName(na);
    const pb=this.parseRosterPersonName(nb);
    if (pa.last !== pb.last) return false;
    const firstA=pa.first.toLowerCase();
    const firstB=pb.first.toLowerCase();
    const firstOk=firstA === firstB ||
      firstA.charAt(0) === firstB.charAt(0);
    if (!firstOk) return false;
    const midA=this.middleNameKey(pa.middle);
    const midB=this.middleNameKey(pb.middle);
    if (midA && midB && midA !== midB) return false;
    return true;
  }

  findPilotByRosterName(personName) {
    const matches=(this.pilots || []).filter(pilot=>{
      return this.rosterPersonNamesMatch(this.pilotDisplayName(pilot), personName);
    });
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const exact=matches.find(pilot=>{
        return this.normalizeRosterPersonName(this.pilotDisplayName(pilot)) ===
          this.normalizeRosterPersonName(personName);
      });
      return exact || null;
    }
    return null;
  }

  eventBaseFromRecord(record) {
    if (!record || !record.location_name) return null;
    const location=String(record.location_name).split(' ')[0].toUpperCase();
    if (location === 'NOME') return 'OME';
    if (location === 'KOTZEBUE' || location === 'KOTZ') return 'OTZ';
    if (location === 'UNALAKLEET' || location === 'UNK') return 'UNK';
    if (location === 'HELICOPTER' || location === 'HELI') return 'HELI';
    return null;
  }

  recordMatchesBase(record, base) {
    const recordBase=this.eventBaseFromRecord(record);
    if (!recordBase) return true;
    return recordBase === base;
  }

  isPilotLocationEvent(record) {
    if (!record || !record.location_name) return false;
    const position=String(record.location_name).split(' ')[1] || '';
    const role=position.toUpperCase();
    return role === 'CAPT' || role === 'FO';
  }

  inferJobCategoryFromEvent(record) {
    const hay=`${record.location_name || ''} ${record.label || ''} ${record.qualifications || ''}`.toLowerCase();
    if (/dispatch|dispatcher|\bcsa\b|ticket counter|counter open|counter close|customer service|operations control|\boc\b/.test(hay)) {
      return 'csa-dispatch';
    }
    if (/cargo|ground|ramp|baggage|handler|warehouse|loader|freight/.test(hay)) {
      return 'ground-cargo';
    }
    if (/maintenance|mechanic|hangar|\bmx\b|airframe|powerplant|a&p/.test(hay)) {
      return 'maintenance';
    }
    if (/clean|janitor|housekeep|custodial/.test(hay)) {
      return 'cleaner';
    }
    if (/office|admin|account|payroll|assistant|receivable|human resource|\bhr\b|bookkeep/.test(hay)) {
      return 'office-admin';
    }
    if (/helicopter|\bheli\b/.test(hay)) {
      return 'helicopter';
    }
    return 'uncategorized';
  }

  staffLabelForGrid(record) {
    let label=record.label;
    if (label === '8') label='C8';
    label=String(label || '').trim();
    if (label.length > 4) label=label.substring(0, 4);
    return label.toUpperCase();
  }

  acroGridDutyCodes() {
    return this.codes.concat(this.dutyCodes).filter((code, index, arr)=>arr.indexOf(code) === index);
  }

  pilotRoleFromAcrorosterLocation(locationName) {
    const upper=String(locationName || '').toUpperCase();
    if (!upper) return null;
    const hasCapt=/\bCAPT\b/.test(upper);
    const hasFo=/\bFO\b/.test(upper);
    if (hasCapt && !hasFo) return 'captain';
    if (hasFo && !hasCapt) return 'fo';
    if (hasFo) return 'fo';
    if (hasCapt) return 'captain';
    return null;
  }

  pilotMatchesAcrorosterEventRole(record, pilot) {
    const eventRole=this.pilotRoleFromAcrorosterLocation(record && record.location_name);
    if (!eventRole) return true;
    const isCaptain=!!(pilot && pilot.far299Exp);
    return eventRole === (isCaptain ? 'captain' : 'fo');
  }

  dutyTokensFromAcrorosterText(text) {
    const skip={
      NOME:true, KOTZEBUE:true, KOTZ:true, UNALAKLEET:true, UNK:true,
      HELICOPTER:true, HELI:true, CAPT:true, FO:true, PILOT:true
    };
    const known=new Set(this.acroGridDutyCodes());
    return String(text || '').toUpperCase().split(/[\s,/]+/).filter(Boolean).filter(part=>{
      return !skip[part] && known.has(part);
    });
  }

  normalizeAcrorosterDutyToken(raw, pilot) {
    let duty=String(raw || '').trim();
    if (!duty) return '';
    if (duty === '8') duty='C8';
    if (duty === '16') duty=pilot && pilot.far299Exp ? 'NM' : 'ND';
    duty=duty.toUpperCase();
    if (duty.length > 4) duty=duty.substring(0, 4);
    return duty;
  }

  acrorosterDutyCodeForPilot(record, pilot) {
    if (!record || !pilot) return '';
    if (!this.pilotMatchesAcrorosterEventRole(record, pilot)) return '';

    const isCaptain=!!pilot.far299Exp;
    const labelUpper=String(record.label || '').trim().toUpperCase();
    let duty='';

    if (labelUpper && labelUpper !== 'CAPT' && labelUpper !== 'FO') {
      duty=this.normalizeAcrorosterDutyToken(record.label, pilot);
    }
    if (!duty) {
      const fromLocation=this.dutyTokensFromAcrorosterText(record.location_name);
      if (fromLocation.length) duty=fromLocation[0];
    }
    if (!duty) {
      const fromQuals=this.dutyTokensFromAcrorosterText(record.qualifications || record.qualification || '');
      if (fromQuals.length) duty=fromQuals[0];
    }
    if (!duty) return '';

    const captainOnly=['KA', 'NM', 'C8'];
    const foOnly=['ND', 'B2', 'C2', 'S2'];
    if (!isCaptain && captainOnly.indexOf(duty) > -1) return '';
    if (isCaptain && foOnly.indexOf(duty) > -1) return '';

    return duty;
  }

  scoreAcrorosterPilotEvent(record, pilot) {
    let score=0;
    const loc=String(record.location_name || '').toUpperCase();
    const isCaptain=!!pilot.far299Exp;
    if (isCaptain && /\bCAPT\b/.test(loc)) score += 20;
    if (!isCaptain && /\bFO\b/.test(loc)) score += 20;
    if (this.acrorosterDutyCodeForPilot(record, pilot)) score += 10;
    if (String(record.type || '').toLowerCase() === 'shift') score += 5;
    return score;
  }

  pickPilotDutyFromAcrorosterRecords(records, pilot) {
    let best='';
    let bestScore=-1;
    (records || []).forEach(record=>{
      const duty=this.acrorosterDutyCodeForPilot(record, pilot);
      if (!duty) return;
      const score=this.scoreAcrorosterPilotEvent(record, pilot);
      if (score > bestScore) {
        bestScore=score;
        best=duty;
      }
    });
    return best;
  }

  pilotDutyLabelForCount(record, pilot) {
    return this.acrorosterDutyCodeForPilot(record, pilot);
  }

  spreadMultiDayEvents(records) {
    const arr=[];
    (records || []).forEach(record=>{
      arr.push(record);
      const startDate=new Date(record.start_plain_date_time);
      let daysLength=Math.ceil(Math.abs(new Date(record.end_plain_date_time).getTime()-startDate.getTime()) / (1000 * 60 * 60 * 24));
      while (daysLength > 1) {
        daysLength--;
        const newDate=new Date(startDate);
        newDate.setDate(newDate.getDate()+daysLength);
        const newRecord=angular.copy(record);
        newRecord.start_plain_date_time=newDate.toISOString();
        arr.push(newRecord);
      }
    });
    return arr;
  }

  buildStaffRowsFromEvents(records) {
    const pilotNames=new Set(this.pilots.map(pilot=>{
      return this.normalizeRosterPersonName(`${pilot.firstName} ${pilot.lastName}`);
    }));
    const byKey={};
    (this.employees || []).forEach(employee=>{
      const base=employee.base || 'OME';
      const nameKey=this.normalizeRosterPersonName(this.employeeDisplayName(employee));
      if (!nameKey) return;
      byKey[`${base}::${nameKey}`]={
        rosterKind:'employee',
        rosterId:`employee:${employee._id}`,
        displayName:this.employeeDisplayName(employee),
        jobCategory:employee.jobCategory || 'uncategorized',
        base,
        _id:employee._id
      };
    });
    this.spreadMultiDayEvents(records || []).forEach(record=>{
      if (record.type && record.type !== 'shift') return;
      if (this.isPilotLocationEvent(record)) return;
      const fullName=String(record.employee_full_name || '').trim();
      if (!fullName) return;
      const nameKey=this.normalizeRosterPersonName(fullName);
      if (!nameKey || pilotNames.has(nameKey)) return;
      const eventBase=this.eventBaseFromRecord(record);
      if (!eventBase || this.rosterBases.indexOf(eventBase) < 0) return;
      const rowKey=`${eventBase}::${nameKey}`;
      if (!byKey[rowKey]) {
        const parts=fullName.split(/\s+/);
        byKey[rowKey]={
          rosterKind:'employee',
          rosterId:`acro:${eventBase}-${nameKey.replace(/\s+/g, '-')}`,
          displayName:fullName,
          firstName:parts[0] || '',
          lastName:parts.slice(1).join(' '),
          jobCategory:this.inferJobCategoryFromEvent(record),
          base:eventBase,
          fromAcroroster:true
        };
      }
      const eventDate=new Date(record.start_plain_date_time);
      if (eventDate.getMonth() !== this.date.getMonth() || eventDate.getFullYear() !== this.date.getFullYear()) return;
      byKey[rowKey][String(eventDate.getUTCDate())]=this.staffLabelForGrid(record);
    });
    return Object.values(byKey);
  }

  jobCategoryLabel(jobCategory) {
    const match=this.staffJobCategories.find(cat=>cat.id === (jobCategory || 'uncategorized')) ||
      (this.helicopterStaffCategory.id === (jobCategory || '') ? this.helicopterStaffCategory : null);
    return match ? match.label : 'Staff (Other)';
  }

  staffJobCategoriesForBase(base) {
    if (base === 'HELI') return [this.helicopterStaffCategory];
    return this.staffJobCategories;
  }

  allStaffJobCategories() {
    return this.staffJobCategories.concat([this.helicopterStaffCategory]);
  }

  rebuildEmployeeGroups() {
    this.employeesByCategory={};
    this.employeesByBaseAndCategory={};
    this.allStaffJobCategories().forEach(cat=>{
      this.employeesByCategory[cat.id]=[];
    });
    this.rosterBases.forEach(base=>{
      this.employeesByBaseAndCategory[base]={};
      this.staffJobCategoriesForBase(base).forEach(cat=>{
        this.employeesByBaseAndCategory[base][cat.id]=[];
      });
    });
    (this.allEmployees || []).forEach(employee=>{
      const base=employee.base || 'OME';
      const key=employee.jobCategory || 'uncategorized';
      if (this.employeesByCategory[key]) this.employeesByCategory[key].push(employee);
      if (this.employeesByBaseAndCategory[base] && this.employeesByBaseAndCategory[base][key]) {
        this.employeesByBaseAndCategory[base][key].push(employee);
      }
    });
    this.allStaffJobCategories().forEach(cat=>{
      this.employeesByCategory[cat.id].sort((a,b)=>{
        return this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b));
      });
      this.rosterBases.forEach(base=>{
        if (!this.employeesByBaseAndCategory[base] || !this.employeesByBaseAndCategory[base][cat.id]) return;
        this.employeesByBaseAndCategory[base][cat.id].sort((a,b)=>{
          return this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b));
        });
      });
    });
  }

  pilotDisplayName(pilot) {
    if (pilot.displayName) return pilot.displayName;
    return `${pilot.firstName || ''} ${pilot.lastName || ''}`.trim();
  }

  pilotHireDate(pilot) {
    if (!pilot || !pilot.dateOfHire) return Number.MAX_SAFE_INTEGER;
    const value=pilot.dateOfHire;
    if (value && value._seconds) return value._seconds * 1000;
    if (value && value.seconds) return value.seconds * 1000;
    const parsed=new Date(value).getTime();
    return isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }

  comparePilotsByHireDate(a, b) {
    if (!a.far299Exp && b.far299Exp) return 1;
    if (!b.far299Exp && a.far299Exp) return -1;
    const aDate=this.pilotHireDate(a);
    const bDate=this.pilotHireDate(b);
    if (aDate !== bDate) return aDate - bDate;
    return String(a._id || '').localeCompare(String(b._id || ''));
  }

  sortPilotList() {
    this.pilots.sort((a,b)=>this.comparePilotsByHireDate(a, b));
  }

  sortEmployeeList() {
    this.employees.sort((a,b)=>{
      return this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b));
    });
  }

  formatHireDate(pilot) {
    const ms=this.pilotHireDate(pilot);
    if (ms === Number.MAX_SAFE_INTEGER) return '';
    return new Date(ms).toLocaleDateString();
  }

  loadingLabel() {
    if (this.importing || this.importingEmployees) return 'Importing…';
    if (this.calendarLoading) return 'Loading calendar…';
    if (this.viewRefreshing) return 'Updating view…';
    if (this.spinner) return 'Loading…';
    return 'Loading…';
  }

  defaultStaffingMinimums() {
    const min=(weekday, weekend)=>{
      return {weekday:weekday, weekend:weekend != null ? weekend : weekday};
    };
    return {
      captains:{
        OME:{KA:min(1), OC:min(1)},
        OTZ:{KA:min(1)},
        UNK:{KA:min(1), OC:min(1)}
      },
      fos:{
        OME:{KA:min(1), OC:min(1)},
        UNK:{KA:min(1)}
      }
    };
  }

  normalizeMinimumEntry(value) {
    if (value != null && typeof value === 'object') {
      return {
        weekday:parseInt(value.weekday, 10) || 0,
        weekend:parseInt(value.weekend, 10) || 0
      };
    }
    const parsed=parseInt(value, 10) || 0;
    return {weekday:parsed, weekend:parsed};
  }

  normalizeStaffingMinimumsTree(tree) {
    const normalized=JSON.parse(JSON.stringify(tree || {}));
    Object.keys(normalized).forEach(sectionType=>{
      Object.keys(normalized[sectionType] || {}).forEach(base=>{
        Object.keys(normalized[sectionType][base] || {}).forEach(code=>{
          normalized[sectionType][base][code]=this.normalizeMinimumEntry(normalized[sectionType][base][code]);
        });
      });
    });
    return normalized;
  }

  loadStaffingMinimumsFromServer() {
    return this.http.post('/api/calendar/rosterStaffingMinimumsGet', {}).then(resp=>{
      const stored=resp.data && resp.data.minimums;
      if (stored) {
        this.staffingMinimums=this.normalizeStaffingMinimumsTree(
          this.mergeStaffingMinimums(this.defaultStaffingMinimums(), stored)
        );
      }
      if (this.gridOptions.data && this.gridOptions.data.length) this.refreshSummaryRows();
    }, () => {
      // keep defaults
    });
  }

  fetchMonthMeta() {
    return this.http.post('/api/calendar/rosterMonthMeta', { date:this.date }).then(resp=>{
      this.monthLocked=!!(resp.data && resp.data.locked);
      this.monthLockedBy=(resp.data && resp.data.lockedBy) || '';
      this.updateGridEditing();
      if (this.isLocalMode()) {
        return this.loadLocalCalendarIndex().then(()=>{
          if (this.cachedPersonRows && this.cachedPersonRows.length) this.applyLocalScheduleToGrid();
        });
      }
    }, ()=>{
      this.monthLocked=false;
      this.monthLockedBy='';
    });
  }

  refreshLocalScheduleViews() {
    if (!this.isLocalMode()) return Promise.resolve();
    return this.loadLocalCalendarIndex().then(()=>{
      this.applyLocalScheduleToGrid();
      if (this.activeView === 'calendar') this.loadCalendarData();
    });
  }

  toggleMonthLock() {
    if (!this.canModerateRoster()) return;
    this.http.post('/api/calendar/rosterMonthLock', {
      date:this.date,
      locked:!this.monthLocked
    }).then(resp=>{
      this.monthLocked=!!(resp.data && resp.data.locked);
      this.updateGridEditing();
      return this.refreshLocalScheduleViews();
    });
  }

  mergeStaffingMinimums(defaults, stored) {
    const merged=JSON.parse(JSON.stringify(defaults || {}));
    Object.keys(stored || {}).forEach(sectionType=>{
      if (!merged[sectionType]) merged[sectionType]={};
      Object.keys(stored[sectionType] || {}).forEach(base=>{
        if (!merged[sectionType][base]) merged[sectionType][base]={};
        Object.keys(stored[sectionType][base] || {}).forEach(code=>{
          merged[sectionType][base][code]=stored[sectionType][base][code];
        });
      });
    });
    return merged;
  }

  buildMinimumsEditorGroups() {
    const pilotBases=this.rosterBases.filter(base=>base !== 'HELI');
    const groups=[
      {sectionType:'captains', label:'Captains', bases:pilotBases.slice(), codes:this.captainSummaryCodes.slice()},
      {sectionType:'fos', label:'First officers', bases:pilotBases.filter(base=>base !== 'OTZ'), codes:this.foSummaryCodes.slice()}
    ];
    this.allStaffJobCategories().forEach(cat=>{
      const bases=cat.id === 'helicopter' ?
        ['HELI'] :
        this.rosterBases.filter(base=>base !== 'HELI');
      groups.push({
        sectionType:`staff-${cat.id}`,
        label:cat.label,
        bases:bases,
        codes:this.getStaffSummarySeedCodes(cat.id)
      });
    });
    return groups;
  }

  ensureStaffingMinimumSlot(sectionType, base, code) {
    if (!this.staffingMinimums[sectionType]) this.staffingMinimums[sectionType]={};
    if (!this.staffingMinimums[sectionType][base]) this.staffingMinimums[sectionType][base]={};
    if (this.staffingMinimums[sectionType][base][code] == null) {
      this.staffingMinimums[sectionType][base][code]={weekday:0, weekend:0};
    } else {
      this.staffingMinimums[sectionType][base][code]=this.normalizeMinimumEntry(
        this.staffingMinimums[sectionType][base][code]
      );
    }
  }

  isWeekendDay(dayNum) {
    const day=parseInt(dayNum, 10);
    if (!this.date || !day) return false;
    const dow=new Date(this.date.getFullYear(), this.date.getMonth(), day).getDay();
    return dow === 0 || dow === 6;
  }

  getStaffingMinimumValue(sectionType, base, code, period) {
    this.ensureStaffingMinimumSlot(sectionType, base, code);
    const entry=this.staffingMinimums[sectionType][base][code];
    return period === 'weekend' ? entry.weekend : entry.weekday;
  }

  setStaffingMinimumValue(sectionType, base, code, period, value) {
    this.ensureStaffingMinimumSlot(sectionType, base, code);
    const parsed=parseInt(value, 10);
    this.staffingMinimums[sectionType][base][code][period]=isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  saveStaffingMinimums() {
    if (!this.canSaveMinimums()) return;
    this.savingMinimums=true;
    this.http.post('/api/calendar/rosterStaffingMinimumsSave', {
      minimums:this.staffingMinimums
    }).then(()=>{
      this.minimumsSaveMessage='Saved — minimums apply for all users.';
      this.refreshSummaryRows();
      this.timeout(()=>{ this.minimumsSaveMessage=''; }, 4000);
    }, ()=>{
      this.minimumsSaveMessage='Could not save minimums.';
    }).finally(()=>{
      this.savingMinimums=false;
    });
  }

  resetStaffingMinimums() {
    if (!this.canSaveMinimums()) return;
    this.staffingMinimums=this.normalizeStaffingMinimumsTree(this.defaultStaffingMinimums());
    this.saveStaffingMinimums();
    this.minimumsSaveMessage='Reset to defaults and saved.';
  }

  setActiveView(view) {
    if (this.activeView === view) return;
    this.viewRefreshing=true;
    this.activeView=view;
    window.sessionStorage.setItem('rosterActiveView', view);
    this.timeout(()=>{
      if (view === 'team') this.refreshTeamLists();
      if (view === 'schedule') {
        this.refreshSummaryRows();
        this.refreshDutyBrushCodesBySection();
      }
      if (view === 'minimums') this.minimumsEditorGroups=this.buildMinimumsEditorGroups();
      if (view === 'calendar') {
        this.refreshCalendarPersonOptions();
        this.loadCalendarData();
      }
      if (!this.calendarLoading) {
        this.timeout(()=>{ this.viewRefreshing=false; }, 200);
      } else {
        this.viewRefreshing=false;
      }
    }, 0);
  }

  runViewRefresh(work) {
    this.viewRefreshing=true;
    this.timeout(()=>{
      if (work) work();
      this.timeout(()=>{ this.viewRefreshing=false; }, 200);
    }, 0);
  }

  refreshTeamLists() {
    this.teamPilotsByBase={};
    this.rosterBases.forEach(base=>{
      this.teamPilotsByBase[base]={ captains:[], fos:[] };
    });
    (this.allPilots || this.pilots || []).forEach(pilot=>{
      const base=pilot.pilotBase;
      if (!this.teamPilotsByBase[base]) return;
      if (pilot.far299Exp) this.teamPilotsByBase[base].captains.push(pilot);
      else this.teamPilotsByBase[base].fos.push(pilot);
    });
    this.rosterBases.forEach(base=>{
      this.teamPilotsByBase[base].captains.sort((a,b)=>this.comparePilotsByHireDate(a, b));
      this.teamPilotsByBase[base].fos.sort((a,b)=>this.comparePilotsByHireDate(a, b));
    });
    this.teamCaptains=this.teamPilotsByBase.OME ? this.teamPilotsByBase.OME.captains : [];
    this.teamFirstOfficers=this.teamPilotsByBase.OME ? this.teamPilotsByBase.OME.fos : [];
  }

  openEmployeeForm(employee, preferredBase) {
    this.editingEmployee=employee || null;
    this.employeeForm=employee ? angular.copy(employee) : {
      firstName:'',
      lastName:'',
      employeeNumber:'',
      qualifications:'',
      jobCategory:'csa-dispatch',
      base:preferredBase || 'OME',
      isActive:true
    };
    if (!this.employeeForm.base) {
      this.employeeForm.base=employee && employee.base ? employee.base : (preferredBase || 'OME');
    }
    if (!this.employeeForm.jobCategory) {
      this.employeeForm.jobCategory=this.employeeForm.base === 'HELI' ? 'helicopter' : 'uncategorized';
    }
    this.showEmployeeForm=true;
  }

  cancelEmployeeForm() {
    this.showEmployeeForm=false;
    this.editingEmployee=null;
    this.employeeForm={};
  }

  saveEmployee() {
    if (!this.isLocalMode() || this.savingEmployee) return;
    if (!this.employeeForm.base) return;
    this.savingEmployee=true;
    this.http.post('/api/calendar/rosterEmployeeSave', Object.assign({}, this.employeeForm, {
      base:this.employeeForm.base,
      _id:this.editingEmployee && this.editingEmployee._id
    })).then(()=>{
      return this.loadEmployees();
    }).then(()=>{
      this.cancelEmployeeForm();
      if (this.activeView === 'schedule') this.applyLocalScheduleToGrid();
    }).finally(()=>{
      this.savingEmployee=false;
    });
  }

  deleteEmployee(employee) {
    if (!this.isLocalMode() || !employee || !employee._id) return;
    if (!window.confirm(`Remove ${this.employeeDisplayName(employee)} from staff roster?`)) return;
    this.http.post('/api/calendar/rosterEmployeeDelete', { _id: employee._id }).then(()=>{
      return this.loadEmployees();
    }).then(()=>{
      if (this.activeView === 'schedule') this.applyLocalScheduleToGrid();
    });
  }

  importEmployeesFromAcroroster() {
    if (!this.isLocalMode() || this.importingEmployees) return;
    this.importingEmployees=true;
    this.spinner=true;
    this.employeeImportMessage='';
    this.http.post('/api/calendar/rosterEmployeesImportFromAcroroster', {
      bases:this.rosterBases,
      date:this.date,
      monthSpan:this.employeeImportMonthSpan,
      pilots:this.pilots
    }).then(resp=>{
      if (!resp || !resp.data) return;
      const data=resp.data;
      const baseParts=(data.bases || this.rosterBases).map(base=>{
        const info=data.byBase && data.byBase[base];
        if (!info) return base;
        return `${base} ${info.created}+${info.updated}`;
      });
      this.employeeImportMessage=`Imported ${data.created} new and updated ${data.updated} staff from AcroRoster for ${baseParts.join(', ')} (${data.monthSpan} month sample: ${(data.monthsLoaded || []).join(', ')}).`;
      return this.loadEmployees();
    }).then(()=>{
      if (this.activeView === 'schedule') this.applyLocalScheduleToGrid();
    }).catch(()=>{
      this.employeeImportMessage='Employee import failed. Check server logs and ROSTER_TOKEN.';
    }).finally(()=>{
      this.importingEmployees=false;
      this.spinner=false;
    });
  }

  loadEmployees() {
    return this.http.post('/api/calendar/rosterEmployees', { bases:this.rosterBases }).then(empResp=>{
      this.allEmployees=(empResp && empResp.data ? empResp.data : []).map(employee=>{
        return Object.assign({}, employee, { base:employee.base || 'OME' });
      });
      this.employees=this.allEmployees.filter(employee=>this.isEmployeeActive(employee));
      this.sortEmployeeList();
      this.allEmployees.sort((a,b)=>this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b)));
      this.rebuildEmployeeGroups();
      this.refreshTeamLists();
      this.refreshCalendarPersonOptions();
    });
  }

  monthTitle() {
    if (!this.date) return '';
    return this.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  syncNavDateStrings(date) {
    const nav=this.scope.nav;
    if (!nav) return;
    nav.date=new Date(date);
    nav.dateString=this.dateString;
    nav.dateStringFormatted=date.toLocaleDateString('en-US', {
      weekday:'short',
      year:'numeric',
      month:'numeric',
      day:'numeric'
    });
    window.dateString=this.dateString;
  }

  loadMonth(date) {
    if (!date || isNaN(date.getTime())) return;
    const normalized=new Date(date.getFullYear(), date.getMonth(), 1);
    this.date=normalized;
    this.dateString=normalized.toLocaleDateString();
    this.syncNavDateStrings(normalized);
    this.spinner=true;
    this.fetchMonthMeta();
    this.init();
  }

  prevMonth() {
    if (!this.date) return;
    this.loadMonth(new Date(this.date.getFullYear(), this.date.getMonth()-1, 1));
  }

  nextMonth() {
    if (!this.date) return;
    this.loadMonth(new Date(this.date.getFullYear(), this.date.getMonth()+1, 1));
  }

  onMonthSelected() {
    if (!this.date) return;
    this.loadMonth(this.date);
  }

  toggleMonthPicker($event) {
    if ($event) $event.preventDefault();
    this.isMonthPickerOpen=!this.isMonthPickerOpen;
  }

  refreshCalendarPersonOptions() {
    const options=[];
    const seen=new Set();
    const restrictToSelf=!this.canViewAllCalendars();
    const userName=this.getCurrentUserName();
    (this.pilots || []).forEach(pilot=>{
      const label=this.pilotDisplayName(pilot);
      if (restrictToSelf && !this.rosterPersonNamesMatch(userName, label)) return;
      const key=this.normalizeRosterPersonName(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      options.push({ key:label, label, kind:'pilot' });
    });
    (this.employees || []).forEach(employee=>{
      const label=this.employeeDisplayName(employee);
      if (restrictToSelf && !this.rosterPersonNamesMatch(userName, label)) return;
      const key=this.normalizeRosterPersonName(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      options.push({ key:label, label, kind:'employee' });
    });
    options.sort((a,b)=>a.label.localeCompare(b.label));
    this.calendarPersonOptions=options;
    if (!options.length) {
      this.calendarPerson=null;
      return;
    }
    const stored=window.sessionStorage.getItem('rosterCalendarPerson');
    if (stored && options.some(opt=>opt.key === stored)) {
      this.calendarPerson=stored;
      return;
    }
    if (this.calendarPerson && options.some(opt=>opt.key === this.calendarPerson)) return;
    const match=options.find(opt=>this.normalizeRosterPersonName(opt.key) === this.normalizeRosterPersonName(userName));
    this.calendarPerson=match ? match.key : options[0].key;
  }

  setCalendarPerson(name) {
    this.calendarPerson=name;
    window.sessionStorage.setItem('rosterCalendarPerson', name);
    this.clearCalendarSelection();
    this.loadCalendarData();
  }

  clearCalendarSelection() {
    this.selectedCalendarDay=null;
    this.calendarRangeStart=null;
    this.calendarRangeEnd=null;
  }

  resolveCalendarPersonMeta() {
    const target=this.normalizeRosterPersonName(this.calendarPerson);
    const pilot=this.findPilotByRosterName(this.calendarPerson) ||
      (this.pilots || []).find(item=>{
        return this.rosterPersonNamesMatch(this.pilotDisplayName(item), this.calendarPerson);
      });
    if (pilot && pilot._id) {
      return {
        base:pilot.pilotBase || this.getNavBaseCode(),
        rosterId:`pilot:${pilot._id}`,
        personName:this.pilotDisplayName(pilot),
        kind:'pilot'
      };
    }
    const employee=(this.allEmployees || this.employees || []).find(item=>{
      return this.rosterPersonNamesMatch(this.employeeDisplayName(item), this.calendarPerson);
    });
    if (employee && employee._id) {
      return {
        base:employee.base || this.getNavBaseCode(),
        rosterId:`employee:${employee._id}`,
        personName:this.employeeDisplayName(employee),
        kind:'employee'
      };
    }
    return {
      base:this.getNavBaseCode(),
      rosterId:null,
      personName:this.calendarPerson,
      kind:null
    };
  }

  loadCalendarData() {
    if (this.activeView !== 'calendar' || !this.calendarPerson) return;
    const meta=this.resolveCalendarPersonMeta();
    this.calendarLoading=true;
    this.http.post('/api/calendar/rosterPersonMonth', {
      date:this.date,
      base:meta.base,
      personName:meta.personName || this.calendarPerson,
      rosterId:meta.rosterId,
      bases:this.rosterBases,
      allBases:true,
      source:this.isLocalMode() ? 'local' : 'acroroster',
      monthLocked:this.monthLocked,
      pilots:this.pilots,
      employees:this.allEmployees || this.employees
    }).then(resp=>{
      this.processCalendarEvents((resp && resp.data && resp.data.events) ? resp.data.events : []);
    }).finally(()=>{
      this.calendarLoading=false;
    });
  }

  showDutyBrushToolbar() {
    return this.isRosterSuperAdmin() && this.activeView === 'schedule';
  }

  canUseDutyPicker() {
    return this.showDutyBrushToolbar() && this.canEditRosterSchedule();
  }

  refreshGridSize() {
    if (!this.gridApi || !this.gridApi.core) return;
    this.timeout(()=>{
      if (this.gridApi && this.gridApi.core) this.gridApi.core.handleWindowResize();
    }, 0);
  }

  refreshDutyBrushCodesBySection() {
    this.dutyBrushCodesBySection={};
    (this.sectionPickerOptions || []).forEach(opt=>{
      if (this.isSectionVisible(opt.key)) {
        this.dutyBrushCodesBySection[opt.key]=this.collectDutyCodesForSection(opt.key);
      }
    });
  }

  getDutyBrushCodes(sectionKey) {
    if (!sectionKey) return [];
    if (!this.dutyBrushCodesBySection[sectionKey]) {
      this.dutyBrushCodesBySection[sectionKey]=this.collectDutyCodesForSection(sectionKey);
    }
    return this.dutyBrushCodesBySection[sectionKey];
  }

  getSelectedDutyBrushForSection(sectionKey) {
    if (!sectionKey || !this.dutyBrushBySection.hasOwnProperty(sectionKey)) return null;
    return this.dutyBrushBySection[sectionKey];
  }

  selectDutyBrushForSection(sectionKey, code) {
    if (!sectionKey) return;
    if (code === null || code === undefined) {
      this.dutyBrushBySection[sectionKey]=null;
    } else if (code === '') {
      this.dutyBrushBySection[sectionKey]='';
    } else {
      this.dutyBrushBySection[sectionKey]=String(code).trim().toUpperCase();
    }
    if (this.scope && !this.scope.$$phase) this.scope.$applyAsync();
  }

  isDutyBrushSelected(sectionKey, code) {
    const selected=this.getSelectedDutyBrushForSection(sectionKey);
    if (selected === null) return false;
    if (code === '' || code === null || code === undefined) return selected === '';
    return selected === String(code).trim().toUpperCase();
  }

  getSelectedDutyBrushLabel(sectionKey) {
    const brush=this.getSelectedDutyBrushForSection(sectionKey);
    if (brush === null) return '';
    if (brush === '') return 'Clear';
    return brush;
  }

  isDutyBrushPanelOpen(sectionKey) {
    return !!(sectionKey && this.dutyBrushPanelOpenBySection[sectionKey]);
  }

  toggleDutyBrushPanel(sectionKey, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!sectionKey) return;
    const wasOpen=!!this.dutyBrushPanelOpenBySection[sectionKey];
    this.dutyBrushPanelOpenBySection={};
    if (!wasOpen) this.dutyBrushPanelOpenBySection[sectionKey]=true;
    if (this.scope && !this.scope.$$phase) this.scope.$applyAsync();
  }

  getSectionKeyForCalendarPerson() {
    const pilot=this.findPilotByRosterName(this.calendarPerson) ||
      (this.pilots || []).find(item=>{
        return this.rosterPersonNamesMatch(this.pilotDisplayName(item), this.calendarPerson);
      });
    if (pilot && pilot._id) {
      if (pilot.far299Exp) return this.sectionFilterKey(pilot.pilotBase, 'captains');
      return this.sectionFilterKey(pilot.pilotBase, 'fos');
    }
    const employee=(this.allEmployees || this.employees || []).find(item=>{
      return this.rosterPersonNamesMatch(this.employeeDisplayName(item), this.calendarPerson);
    });
    if (employee && employee._id) {
      const base=employee.base || this.getNavBaseCode();
      return this.sectionFilterKey(base, employee.jobCategory || 'uncategorized');
    }
    return null;
  }

  currentMonthKey() {
    const y=this.date.getFullYear();
    const m=this.date.getMonth() + 1;
    return `${y}-${m < 10 ? '0' : ''}${m}`;
  }

  monthKeyFromDate(date) {
    const y=date.getFullYear();
    const m=date.getMonth() + 1;
    return `${y}-${m < 10 ? '0' : ''}${m}`;
  }

  monthKeysForDutyInference() {
    const keys=[];
    const d=this.date;
    const prev=new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const next=new Date(d.getFullYear(), d.getMonth() + 1, 1);
    keys.push(this.monthKeyFromDate(prev));
    keys.push(this.currentMonthKey());
    keys.push(this.monthKeyFromDate(next));
    const seen={};
    return keys.filter(key=>{
      if (seen[key]) return false;
      seen[key]=true;
      return true;
    });
  }

  getSectionKeyForRow(entity) {
    if (!entity || entity.isSummaryRow || entity.isSectionHeader || entity.isSpacerRow || entity.isDutyBrushRow) return null;
    if (entity.rowSection === 'captain') return this.sectionFilterKey(entity.pilotBase, 'captains');
    if (entity.rowSection === 'fo') return this.sectionFilterKey(entity.pilotBase, 'fos');
    if (entity.rowSection === 'employee') {
      const base=entity.base || entity.pilotBase || this.getNavBaseCode() || 'OME';
      return this.sectionFilterKey(base, entity.jobCategory || entity.staffCategory || 'uncategorized');
    }
    return null;
  }

  getPersonRowsForSection(sectionKey) {
    const rows=this.cachedPersonRows || [];
    if (!sectionKey) return [];
    return rows.filter(row=>this.getSectionKeyForRow(row) === sectionKey);
  }

  getSeedsForSection(sectionKey) {
    if (!sectionKey) return [];
    const parts=sectionKey.split(':');
    const sectionId=parts.slice(1).join(':');
    if (sectionId === 'captains') return this.captainSummaryCodes.slice();
    if (sectionId === 'fos') return this.foSummaryCodes.slice();
    return this.getStaffSummarySeedCodes(sectionId);
  }

  collectDutyCodesForSection(sectionKey) {
    const rows=this.getPersonRowsForSection(sectionKey);
    const seeds=this.getSeedsForSection(sectionKey);
    const excludeCodes=sectionKey && sectionKey.indexOf(':captains') > -1 ?
      this.foOnlySummaryCodes :
      (sectionKey && sectionKey.indexOf(':fos') > -1 ? this.captainOnlySummaryCodes : []);
    const seen={};
    const extras=[];
    const addCode=(raw)=>{
      const code=this.normalizeCodeForSummary(raw);
      if (!code || seen[code] || excludeCodes.indexOf(code) > -1) return;
      seen[code]=true;
      extras.push(code);
    };
    const rosterIds=rows.map(row=>row.rosterId).filter(Boolean);
    this.monthKeysForDutyInference().forEach(monthKey=>{
      const daysMap=monthKey === this.currentMonthKey() ?
        this.scheduleDays :
        (this.scheduleDaysByMonth[monthKey] || {});
      rosterIds.forEach(rosterId=>{
        const byDay=daysMap[rosterId];
        if (!byDay) return;
        Object.keys(byDay).forEach(dayKey=>addCode(byDay[dayKey]));
      });
    });
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate();
    rows.forEach(row=>{
      for (let day=1; day<=lastDay; day++) addCode(row[String(day)]);
    });
    const ordered=[''];
    seeds.forEach(code=>{
      if (excludeCodes.indexOf(code) > -1) return;
      if (seen[code] && ordered.indexOf(code) < 0) ordered.push(code);
    });
    extras.sort().forEach(code=>{
      if (ordered.indexOf(code) < 0) ordered.push(code);
    });
    if (ordered.length === 1 && seeds.length) {
      seeds.forEach(code=>{
        if (excludeCodes.indexOf(code) > -1) return;
        if (ordered.indexOf(code) < 0) ordered.push(code);
      });
    }
    this.dutyBrushOffCodes.forEach(code=>{
      if (ordered.indexOf(code) < 0) ordered.push(code);
    });
    return ordered;
  }

  inferCalendarRequestType(event) {
    if (!event) return null;
    const label=String(event.label || '').trim().toUpperCase();
    if (this.isCalendarOffCode(label)) return 'time_off';
    if (this.isWorkRequestPlaceholderCode(label) && !this.isCalendarOffCode(label)) return 'work';
    if (event.requestType === 'time_off' || event.type === 'time_off_request') return 'time_off';
    if (event.requestType === 'work' || event.type === 'work_request') return 'work';
    return null;
  }

  isCalendarRequestEvent(event) {
    if (!event) return false;
    if (event.source === 'local') return true;
    if (event.requestType) return true;
    const type=String(event.type || '').toLowerCase();
    return type === 'time_off_request' || type === 'work_request';
  }

  dutyBrushCodeTitle(code) {
    const key=String(code || '').trim().toUpperCase();
    if (!key) return this.dutyBrushCodeTitles[''] || 'Clear cell';
    if (this.dutyBrushCodeTitles[key]) return `${key} — ${this.dutyBrushCodeTitles[key]}`;
    return key;
  }

  summaryRowLabel(code) {
    return String(code || '').trim().toUpperCase();
  }

  syncEntityCellDisplay(entity, day) {
    if (!entity || !day) return;
    const dayKey=String(day);
    if (!entity._cellMeta) entity._cellMeta={};
    entity._cellMeta[dayKey]=this.getGridCellState(entity, dayKey);
    entity[dayKey]=entity._cellMeta[dayKey].displayCode || '';
  }

  hasConcreteScheduleCode(code) {
    const normalized=String(code || '').trim().toUpperCase();
    return !!normalized && !this.isWorkRequestPlaceholderCode(normalized);
  }

  getCalendarRequestsForCell(rosterId, dayKey) {
    const byDay=this.calendarRequestsByRosterId[rosterId];
    if (!byDay) return [];
    const entry=byDay[String(dayKey)];
    if (!entry) return [];
    return Array.isArray(entry) ? entry : [entry];
  }

  getCalendarRequestForCell(rosterId, dayKey) {
    const requests=this.getCalendarRequestsForCell(rosterId, dayKey);
    return requests.length ? requests[0] : null;
  }

  getGridCellState(entity, dayField) {
    const empty={ displayCode:'', pendingKind:null, cellClass:'', title:'' };
    if (!entity || entity.isSummaryRow || entity.isSectionHeader || entity.isSpacerRow || entity.isDutyBrushRow) return empty;
    const dayKey=String(dayField);
    const scheduleCode=String(((this.scheduleDays[entity.rosterId] || {})[dayKey]) || '').trim().toUpperCase();
    const requests=this.getGridCalendarRequestsForCell(entity.rosterId, dayKey);
    const statusOf=(req)=>String(req.status || 'pending').toLowerCase();
    const typeOf=(req)=>this.calendarRequestType(req);

    if (this.monthLocked && !this.isRosterSuperAdmin()) {
      const hasPending=requests.some(req=>statusOf(req) === 'pending');
      if (hasPending) return empty;
    }

    if (this.hasConcreteScheduleCode(scheduleCode)) {
      const title=this.isCalendarOffCode(scheduleCode) ?
        this.dutyBrushCodeTitle(scheduleCode) :
        scheduleCode;
      return { displayCode:scheduleCode, pendingKind:null, cellClass:scheduleCode, title };
    }

    const approvedOff=requests.find(req=>statusOf(req) === 'approved' && typeOf(req) === 'time_off');
    const approvedWork=requests.find(req=>statusOf(req) === 'approved' && typeOf(req) === 'work');
    const pendingOff=requests.find(req=>this.isLocalPendingCalendarRequest(req) && typeOf(req) === 'time_off');
    const pendingWork=requests.find(req=>this.isLocalPendingCalendarRequest(req) && typeOf(req) === 'work');
    const grantedTimeOff=!!approvedOff || this.isCalendarOffCode(scheduleCode);

    let displayCode=scheduleCode;
    let pendingKind=null;

    if (approvedOff) {
      displayCode=String(approvedOff.label || 'V').trim().toUpperCase();
    } else if (grantedTimeOff) {
      displayCode=scheduleCode;
    } else if (approvedWork) {
      displayCode=String(approvedWork.label || scheduleCode || '8').trim().toUpperCase();
    }

    if (!this.monthLocked) {
      if (!grantedTimeOff && pendingOff) {
        pendingKind='time-off';
        displayCode='';
      } else if (!grantedTimeOff && pendingWork) {
        pendingKind='work';
        displayCode='';
      }
    } else if (!this.isRosterSuperAdmin() && !displayCode) {
      return empty;
    }

    const cellClass=displayCode || '';
    let title=displayCode;
    if (pendingKind === 'time-off') title='Time off requested (pending approval)';
    else if (pendingKind === 'work') title='Work requested (pending approval)';
    else if (grantedTimeOff || approvedOff) title=this.dutyBrushCodeTitle(displayCode || 'V');
    return { displayCode, pendingKind, cellClass, title };
  }

  getDutyCellClasses(entity, dayField) {
    const classes=[];
    if (this.canUseDutyPicker() && entity && !entity.isSummaryRow && !entity.isSectionHeader && !entity.isSpacerRow && !entity.isDutyBrushRow) {
      classes.push('roster-duty-cell--picker');
      const sectionKey=this.getSectionKeyForRow(entity);
      if (sectionKey && this.getSelectedDutyBrushForSection(sectionKey) !== null) {
        classes.push('roster-duty-cell--brush');
      }
    }
    if (entity && entity._cellMeta && entity._cellMeta[dayField] && entity._cellMeta[dayField].cellClass) {
      classes.push(entity._cellMeta[dayField].cellClass);
    }
    return classes.join(' ');
  }

  onDutyCellClick(entity, dayField, event) {
    if (!this.canUseDutyPicker()) return;
    if (!entity || entity.isSummaryRow || entity.isSectionHeader || entity.isSpacerRow || entity.isDutyBrushRow) return;
    if (!entity.rosterId) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const day=parseInt(dayField, 10);
    if (!day) return;
    const sectionKey=this.getSectionKeyForRow(entity);
    if (!sectionKey) return;
    const brush=this.getSelectedDutyBrushForSection(sectionKey);
    if (brush !== null) {
      this.applyDutyCodeToCell(entity, day, brush);
    }
    if (this.scope && !this.scope.$$phase) this.scope.$applyAsync();
  }

  applyDutyCodeToCell(entity, day, code) {
    if (!entity || !day) return;
    const normalized=String(code || '').trim().toUpperCase();
    if (!normalized) {
      this.clearScheduleCell(entity, day);
      return;
    }
    this.savingCell=true;
    this.clearCalendarRequestsForDay(entity, day).then(()=>{
      if (!this.scheduleDays[entity.rosterId]) this.scheduleDays[entity.rosterId]={};
      this.scheduleDays[entity.rosterId][String(day)]=normalized;
      return this.saveScheduleCell(entity, String(day), normalized, {skipRefresh:true});
    }).then(()=>{
      return this.loadLocalCalendarIndex();
    }).then(()=>{
      this.syncEntityCellDisplay(entity, day);
      this.refreshSummaryRows();
      if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
      if (this.activeView === 'calendar') this.loadCalendarData();
    }).finally(()=>{
      this.savingCell=false;
    });
  }

  clearCalendarRequestsForDay(entity, day) {
    const personName=entity.displayName || this.pilotDisplayName(entity) || this.employeeDisplayName(entity);
    const base=entity.base || entity.pilotBase || this.getNavBaseCode();
    if (!personName || !base || !entity.rosterId) return Promise.resolve();
    return this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base,
      personName,
      rosterId:entity.rosterId,
      day,
      days:[day],
      action:'delete',
      applyToSchedule:false
    }).then(resp=>{
      this.reindexCalendarRequestsForPerson(entity.rosterId, (resp.data && resp.data.requests) || []);
    }, ()=>{
      // ignore
    });
  }

  reindexCalendarRequestsForPerson(rosterId, requests) {
    if (!rosterId) return;
    const byDay={};
    (requests || []).forEach(req=>{
      const dayKey=String(req.day);
      if (!byDay[dayKey]) byDay[dayKey]=[];
      byDay[dayKey].push(req);
    });
    this.calendarRequestsByRosterId[rosterId]=byDay;
  }

  dismissPendingWorkRequests(entity, day) {
    const personName=entity.displayName || this.pilotDisplayName(entity) || this.employeeDisplayName(entity);
    const base=entity.base || entity.pilotBase || this.getNavBaseCode();
    if (!personName || !base || !entity.rosterId) return Promise.resolve();
    return this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base,
      personName,
      rosterId:entity.rosterId,
      day,
      days:[day],
      requestType:'work',
      action:'delete',
      applyToSchedule:false
    }).then(resp=>{
      this.reindexCalendarRequestsForPerson(entity.rosterId, (resp.data && resp.data.requests) || []);
    }, ()=>{
      // ignore
    });
  }

  mergeCalendarRequestsForCell(rosterId, day, requests) {
    this.reindexCalendarRequestsForPerson(rosterId, requests);
  }

  clearScheduleCell(entity, day) {
    const dayKey=String(day);
    const personName=entity.displayName || this.pilotDisplayName(entity) || this.employeeDisplayName(entity);
    const base=entity.base || entity.pilotBase || this.getNavBaseCode();
    if (!personName || !base || !entity.rosterId) return;
    this.savingCell=true;
    const clearSchedule=this.http.post('/api/calendar/rosterScheduleSave', {
      date:this.date,
      base,
      rosterId:entity.rosterId,
      day,
      code:'',
      pilots:this.pilots,
      employees:this.allEmployees || this.employees
    });
    const clearCalendar=this.clearCalendarRequestsForDay(entity, day);
    Promise.all([clearSchedule, clearCalendar]).then(()=>{
      if (!this.scheduleDays[entity.rosterId]) this.scheduleDays[entity.rosterId]={};
      delete this.scheduleDays[entity.rosterId][dayKey];
      const currentKey=this.currentMonthKey();
      if (this.scheduleDaysByMonth[currentKey] &&
          this.scheduleDaysByMonth[currentKey][entity.rosterId]) {
        delete this.scheduleDaysByMonth[currentKey][entity.rosterId][dayKey];
      }
      if (this.calendarRequestsByRosterId[entity.rosterId]) {
        delete this.calendarRequestsByRosterId[entity.rosterId][dayKey];
      }
      return this.loadLocalCalendarIndex();
    }).then(()=>{
      this.syncEntityCellDisplay(entity, day);
      this.refreshSummaryRows();
      if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
      if (this.activeView === 'calendar') this.loadCalendarData();
    }).finally(()=>{
      this.savingCell=false;
    });
  }

  loadLocalCalendarIndex() {
    return this.http.post('/api/calendar/rosterCalendarMonthIndex', {
      date:this.date,
      bases:this.rosterBases,
      pilots:this.pilots,
      employees:this.allEmployees || this.employees
    }).then(resp=>{
      this.calendarRequestsByRosterId=(resp.data && resp.data.requestsByRosterId) || {};
    }, ()=>{
      this.calendarRequestsByRosterId={};
    });
  }

  isCalendarOffCode(label) {
    const code=String(label || '').trim().toUpperCase();
    return ['V','RA','RV','RO','RP','O','B'].indexOf(code) > -1;
  }

  isWorkRequestPlaceholderCode(label) {
    const code=String(label || '').trim().toUpperCase();
    return code === '8' || code === 'C8';
  }

  isAcrorosterCalendarRequest(req) {
    return String((req && req.source) || '').toLowerCase() === 'acroroster';
  }

  isLocalPendingCalendarRequest(req) {
    if (!req) return false;
    if (this.isAcrorosterCalendarRequest(req)) return false;
    return String(req.status || 'pending').toLowerCase() === 'pending';
  }

  isAcrorosterWorkCalendarRequest(req) {
    if (!this.isAcrorosterCalendarRequest(req)) return false;
    const label=String(req.label || '').trim().toUpperCase();
    if (this.isCalendarOffCode(label)) return false;
    return req.requestType === 'work' ||
      req.type === 'work_request' ||
      this.isWorkRequestPlaceholderCode(label);
  }

  getGridCalendarRequestsForCell(rosterId, dayKey) {
    return this.getCalendarRequestsForCell(rosterId, dayKey)
      .filter(req=>!this.isAcrorosterWorkCalendarRequest(req));
  }

  calendarRequestType(req) {
    const label=String((req && req.label) || '').trim().toUpperCase();
    if (this.isCalendarOffCode(label)) return 'time_off';
    return this.inferCalendarRequestType(req);
  }

  buildCalendarDayDisplay(dayEvents) {
    const events=dayEvents || [];
    let pendingTimeOff=null;
    let pendingWork=null;
    let approvedTimeOff=null;
    let scheduleCode=null;

    events.forEach(event=>{
      const label=String(event.label || '').trim().toUpperCase();
      if (!this.isLocalPendingCalendarRequest(event)) return;
      const isTimeOff=this.isCalendarOffCode(label) ||
        event.requestType === 'time_off' ||
        event.type === 'time_off_request';
      const isWork=!isTimeOff && (
        event.requestType === 'work' ||
        event.type === 'work_request' ||
        this.isWorkRequestPlaceholderCode(label)
      );
      if (isTimeOff) pendingTimeOff={label:label || 'V', event};
      else if (isWork) pendingWork={label, event};
    });

    events.forEach(event=>{
      const label=String(event.label || '').trim().toUpperCase();
      const status=String(event.status || '').toLowerCase();
      const reqType=this.inferCalendarRequestType(event);

      if (status === 'pending') return;

      if (this.isCalendarRequestEvent(event) || reqType) {
        if (reqType === 'time_off') {
          approvedTimeOff={label:label || 'V', event};
          return;
        }
        if (reqType === 'work') {
          if (label && !this.isWorkRequestPlaceholderCode(label)) scheduleCode=label;
          return;
        }
        if (this.isCalendarOffCode(label)) approvedTimeOff={label, event};
        return;
      }

      const isSchedule=event.source === 'schedule' || event.type === 'shift';
      if (!isSchedule) return;
      if (pendingTimeOff) return;
      if (this.isCalendarOffCode(label)) {
        if (!approvedTimeOff) approvedTimeOff={label:label || 'V', event};
      } else if (label) {
        scheduleCode=label;
      }
    });

    if (approvedTimeOff) {
      return {
        kind:'time-off-approved',
        label:approvedTimeOff.label || 'V',
        title:'Time Off (approved)'
      };
    }

    if (scheduleCode && !this.isWorkRequestPlaceholderCode(scheduleCode)) {
      const display=this.calendarAssignedDisplay(scheduleCode);
      if (pendingWork) {
        display.showWorkPending=true;
        display.title=`${scheduleCode} assigned (work was requested)`;
      }
      return display;
    }

    if (pendingTimeOff) {
      return {
        kind:'time-off-pending',
        label:pendingTimeOff.label || 'V',
        title:`Time Off Request (${pendingTimeOff.label || 'V'})`
      };
    }
    if (pendingWork) {
      return {kind:'work-request-pending', label:'', title:'Work Request'};
    }
    return {kind:'empty', label:'', title:''};
  }

  processCalendarEvents(events) {
    this.calendarEventsByDay={};
    this.calendarDays={};
    this.calendarRequests=[];
    (events || []).forEach(event=>{
      const day=event.day || new Date(event.start_plain_date_time).getUTCDate();
      if (!day) return;
      if (!this.calendarEventsByDay[day]) this.calendarEventsByDay[day]=[];
      this.calendarEventsByDay[day].push(event);
    });
    Object.keys(this.calendarEventsByDay).forEach(dayKey=>{
      const day=parseInt(dayKey, 10);
      const display=this.buildCalendarDayDisplay(this.calendarEventsByDay[day]);
      this.calendarDays[day]=display;
      if (display.kind === 'time-off-pending' || display.kind === 'work-request-pending') {
        const localReq=(this.calendarEventsByDay[day] || []).find(ev=>{
          return ev.source === 'local' || ev.requestType || ev.type === 'time_off_request' || ev.type === 'work_request';
        });
        const requestType=localReq
          ? (this.inferCalendarRequestType(localReq) || (display.kind === 'time-off-pending' ? 'time_off' : 'work'))
          : (display.kind === 'time-off-pending' ? 'time_off' : 'work');
        this.calendarRequests.push({
          day,
          kind:display.kind === 'time-off-pending' ? 'time-off' : 'work-request',
          label:display.label,
          status:(localReq && localReq.status) || 'pending',
          title:display.title,
          source:(localReq && localReq.source) || 'local',
          requestType
        });
      } else if (display.kind === 'time-off-approved') {
        this.calendarRequests.push({
          day,
          kind:'time-off',
          label:'V',
          status:'approved',
          title:display.title,
          source:'schedule'
        });
      }
    });
    this.calendarRequests.sort((a,b)=>a.day - b.day);
    const today=new Date();
    const sameMonth=this.date &&
      today.getFullYear() === this.date.getFullYear() &&
      today.getMonth() === this.date.getMonth();
    const todayDay=sameMonth ? today.getDate() : 1;
    this.calendarUpcoming=this.calendarRequests.filter(request=>request.day >= todayDay);
    this.buildCalendarWeeks();
  }

  getCalendarDayDisplay(day) {
    if (!day) return {kind:'empty', label:''};
    return this.calendarDays[day] || {kind:'empty', label:''};
  }

  calendarAssignedDisplay(code) {
    const label=String(code || '').trim().toUpperCase();
    return {
      kind:'assigned',
      label,
      title:label,
      dutyClass:this.calendarDutyClass(label)
    };
  }

  calendarDutyClass(label) {
    const code=String(label || '').trim().toUpperCase();
    if (!code) return 'roster-cal-duty--default';
    if (code === 'B1' || code === 'B2') return 'roster-cal-duty--b1';
    if (['KA','C1','S1','C2','S2','8','F','OTZ','C8'].indexOf(code) > -1) return 'roster-cal-duty--flight';
    if (['OC','A','T','DM','NM','ND','IOE','SC','SC2'].indexOf(code) > -1) return 'roster-cal-duty--ops';
    if (['V','RA','RV','RO','RP','O','B'].indexOf(code) > -1) return 'roster-cal-duty--off';
    return 'roster-cal-duty--default';
  }

  calendarEventKind(event) {
    const label=String(event.label || '').trim().toUpperCase();
    const offCodes=['V','RA','RV','RO','RP','O','B'];
    if (event.requestType === 'time_off' || event.type === 'time_off_request') return 'time-off';
    if (event.requestType === 'work' || event.type === 'work_request') return 'work-request';
    if (offCodes.indexOf(label) > -1) return 'time-off';
    if (event.type === 'shift' || event.source === 'schedule') return 'scheduled';
    if (label) return 'scheduled';
    return 'request';
  }

  calendarEventTitle(event, kind) {
    const label=String(event.label || '').trim().toUpperCase();
    if (kind === 'time-off') return `Time Off${label ? ' ('+label+')' : ''}`;
    if (kind === 'work-request') return `Work Request${label ? ' ('+label+')' : ''}`;
    if (event.location_name) return `${label || 'Scheduled'} — ${event.location_name}`;
    return label || 'Scheduled';
  }

  buildCalendarWeeks() {
    if (!this.date) {
      this.calendarWeeks=[];
      return;
    }
    const year=this.date.getFullYear();
    const month=this.date.getMonth();
    const firstDow=new Date(year, month, 1).getDay();
    const lastDate=new Date(year, month + 1, 0).getDate();
    const weeks=[];
    let week=[];
    let i;
    for (i=0; i<firstDow; i++) week.push(null);
    for (let day=1; day<=lastDate; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week=[];
      }
    }
    while (week.length && week.length < 7) week.push(null);
    if (week.length) weeks.push(week);
    this.calendarWeeks=weeks;
  }

  calendarDayMarkers(day) {
    return this.calendarEventsByDay[day] || [];
  }

  calendarDayPrimaryKind(day) {
    const markers=this.calendarDayMarkers(day);
    if (!markers.length) return 'empty';
    if (markers.some(marker=>this.calendarEventKind(marker) === 'time-off')) return 'time-off';
    if (markers.some(marker=>this.calendarEventKind(marker) === 'work-request')) return 'work-request';
    if (markers.some(marker=>this.calendarEventKind(marker) === 'scheduled')) return 'scheduled';
    return 'request';
  }

  selectCalendarDay(day) {
    if (!day) return;
    if (!this.calendarRangeStart || (this.calendarRangeStart && this.calendarRangeEnd)) {
      this.calendarRangeStart=day;
      this.calendarRangeEnd=null;
      this.selectedCalendarDay=day;
      return;
    }
    this.calendarRangeEnd=day;
    this.selectedCalendarDay=day;
  }

  getCalendarSelectedDays() {
    if (!this.calendarRangeStart) return [];
    const end=this.calendarRangeEnd || this.calendarRangeStart;
    const from=Math.min(this.calendarRangeStart, end);
    const to=Math.max(this.calendarRangeStart, end);
    const days=[];
    for (let day=from; day<=to; day++) days.push(day);
    return days;
  }

  calendarSelectionLabel() {
    const days=this.getCalendarSelectedDays();
    if (!days.length) return '';
    if (days.length === 1) return `Selected: day ${days[0]}`;
    return `Selected: days ${days[0]}–${days[days.length - 1]} (${days.length} days)`;
  }

  isCalendarDaySelected(day) {
    return !!day && this.getCalendarSelectedDays().indexOf(day) > -1;
  }

  isCalendarDayRangeEdge(day) {
    if (!day || !this.calendarRangeStart) return false;
    const end=this.calendarRangeEnd || this.calendarRangeStart;
    return day === this.calendarRangeStart || day === end;
  }

  canEditCalendar() {
    return this.canEditCalendarForSelectedPerson();
  }

  applyCalendarScheduleResponse(meta, resp) {
    if (!meta || !meta.rosterId || !resp || !resp.data) return;
    if (resp.data.scheduleDays) {
      this.scheduleDays[meta.rosterId]=Object.assign({}, resp.data.scheduleDays);
      this.localEmpty=false;
    } else if (resp.data.days) {
      const days=resp.data.days;
      if (!this.scheduleDays[meta.rosterId]) this.scheduleDays[meta.rosterId]={};
      days.forEach(day=>{
        if (resp.data.action === 'delete') delete this.scheduleDays[meta.rosterId][String(day)];
      });
    }
  }

  submitCalendarRequest(requestType) {
    const days=this.getCalendarSelectedDays();
    if (!this.canEditCalendar() || !this.calendarPerson || !days.length || this.savingCalendarRequest) return;
    const meta=this.resolveCalendarPersonMeta();
    if (!meta.base) return;
    this.savingCalendarRequest=true;
    this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base:meta.base,
      personName:meta.personName || this.calendarPerson,
      rosterId:meta.rosterId,
      days,
      requestType:requestType,
      applyToSchedule:this.isRosterSuperAdmin(),
      action:'add'
    }).then(resp=>{
      this.applyCalendarScheduleResponse(meta, resp);
      if (this.isLocalMode()) return this.refreshLocalScheduleViews();
      return this.loadCalendarData();
    }).finally(()=>{
      this.savingCalendarRequest=false;
    });
  }

  deleteCalendarRequest(request) {
    if (!this.canDeleteCalendarRequest(request) || this.savingCalendarRequest) return;
    const meta=this.resolveCalendarPersonMeta();
    if (!meta.base) return;
    this.savingCalendarRequest=true;
    this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base:meta.base,
      personName:meta.personName || this.calendarPerson,
      rosterId:meta.rosterId,
      days:[request.day],
      requestType:request.requestType || (request.kind === 'time-off' ? 'time_off' : 'work'),
      label:request.label,
      rosterId:meta.rosterId,
      applyToSchedule:request.source === 'local',
      action:'delete'
    }).then(resp=>{
      if (request.source === 'local' && meta.rosterId && this.scheduleDays[meta.rosterId]) {
        delete this.scheduleDays[meta.rosterId][String(request.day)];
      }
      this.applyCalendarScheduleResponse(meta, resp);
      if (this.isLocalMode()) return this.refreshLocalScheduleViews();
      return this.loadCalendarData();
    }).finally(()=>{
      this.savingCalendarRequest=false;
    });
  }

  moderateCalendarRequest(request, action) {
    if (!this.canModerateRoster() || !request || this.savingCalendarRequest) return;
    const meta=this.resolveCalendarPersonMeta();
    if (!meta.base) return;
    const requestType=request.requestType || (request.kind === 'time-off' ? 'time_off' : 'work');
    let label=request.label;
    if (action === 'approve' && requestType === 'work') {
      const sectionKey=this.getSectionKeyForCalendarPerson();
      const brush=sectionKey ? this.getSelectedDutyBrushForSection(sectionKey) : null;
      if (brush && brush !== '' && !this.isCalendarOffCode(brush)) {
        label=brush;
      } else if (this.isWorkRequestPlaceholderCode(label) || !label) {
        this.calendarModerationMessage='Open Duty event → Select for that person\'s section (Scheduling), pick a code, then Approve.';
        return;
      }
    }
    if (action === 'approve' && requestType === 'time_off') {
      label=String(request.label || 'V').trim().toUpperCase();
    }
    this.calendarModerationMessage='';
    this.savingCalendarRequest=true;
    this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base:meta.base,
      personName:meta.personName || this.calendarPerson,
      rosterId:meta.rosterId,
      days:[request.day],
      requestType,
      label,
      action
    }).then(resp=>{
      this.applyCalendarScheduleResponse(meta, resp);
      if (this.isLocalMode()) return this.refreshLocalScheduleViews();
      return this.loadCalendarData();
    }).finally(()=>{
      this.savingCalendarRequest=false;
    });
  }

  calendarRequestCount(kind) {
    return (this.calendarRequests || []).filter(request=>request.kind === kind).length;
  }

  baseSectionLabel(base) {
    if (!base) return '';
    if (base === 'OME') return 'NOME CAPT';
    if (base === 'OTZ') return 'KOTZEBUE CAPT';
    if (base === 'UNK') return 'UNK CAPT';
    if (base === 'HELI') return 'HELICOPTER CAPT';
    return `${base} CAPT`;
  }

  foSectionLabel(base) {
    if (!base) return '';
    if (base === 'OME') return 'NOME FO';
    if (base === 'OTZ') return 'KOTZEBUE FO';
    if (base === 'UNK') return 'UNK FO';
    if (base === 'HELI') return 'HELICOPTER FO';
    return `${base} FO`;
  }

  baseShortLabel(base) {
    if (base === 'OME') return 'NOME';
    if (base === 'OTZ') return 'KOTZ';
    if (base === 'UNK') return 'UNK';
    if (base === 'HELI') return 'Helicopter';
    return base;
  }

  staffSectionLabel(base, cat) {
    if (base === 'HELI' && cat && cat.id === 'helicopter') return 'OME Helicopter';
    return `${this.baseShortLabel(base)} ${cat.label}`;
  }

  sectionFilterKey(base, sectionId) {
    return `${base}:${sectionId}`;
  }

  migrateSectionFilters(stored) {
    if (!stored || typeof stored !== 'object') return stored;
    const migrated=Object.assign({}, stored);
    if (migrated.captains !== undefined && migrated['OME:captains'] === undefined) {
      migrated['OME:captains']=migrated.captains;
    }
    if (migrated.fos !== undefined && migrated['OME:fos'] === undefined) {
      migrated['OME:fos']=migrated.fos;
    }
    this.staffJobCategories.forEach(cat=>{
      if (migrated[cat.id] !== undefined && migrated[`OME:${cat.id}`] === undefined) {
        migrated[`OME:${cat.id}`]=migrated[cat.id];
      }
    });
    delete migrated.captains;
    delete migrated.fos;
    this.staffJobCategories.forEach(cat=>{ delete migrated[cat.id]; });
    return migrated;
  }

  getDefaultSectionFilters() {
    const filters={};
    this.rosterBases.forEach(base=>{
      if (base !== 'HELI') {
        filters[this.sectionFilterKey(base, 'captains')]=base === 'OME';
      }
      if (base !== 'OTZ' && base !== 'HELI') {
        filters[this.sectionFilterKey(base, 'fos')]=false;
      }
      this.staffJobCategoriesForBase(base).forEach(cat=>{
        filters[this.sectionFilterKey(base, cat.id)]=false;
      });
    });
    return filters;
  }

  getStoredSectionFilters() {
    try {
      const raw=window.sessionStorage.getItem('rosterSectionFilters');
      if (raw) {
        const migrated=this.migrateSectionFilters(JSON.parse(raw));
        return Object.assign(this.getDefaultSectionFilters(), migrated);
      }
    } catch (e) {}
    return this.getDefaultSectionFilters();
  }

  persistSectionFilters() {
    window.sessionStorage.setItem('rosterSectionFilters', JSON.stringify(this.sectionFilters));
  }

  getNavBaseCode() {
    const navBase=(this.scope.nav && this.scope.nav.base) || window.base;
    return navBase && navBase.base ? navBase.base : null;
  }

  refreshSectionPickerOptions() {
    const options=[];
    this.rosterBases.forEach(base=>{
      if (base !== 'HELI') {
        options.push({
          key:this.sectionFilterKey(base, 'captains'),
          label:this.baseSectionLabel(base),
          base,
          sectionType:'captains'
        });
      }
      if (base !== 'OTZ' && base !== 'HELI') {
        options.push({
          key:this.sectionFilterKey(base, 'fos'),
          label:this.foSectionLabel(base),
          base,
          sectionType:'fos'
        });
      }
      this.staffJobCategoriesForBase(base).forEach(cat=>{
        options.push({
          key:this.sectionFilterKey(base, cat.id),
          label:this.staffSectionLabel(base, cat),
          base,
          sectionType:'staff',
          staffCategory:cat.id
        });
      });
    });
    this.sectionPickerOptions=options;
  }

  isSectionVisible(key) {
    return this.sectionFilters[key] === true;
  }

  isBasePilotSectionVisible(base, sectionType) {
    return this.isSectionVisible(this.sectionFilterKey(base, sectionType));
  }

  hasVisibleStaffSections() {
    return this.rosterBases.some(base=>{
      return this.staffJobCategoriesForBase(base).some(cat=>{
        const rows=this.employeesByBaseAndCategory[base] && this.employeesByBaseAndCategory[base][cat.id];
        return this.isSectionVisible(this.sectionFilterKey(base, cat.id)) && rows && rows.length;
      });
    });
  }

  hasVisiblePilotSections() {
    return this.rosterBases.some(base=>{
      return this.isBasePilotSectionVisible(base, 'captains') || this.isBasePilotSectionVisible(base, 'fos');
    });
  }

  toggleSectionFilter(key) {
    this.sectionFilters[key]=!this.isSectionVisible(key);
    this.persistSectionFilters();
    this.runViewRefresh(()=>this.refreshSummaryRows());
  }

  currentBaseLabel() {
    const base=this.getNavBaseCode();
    if (!base) return '';
    if (base === 'OME') return 'Nome';
    if (base === 'OTZ') return 'Kotzebue';
    if (base === 'UNK') return 'Unalakleet';
    if (base === 'HELI') return 'Helicopter';
    return base;
  }

  makeSectionHeader(title) {
    return {
      displayName: title,
      isSectionHeader: true,
      sectionStart: true,
      rosterKind: 'header'
    };
  }

  makeDutyBrushRow(sectionKey, sectionLabel) {
    return {
      displayName: sectionLabel || '',
      isDutyBrushRow: true,
      sectionKey,
      sectionLabel: sectionLabel || '',
      rosterKind: 'brush'
    };
  }

  makeSpacerRows(count) {
    const rows=[];
    for (let i=0; i<count; i++) {
      rows.push({
        displayName: '',
        isSpacerRow: true,
        rosterKind: 'spacer'
      });
    }
    return rows;
  }

  canEditRowEntity(entity) {
    if (!entity || entity.isSummaryRow || entity.isSectionHeader || entity.isSpacerRow || entity.isDutyBrushRow) return false;
    if (!this.canEditRosterSchedule()) return false;
    if (this.isRosterSuperAdmin()) return true;
    const personName=entity.displayName || this.pilotDisplayName(entity) || this.employeeDisplayName(entity);
    return this.isOwnRosterPerson(personName);
  }
  
  $onInit(){
    const self=this;
    this.setupScheduleSocketListeners();
    this.refreshSectionPickerOptions();
    this.loadStaffingMinimumsFromServer();
    this.fetchMonthMeta();
    this.gridOptions.onRegisterApi=function(gridApi) {
      self.gridApi=gridApi;
      self.refreshGridSize();
    };
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      if (!newVal||newVal==='') return;
      if (!oldVal||oldVal==='') return;
      if (this.scope.nav) this.scope.nav.isCollapsed=true;
    });
    let lastAuthRole=null;
    this.scope.$watch(()=>{
      const user=this.Auth.getCurrentUser();
      return user && user.role;
    }, (role)=>{
      if (role === lastAuthRole) return;
      lastAuthRole=role;
      if (this.cachedPersonRows && this.cachedPersonRows.length) {
        this.refreshSummaryRows();
      }
    });
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{
      if (!newVal||newVal==='') return;
      const isFirstRun=!oldVal || oldVal === '';
      if (!isFirstRun && newVal === this.dateString) return;
      const newDate=new Date(newVal);
      if (isNaN(newDate.getTime())) return;
      if (!isFirstRun && oldVal !== '') {
        const oldDate=new Date(oldVal);
        if (!isNaN(oldDate.getTime()) &&
            newDate.getFullYear() === oldDate.getFullYear() &&
            newDate.getMonth() === oldDate.getMonth()) {
          this.date=newDate;
          this.dateString=newVal;
          return;
        }
      }
      this.loadMonth(newDate);
    });
  }

  $onDestroy() {
    this.teardownScheduleSocketListeners();
  }

  setupScheduleSocketListeners() {
    if (this._scheduleSocketBound) return;
    this._scheduleSocketBound=true;
    this._onScheduleCellSocket=(payload)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleScheduleCellSocket(payload));
      } else {
        this.handleScheduleCellSocket(payload);
      }
    };
    this._onScheduleBulkSocket=(payload)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleScheduleBulkSocket(payload));
      } else {
        this.handleScheduleBulkSocket(payload);
      }
    };
    this._onCalendarRequestBulkSocket=(payload)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleCalendarRequestBulkSocket(payload));
      } else {
        this.handleCalendarRequestBulkSocket(payload);
      }
    };
    this._onCalendarRequestSocket=(payload)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleCalendarRequestSocket(payload));
      } else {
        this.handleCalendarRequestSocket(payload);
      }
    };
    this._onEmployeeBulkSocket=(payload)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleEmployeeBulkSocket(payload));
      } else {
        this.handleEmployeeBulkSocket(payload);
      }
    };
    this._onEmployeeRemoveSocket=(employee)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleEmployeeRemoveSocket(employee));
      } else {
        this.handleEmployeeRemoveSocket(employee);
      }
    };
    this._onEmployeeSaveSocket=(employee)=>{
      if (this.scope && !this.scope.$$phase) {
        this.scope.$applyAsync(()=>this.handleEmployeeSaveSocket(employee));
      } else {
        this.handleEmployeeSaveSocket(employee);
      }
    };
    this.socket.socket.on('rosterScheduleCell:cell', this._onScheduleCellSocket);
    this.socket.socket.on('rosterScheduleCell:bulk', this._onScheduleBulkSocket);
    this.socket.socket.on('rosterCalendarRequest:change', this._onCalendarRequestSocket);
    this.socket.socket.on('rosterCalendarRequest:bulk', this._onCalendarRequestBulkSocket);
    this.socket.socket.on('rosterEmployee:save', this._onEmployeeSaveSocket);
    this.socket.socket.on('rosterEmployee:remove', this._onEmployeeRemoveSocket);
    this.socket.socket.on('rosterEmployee:bulk', this._onEmployeeBulkSocket);
  }

  teardownScheduleSocketListeners() {
    if (!this._scheduleSocketBound) return;
    this.socket.socket.removeListener('rosterScheduleCell:cell', this._onScheduleCellSocket);
    this.socket.socket.removeListener('rosterScheduleCell:bulk', this._onScheduleBulkSocket);
    this.socket.socket.removeListener('rosterCalendarRequest:change', this._onCalendarRequestSocket);
    this.socket.socket.removeListener('rosterCalendarRequest:bulk', this._onCalendarRequestBulkSocket);
    this.socket.socket.removeListener('rosterEmployee:save', this._onEmployeeSaveSocket);
    this.socket.socket.removeListener('rosterEmployee:remove', this._onEmployeeRemoveSocket);
    this.socket.socket.removeListener('rosterEmployee:bulk', this._onEmployeeBulkSocket);
    this._scheduleSocketBound=false;
  }

  handleScheduleCellSocket(payload) {
    if (!this.isLocalMode() || !payload) return;
    const monthKey=payload.monthKey;
    const rosterId=payload.rosterId;
    const dayKey=String(payload.day);
    const code=payload.code ? String(payload.code).trim().toUpperCase() : null;
    if (!monthKey || !rosterId || !dayKey) return;

    if (!this.scheduleDaysByMonth[monthKey]) this.scheduleDaysByMonth[monthKey]={};
    if (!this.scheduleDaysByMonth[monthKey][rosterId]) this.scheduleDaysByMonth[monthKey][rosterId]={};
    if (code) this.scheduleDaysByMonth[monthKey][rosterId][dayKey]=code;
    else delete this.scheduleDaysByMonth[monthKey][rosterId][dayKey];

    if (monthKey !== this.currentMonthKey()) return;
    if (!this.scheduleDays[rosterId]) this.scheduleDays[rosterId]={};
    if (code) this.scheduleDays[rosterId][dayKey]=code;
    else delete this.scheduleDays[rosterId][dayKey];

    this.patchGridRowForRosterId(rosterId, payload.day);
  }

  handleScheduleBulkSocket(payload) {
    if (!this.isLocalMode() || !payload || !payload.monthKey) return;
    const loadedMonthKeys=this.monthKeysForDutyInference();
    if (loadedMonthKeys.indexOf(payload.monthKey) < 0) return;
    if (payload.bases && payload.bases.length) {
      const touchesBase=payload.bases.some(base=>this.rosterBases.indexOf(base) > -1);
      if (!touchesBase) return;
    }
    this.viewRefreshing=true;
    this.loadLocalScheduleData().finally(()=>{
      this.viewRefreshing=false;
    });
  }

  patchGridRowForRosterId(rosterId, day) {
    const dayNum=parseInt(day, 10);
    if (!dayNum || !rosterId) return;
    let touched=false;
    const touchRow=(row)=>{
      if (!row || row.rosterId !== rosterId) return;
      this.syncEntityCellDisplay(row, dayNum);
      touched=true;
    };
    (this.cachedPersonRows || []).forEach(touchRow);
    (this.gridOptions.data || []).forEach(touchRow);
    if (!touched) return;
    this.refreshSummaryRows();
    this.refreshDutyBrushCodesBySection();
    if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
    if (this.activeView === 'calendar') this.loadCalendarData();
  }

  handleCalendarRequestSocket(payload) {
    if (!this.isLocalMode() || !payload) return;
    if (payload.monthKey && payload.monthKey !== this.currentMonthKey()) return;
    this.viewRefreshing=true;
    this.loadLocalCalendarIndex().then(()=>{
      if (payload.rosterId) this.refreshGridRowsForRosterId(payload.rosterId);
      else this.applyLocalScheduleToGrid();
      if (this.activeView === 'calendar') this.loadCalendarData();
    }).finally(()=>{
      this.viewRefreshing=false;
    });
  }

  handleCalendarRequestBulkSocket(payload) {
    if (!this.isLocalMode() || !payload || !payload.monthKey) return;
    if (payload.monthKey !== this.currentMonthKey()) return;
    if (payload.bases && payload.bases.length) {
      const touchesBase=payload.bases.some(base=>this.rosterBases.indexOf(base) > -1);
      if (!touchesBase) return;
    }
    this.handleCalendarRequestSocket(payload);
  }

  refreshGridRowsForRosterId(rosterId) {
    if (!rosterId) return;
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate();
    let touched=false;
    const touchRow=(row)=>{
      if (!row || row.rosterId !== rosterId) return;
      for (let day=1; day<=lastDay; day++) {
        this.syncEntityCellDisplay(row, day);
      }
      touched=true;
    };
    (this.cachedPersonRows || []).forEach(touchRow);
    (this.gridOptions.data || []).forEach(touchRow);
    if (!touched) return;
    this.refreshSummaryRows();
    if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
  }

  refreshEmployeesFromSocket() {
    if (!this.isLocalMode()) return Promise.resolve();
    this.viewRefreshing=true;
    return this.loadEmployees().then(()=>{
      if (this.cachedPersonRows && this.cachedPersonRows.length) {
        this.applyLocalScheduleToGrid();
      }
      this.refreshTeamLists();
      this.refreshCalendarPersonOptions();
    }).finally(()=>{
      this.viewRefreshing=false;
    });
  }

  handleEmployeeSaveSocket() {
    this.refreshEmployeesFromSocket();
  }

  handleEmployeeRemoveSocket() {
    this.refreshEmployeesFromSocket();
  }

  handleEmployeeBulkSocket() {
    this.refreshEmployeesFromSocket();
  }

  setDataSource(source) {
    if (this.dataSource === source) return;
    this.dataSource = source;
    window.sessionStorage.setItem('rosterDataSource', source);
    this.spinner = true;
    this.init();
  }

  importFromAcroroster() {
    if (!this.isLocalMode() || this.importing) return;
    this.importing = true;
    this.spinner = true;
    this.http.post('/api/calendar/rosterScheduleLocalImport', {
      date: this.date,
      bases: this.rosterBases,
      pilots: this.pilots
    }).then(resp => {
      this.scheduleDays = (resp.data && resp.data.days) || {};
      const currentKey=this.currentMonthKey();
      this.scheduleDaysByMonth[currentKey]=Object.assign({}, this.scheduleDays);
      this.localEmpty = !!(resp.data && resp.data.empty);
      return this.loadEmployees();
    }).then(()=>{
      this.applyLocalScheduleToGrid();
      if (this.activeView === 'calendar') this.loadCalendarData();
    }).finally(() => {
      this.importing = false;
      this.spinner = false;
    });
  }

  saveScheduleCell(rowEntity, dayField, code, options) {
    const opts=options || {};
    const day = parseInt(dayField, 10);
    if (!day || !rowEntity || !rowEntity.rosterId) return Promise.resolve();
    const normalized=(code || '').trim().toUpperCase();
    const base=rowEntity.base || rowEntity.pilotBase || this.getNavBaseCode();
    if (!base) return Promise.resolve();
    if (!opts.skipRefresh) this.savingCell = true;
    return this.http.post('/api/calendar/rosterScheduleSave', {
      date: this.date,
      base,
      rosterId: rowEntity.rosterId,
      day: day,
      code: normalized,
      pilots: this.pilots,
      employees: this.allEmployees || this.employees
    }).then(() => {
      if (!this.scheduleDays[rowEntity.rosterId]) this.scheduleDays[rowEntity.rosterId]={};
      if (normalized) this.scheduleDays[rowEntity.rosterId][String(day)] = normalized;
      else delete this.scheduleDays[rowEntity.rosterId][String(day)];
      const currentKey=this.currentMonthKey();
      if (!this.scheduleDaysByMonth[currentKey]) this.scheduleDaysByMonth[currentKey]={};
      if (normalized) this.scheduleDaysByMonth[currentKey][rowEntity.rosterId]=Object.assign(
        {},
        this.scheduleDaysByMonth[currentKey][rowEntity.rosterId] || {},
        this.scheduleDays[rowEntity.rosterId]
      );
      else if (this.scheduleDaysByMonth[currentKey][rowEntity.rosterId]) {
        delete this.scheduleDaysByMonth[currentKey][rowEntity.rosterId][String(day)];
      }
      this.localEmpty = false;
      this.syncEntityCellDisplay(rowEntity, day);
      if (!opts.skipRefresh) {
        this.refreshDutyBrushCodesBySection();
        this.refreshSummaryRows();
        if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
      }
    }).finally(() => {
      if (!opts.skipRefresh) this.savingCell = false;
    });
  }
  
  init(){
    this.refreshSectionPickerOptions();
    this.setDaysOfMonth();
    this.http.post('/api/airplanes/firebaseGrab').then(res=>{
      if (!res || !res.data || !res.data.pilots) {
        this.spinner = false;
        return;
      }
      this.allPilots=res.data.pilots.filter(pilot=>{
        return this.rosterBases.indexOf(pilot.pilotBase) > -1 && this.isPilotActive(pilot);
      });
      this.pilots=this.allPilots;
      this.sortPilotList();
      this.refreshTeamLists();
      this.refreshCalendarPersonOptions();
      return this.loadEmployees().then(()=>{
        if (!this.isLocalMode()) return this.loadAcrorosterData();
        return this.loadLocalScheduleData();
      });
    }).catch(() => {
      this.spinner = false;
    });
  }

  loadAcrorosterData() {
    return this.http.post('/api/calendar/rosterMonth', { date: this.date }).then(resp => {
      if (!resp) return;
      this.processAcrorosterRecords(resp.data || []);
    }, () => {
      // ignore
    }).finally(() => {
      this.spinner = false;
      if (this.activeView === 'calendar') this.loadCalendarData();
    });
  }

  loadLocalScheduleData() {
    const monthDates=[
      new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1),
      new Date(this.date.getFullYear(), this.date.getMonth(), 1),
      new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1)
    ];
    const seenMonths={};
    const monthKeys=[];
    monthDates.forEach(monthDate=>{
      const monthKey=this.monthKeyFromDate(monthDate);
      if (seenMonths[monthKey]) return;
      seenMonths[monthKey]=true;
      monthKeys.push(monthKey);
    });
    return this.http.post('/api/calendar/rosterScheduleLocalBulk', {
      date:this.date,
      bases:this.rosterBases,
      monthKeys
    }).then(resp=>{
      this.scheduleDaysByMonth=(resp.data && resp.data.scheduleDaysByMonth) ? resp.data.scheduleDaysByMonth : {};
      this.scheduleDays={};
      this.localEmpty=!!(resp.data && resp.data.empty);
      const currentKey=this.currentMonthKey();
      this.scheduleDays=Object.assign({}, this.scheduleDaysByMonth[currentKey] || {});
      this.refreshDutyBrushCodesBySection();
      return this.loadLocalCalendarIndex();
    }).then(()=>{
      this.applyLocalScheduleToGrid();
    }, () => {
      // ignore
    }).finally(() => {
      this.spinner = false;
      if (this.activeView === 'calendar') this.loadCalendarData();
    });
  }

  buildLocalRows() {
    const rows=[];
    this.pilots.forEach(pilot=>{
      const row=angular.copy(pilot);
      row.rosterKind='pilot';
      row.rosterId=`pilot:${pilot._id}`;
      row.isCaptain=!!pilot.far299Exp;
      rows.push(row);
    });
    this.employees.forEach(employee=>{
      const row=angular.copy(employee);
      row.rosterKind='employee';
      row.rosterId=`employee:${employee._id}`;
      row.displayName=this.employeeDisplayName(employee);
      row.isCaptain=false;
      row.jobCategory=employee.jobCategory || 'uncategorized';
      rows.push(row);
    });
    return rows;
  }

  applyLocalScheduleToGrid() {
    const rows=this.buildLocalRows();
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    rows.forEach(row=>{
      row._cellMeta={};
      for (let day=1; day<=lastDay; day++) {
        const dayKey=String(day);
        const state=this.getGridCellState(row, dayKey);
        row[dayKey]=state.displayCode || '';
        row._cellMeta[dayKey]=state;
      }
    });
    this.cachedPersonRows=rows;
    this.gridOptions.data=this.buildGridWithSummaries(rows);
    this.updateGridEditing();
    this.refreshDutyBrushCodesBySection();
    this.refreshGridSize();
  }

  personRowsOnly() {
    return (this.gridOptions.data || []).filter(row=>{
      return !row.isSummaryRow && !row.isSectionHeader && !row.isSpacerRow && !row.isDutyBrushRow;
    });
  }

  personRowsForSummary() {
    if (this.cachedPersonRows && this.cachedPersonRows.length) return this.cachedPersonRows;
    return this.personRowsOnly();
  }

  normalizeCodeForSummary(cellCode) {
    if (!cellCode) return null;
    const code=String(cellCode).trim().toUpperCase();
    if (code === 'C8') return '8';
    return code;
  }

  countDutyForDay(rows, summaryCode, day) {
    const dayKey=String(day);
    let count=0;
    rows.forEach(row=>{
      if (this.normalizeCodeForSummary(row[dayKey]) === summaryCode) count++;
    });
    return count;
  }

  getStaffSummarySeedCodes(staffCategory) {
    const seeds=this.staffSummarySeeds && this.staffSummarySeeds[staffCategory];
    return seeds ? seeds.slice() : ['OC','A','DM','8'];
  }

  getStaffingMinimum(base, sectionType, summaryCode, dayNum) {
    const section=this.staffingMinimums && this.staffingMinimums[sectionType];
    if (!section || !section[base]) return 0;
    const entry=this.normalizeMinimumEntry(section[base][summaryCode]);
    return this.isWeekendDay(dayNum) ? entry.weekend : entry.weekday;
  }

  isSummaryBelowMinimum(entity, dayKey, value) {
    if (!entity || entity.isSummaryTotal || !entity.summaryCode) return false;
    const min=this.getStaffingMinimum(entity.summaryBase, entity.summarySection, entity.summaryCode, dayKey);
    if (!min) return false;
    const count=parseInt(value, 10) || 0;
    return count < min;
  }

  isSummaryRowAllZero(row, lastDay) {
    for (let day=1; day<=lastDay; day++) {
      if ((parseInt(row[String(day)], 10) || 0) > 0) return false;
    }
    return true;
  }

  inferSummaryCodesForRows(rows, seedCodes, options) {
    const opts=options || {};
    const onlyPresent=!!opts.onlyPresent;
    const excludeCodes=opts.excludeCodes || [];
    const optional=this.summaryOptionalCodes || [];
    const ordered=seedCodes.filter(code=>excludeCodes.indexOf(code) < 0);
    const seen={};
    ordered.forEach(code=>{ seen[code]=true; });
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    (rows || []).forEach(row=>{
      for (let day=1; day<=lastDay; day++) {
        const code=this.normalizeCodeForSummary(row[String(day)]);
        if (!code || seen[code] || excludeCodes.indexOf(code) > -1) continue;
        seen[code]=true;
        ordered.push(code);
      }
    });
    return ordered.filter(code=>{
      if (excludeCodes.indexOf(code) > -1) return false;
      if (onlyPresent) return this.codePresentInMonth(rows, code);
      if (optional.indexOf(code) < 0) return true;
      return this.codePresentInMonth(rows, code);
    });
  }

  codePresentInMonth(rows, summaryCode) {
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    for (let day=1; day<=lastDay; day++) {
      if (this.countDutyForDay(rows, summaryCode, day) > 0) return true;
    }
    return false;
  }

  buildSummaryRows(rows, summaryCodes, base, sectionType, options) {
    const opts=options || {};
    const optionalCodes=opts.optionalCodes || [];
    const excludeFromTotal=opts.excludeFromTotal || [];
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    const activeCodes=summaryCodes.filter(code=>{
      if (opts.onlyPresentCodes) return this.codePresentInMonth(rows, code);
      if (optionalCodes.indexOf(code) < 0) return true;
      return this.codePresentInMonth(rows, code);
    });
    if (!activeCodes.length) return [];
    const summaryRows=activeCodes.map(code=>{
      const summaryRow={
        displayName: this.summaryRowLabel(code),
        isSummaryRow: true,
        isSummaryTotal: false,
        rosterKind: 'summary',
        summaryCode: code,
        summaryBase: base,
        summarySection: sectionType,
        excludeFromTotal: excludeFromTotal.indexOf(code) > -1
      };
      for (let day=1; day<=lastDay; day++) {
        summaryRow[String(day)]=this.countDutyForDay(rows, code, day);
      }
      return summaryRow;
    });
    const totalRow={
      displayName: 'Total',
      isSummaryRow: true,
      isSummaryTotal: true,
      rosterKind: 'summary'
    };
    for (let day=1; day<=lastDay; day++) {
      const dayKey=String(day);
      totalRow[dayKey]=summaryRows.reduce((sum, row)=>{
        if (row.excludeFromTotal) return sum;
        return sum + (parseInt(row[dayKey], 10) || 0);
      }, 0);
    }
    if (opts.includeTotal !== false && !this.isSummaryRowAllZero(totalRow, lastDay)) {
      summaryRows.push(totalRow);
    }
    return summaryRows;
  }

  buildGridWithSummaries(personRows) {
    const parts=[];
    let hasVisibleSection=false;
    let hasVisibleStaff=false;

    const addMajorSpacer=()=>{
      if (hasVisibleSection) parts.push.apply(parts, this.makeSpacerRows(3));
    };
    const addStaffSpacer=()=>{
      if (hasVisibleStaff) parts.push.apply(parts, this.makeSpacerRows(1));
    };

    this.sectionPickerOptions.forEach(opt=>{
      if (!this.isSectionVisible(opt.key)) return;

      if (opt.sectionType === 'captains') {
        const captains=personRows.filter(row=>{
          return row.rosterKind === 'pilot' && row.far299Exp && row.pilotBase === opt.base;
        });
        captains.sort((a,b)=>this.comparePilotsByHireDate(a, b));
        if (!captains.length) return;
        addMajorSpacer();
        parts.push(this.makeSectionHeader(this.baseSectionLabel(opt.base)));
        parts.push(this.makeDutyBrushRow(opt.key, opt.label));
        captains.forEach(row=>{ row.rowSection='captain'; });
        parts.push.apply(parts, captains);
        const captainCodes=this.inferSummaryCodesForRows(captains, this.captainSummaryCodes, {
          onlyPresent:true,
          excludeCodes:this.foOnlySummaryCodes
        });
        const captainSummary=this.buildSummaryRows(captains, captainCodes, opt.base, 'captains', {
          excludeFromTotal:this.captainTotalExclude
        });
        captainSummary.forEach(row=>{ row.rowSection='capt-summary'; });
        if (captainSummary.length) captainSummary[captainSummary.length - 1].sectionEnd=true;
        parts.push.apply(parts, captainSummary);
        hasVisibleSection=true;
        return;
      }

      if (opt.sectionType === 'fos') {
        const fos=personRows.filter(row=>{
          return row.rosterKind === 'pilot' && !row.far299Exp && row.pilotBase === opt.base;
        });
        fos.sort((a,b)=>this.comparePilotsByHireDate(a, b));
        if (!fos.length) return;
        addMajorSpacer();
        parts.push(this.makeSectionHeader(this.foSectionLabel(opt.base)));
        parts.push(this.makeDutyBrushRow(opt.key, opt.label));
        fos.forEach(row=>{ row.rowSection='fo'; });
        parts.push.apply(parts, fos);
        const foCodes=this.inferSummaryCodesForRows(fos, this.foSummaryCodes, {
          onlyPresent:true,
          excludeCodes:this.captainOnlySummaryCodes
        });
        const foSummary=this.buildSummaryRows(fos, foCodes, opt.base, 'fos', {
          excludeFromTotal:this.foTotalExclude
        });
        foSummary.forEach(row=>{ row.rowSection='fo-summary'; });
        if (foSummary.length) foSummary[foSummary.length - 1].sectionEnd=true;
        parts.push.apply(parts, foSummary);
        hasVisibleSection=true;
        return;
      }

      if (opt.sectionType === 'staff') {
        const rows=personRows.filter(row=>{
          return row.rosterKind === 'employee' &&
            (row.base || opt.base) === opt.base &&
            (row.jobCategory || 'uncategorized') === opt.staffCategory;
        });
        rows.sort((a,b)=>this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b)));
        if (!rows.length) return;
        if (!hasVisibleStaff && hasVisibleSection) addMajorSpacer();
        addStaffSpacer();
        parts.push(this.makeSectionHeader(opt.label.toUpperCase()));
        parts.push(this.makeDutyBrushRow(opt.key, opt.label));
        rows.forEach(row=>{
          row.rowSection='employee';
          row.staffCategory=opt.staffCategory;
        });
        parts.push.apply(parts, rows);
        const staffSectionType=`staff-${opt.staffCategory}`;
        const staffCodes=this.inferSummaryCodesForRows(
          rows,
          this.getStaffSummarySeedCodes(opt.staffCategory),
          {onlyPresent:true}
        );
        const staffSummary=this.buildSummaryRows(rows, staffCodes, opt.base, staffSectionType, {
          onlyPresentCodes:true,
          includeTotal:staffCodes.length > 0
        });
        if (staffSummary.length) {
          staffSummary.forEach(row=>{ row.rowSection='staff-summary'; });
          staffSummary[staffSummary.length - 1].sectionEnd=true;
          parts.push.apply(parts, staffSummary);
        }
        hasVisibleStaff=true;
        hasVisibleSection=true;
      }
    });

    return parts;
  }

  refreshSummaryRows() {
    const personRows=this.personRowsForSummary();
    this.gridOptions.data=this.buildGridWithSummaries(personRows);
    if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('all');
    this.refreshDutyBrushCodesBySection();
    this.refreshGridSize();
  }

  updateGridEditing() {
    this.gridOptions.enableCellEditOnFocus=false;
    if (!this.gridOptions.columnDefs) return;
    this.gridOptions.columnDefs.forEach(col=>{
      if (col.field === 'displayName') {
        col.enableCellEdit=false;
        col.cellTemplate=this.nameCellTemplate;
        col.cellClass=this.nameCellClass.bind(this);
        return;
      }
      col.enableCellEdit=false;
      col.cellClass=this.dayCellClass.bind(this);
    });
    if (this.gridApi && this.gridApi.core) this.gridApi.core.notifyDataChange('column');
  }

  processAcrorosterRecords(records) {
    const allRecords=records || [];
    let pilotRecords=[];
    allRecords.forEach(record=>{
      const pilotIndex=this.pilots.map(e=>(e.firstName + ' ' + e.lastName)).indexOf(record.employee_full_name);
      if (pilotIndex < 0) return;
      record.pilotObj=this.pilots[pilotIndex];
      if (!this.recordMatchesBase(record, record.pilotObj.pilotBase)) return;
      pilotRecords.push(record);
    });
    pilotRecords=this.spreadMultiDayEvents(pilotRecords);
    let calendar=this.initCalendar(this.date);
    calendar.forEach(day=>{
      day.availablePilots=pilotRecords.filter(pilot=>{
        if (!pilot.start_plain_date_time || !day.dateObj) return false;
        return pilot.start_plain_date_time.split('T')[0] === day.dateObj.split('T')[0];
      });
    });
    const staffRows=this.buildStaffRowsFromEvents(allRecords);
    this.calendarToData(calendar, staffRows);
    this.updateGridEditing();
  }
  
  getDaysBetweenDates(date1, date2) {
    const timeDifference = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  }
  
  calendarToData(calendar, staffRows){
    this.data=[];
    let pilots=angular.copy(this.pilots.filter(p=>{return this.isPilotActive(p);}));
    pilots.sort((a,b)=>this.comparePilotsByHireDate(a, b));
    for (const pilot of pilots){
      for (const element of calendar){
        let totalCaptOME=0;
        let totalCaptOTZ=0;
        let totalFOOME=0;
        let totalFOOTZ=0;
        element.availablePilots.forEach(p=>{
          if (p.employee_full_name==="Sophia Hobbs") p.employee_full_name="Sophia Evans";
          const duty=this.pilotDutyLabelForCount(p, p.pilotObj);
          if (!duty || this.dutyCodes.indexOf(duty) < 0) return;
          if (p.pilotObj.pilotBase==="OME"){
            if (p.pilotObj.far299Exp) totalCaptOME++;
            else totalFOOME++;
          }
          if (p.pilotObj.pilotBase==="OTZ"){
            if (p.pilotObj.far299Exp) totalCaptOTZ++;
            else totalFOOTZ++;
          }
        });
        element.totalCaptOME=totalCaptOME;
        element.totalFOOME=totalFOOME;
        element.totalCaptOTZ=totalCaptOTZ;
        element.totalFOOTZ=totalFOOTZ;
        let calendarDate=new Date(element.date);
        if (this.date.getMonth() === calendarDate.getMonth() && this.date.getFullYear() === calendarDate.getFullYear()){
          let pilotArr=element.availablePilots.filter(p=>{return p.employee_full_name===pilot.firstName+' '+pilot.lastName});
          if (pilotArr.length>0) {
            let shiftArr=pilotArr.filter(e=>{return e.type==='shift'});
            if (shiftArr.length>0) pilotArr=shiftArr;
            const duty=this.pickPilotDutyFromAcrorosterRecords(pilotArr, pilot);
            if (duty) pilot[element.day]=duty;
          }
        }
      }
    }
    const pilotRows=pilots.map(pilot=>{
      pilot.rosterKind='pilot';
      pilot.displayName=`${pilot.firstName} ${pilot.lastName}`;
      return pilot;
    });
    const allRows=pilotRows.concat(staffRows || []);
    this.cachedPersonRows=allRows;
    this.gridOptions.data=this.buildGridWithSummaries(allRows);
    this.refreshDutyBrushCodesBySection();
    return allRows;
  }
  
  setDaysOfMonth(){
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    const self=this;
    const dow=['SU','MO','TU','WE','TH','FR','SA'];
    let columnDefs=[{
      name:'Name',
      field:'displayName',
      width:148,
      minWidth:118,
      maxWidth:168,
      enableCellEdit:false,
      cellTemplate:this.nameCellTemplate,
      cellClass:this.nameCellClass.bind(this),
      headerCellClass:'roster-name-header'
    }];
    for (let x=1;x<=lastDay;x++){
      const headerDate=new Date(this.date.getFullYear(), this.date.getMonth(), x);
      const dayNum=headerDate.getDay();
      const isWeekend=dayNum === 0 || dayNum === 6;
      columnDefs.push({
        field:x.toString(),
        width:34,
        minWidth:34,
        dayOfMonth:x,
        dayAbbrev:dow[dayNum],
        isWeekend:isWeekend,
        cellTemplate:this.template,
        cellClass:this.dayCellClass.bind(this),
        headerCellClass:isWeekend ? 'roster-weekend-header' : 'roster-weekday-header',
        headerCellTemplate:'<div class="ui-grid-cell-contents roster-day-header"><div class="roster-dow">{{col.colDef.dayAbbrev}}</div><div class="roster-dom">{{col.colDef.dayOfMonth}}</div></div>',
        enableCellEdit:false,
        cellEditableCondition:function() {
          return false;
        }
      });
    }
    this.gridOptions.columnDefs=columnDefs;
    this.gridOptions.enableCellEditOnFocus=false;
  }

  nameCellClass(grid, row, col) {
    if (row && row.entity && row.entity.isSpacerRow) return 'roster-spacer-cell';
    if (row && row.entity && row.entity.isDutyBrushRow) return 'roster-duty-brush-name-cell';
    if (row && row.entity && row.entity.isSectionHeader) return 'roster-section-header-label';
    if (row && row.entity && row.entity.isSummaryRow) {
      return row.entity.isSummaryTotal ? 'roster-summary-total-label' : 'roster-summary-label';
    }
    if (row && row.entity && row.entity.rowSection === 'employee') return 'roster-employee-name';
    return 'roster-person-name';
  }

  dayCellClass(grid, row, col) {
    const classes=[];
    if (row && row.entity && row.entity.isSpacerRow) {
      classes.push('roster-spacer-cell');
      return classes.join(' ');
    }
    if (row && row.entity && row.entity.isDutyBrushRow) {
      classes.push('roster-brush-day-cell');
      return classes.join(' ');
    }
    if (col && col.colDef && col.colDef.isWeekend) classes.push('roster-weekend-cell');
    if (row && row.entity && row.entity.isSectionHeader) {
      classes.push('roster-section-header-day');
      return classes.join(' ');
    }
    if (row && row.entity && row.entity.isSummaryRow) {
      const value=grid.getCellValue(row, col);
      if (row.entity.isSummaryTotal) classes.push('roster-summary-total');
      else {
        const count=parseInt(value, 10) || 0;
        const min=this.getStaffingMinimum(
          row.entity.summaryBase,
          row.entity.summarySection,
          row.entity.summaryCode,
          col.field
        );
        if (min > 0) {
          if (count === 0) classes.push('roster-summary-zero');
          else if (count < min) classes.push('roster-summary-below-min');
          else classes.push('roster-summary-count');
        } else classes.push('roster-summary-neutral');
      }
      return classes.join(' ');
    }
    const dutyClass=this.cellClass(grid, row, col);
    if (dutyClass) classes.push(dutyClass);
    if (row && row.entity && row.entity._cellMeta && col && col.field) {
      const meta=row.entity._cellMeta[col.field];
      if (meta && meta.pendingKind) {
        classes.push('roster-cell-pending');
        classes.push(`roster-cell-pending--${meta.pendingKind}`);
      }
    }
    return classes.join(' ');
  }

  cellClass(grid, row, col, rowRenderIndex, colRenderIndex) {
    if (grid) {
      if (!grid.getCellValue(row,col)||grid.getCellValue(row,col)==="") return;
      return grid.getCellValue(row,col);
    }
  }
  
  initCalendar(date){
    let arr=[{}];
    date=new Date(date);
    let year=date.getFullYear();
    let month=date.getMonth();
    let lastDay = new Date(year, month + 1, 0);
    for (let x=1;x<=lastDay.getDate();x++){
      let d=new Date(year,month,x);
      let utcD=new Date(year,month,x);
      utcD.setUTCHours(0, 0, 0, 0);
      arr[x]={date:d.toLocaleDateString(),
                dateObj: utcD.toISOString(),
                day: x,
                availablePilots: [],
                totalCaptOME:0,
                totalFOOME:0,
                totalCaptOTZ:0,
                totalFOOTZ:0
      };
    }
    return arr;
  }
}

angular.module('workspaceApp')
  .component('roster', {
    templateUrl: 'app/roster/roster.html',
    controller: RosterComponent,
    controllerAs: 'roster'
  });

})();
