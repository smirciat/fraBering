'use strict';

(function(){

class RosterComponent {
  constructor($http,$state,$timeout,$scope,uiGridConstants,moment,Modal,socket,Auth) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.Auth=Auth;
    this.dutyCodes=['A','DM','IOE','8','KA','B1','B2','C1','C2','S1','S2','F','OTZ'];
    this.codes=['OC','A','DM','NM','ND','T','V','RA','RV','RO','RP','C8','C','SC','B','KA','B2','C2','SC2','F','IOE','OTZ'];
    this.captainSummaryCodes=['KA','C1','S1','8','B1','OC','NM'];
    this.foSummaryCodes=['KA','C1','S1','8','B1','OC','ND'];
    this.template='<div class="ui-grid-cell-contents" title="TOOLTIP"><span ng-if="COL_FIELD!==\'B\'">{{COL_FIELD}}</span><i ng-if="COL_FIELD===\'B\'" class="fa fa-solid fa-umbrella-beach fa-autosize"></i></div>';
    this.data=[];
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    this.dataSource=this.getStoredDataSource();
    this.localEmpty=false;
    this.importing=false;
    this.savingCell=false;
    this.scheduleDays={};
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
    this.rosterBases=['OME', 'OTZ', 'UNK'];
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
    this.calendarRequests=[];
    this.calendarUpcoming=[];
    this.selectedCalendarDay=null;
    this.calendarLoading=false;
    this.viewRefreshing=false;
    this.cachedPersonRows=[];
    this.calendarRangeStart=null;
    this.calendarRangeEnd=null;
    this.savingCalendarRequest=false;
    this.gridOptions={rowHeight:26,
                      headerRowHeight:42,
                      enableSorting: false,
                      enableGridMenu: false,
                      data:this.data,
                      rowTemplate:'<div class="roster-grid-row" ng-class="grid.options.getRosterRowClass(row.entity)"><div ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ui-grid-cell class="ui-grid-cell" ng-class="{\'ui-grid-row-header-cell\': col.isRowHeader}"></div></div>',
                      getRosterRowClass:function(entity) {
                        if (!entity) return {};
                        return {
                          'roster-section-header-row': entity.isSectionHeader,
                          'roster-summary-row': entity.isSummaryRow,
                          'roster-captain-row': entity.rowSection === 'captain',
                          'roster-fo-row': entity.rowSection === 'fo',
                          'roster-employee-row': entity.rowSection === 'employee',
                          'roster-section-end': entity.sectionEnd,
                          'roster-section-start': entity.sectionStart,
                          'roster-spacer-row': entity.isSpacerRow
                        };
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
    const key=String(name || '').trim().toLowerCase();
    if (key === 'sophia hobbs') return 'sophia evans';
    return key;
  }

  eventBaseFromRecord(record) {
    if (!record || !record.location_name) return null;
    const location=String(record.location_name).split(' ')[0].toUpperCase();
    if (location === 'NOME') return 'OME';
    if (location === 'KOTZEBUE' || location === 'KOTZ') return 'OTZ';
    if (location === 'UNALAKLEET' || location === 'UNK') return 'UNK';
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
    return 'uncategorized';
  }

  staffLabelForGrid(record) {
    let label=record.label;
    if (label === '8') label='C8';
    label=String(label || '').trim();
    if (label.length > 4) label=label.substring(0, 4);
    return label.toUpperCase();
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
    const match=this.staffJobCategories.find(cat=>cat.id === (jobCategory || 'uncategorized'));
    return match ? match.label : 'Staff (Other)';
  }

  rebuildEmployeeGroups() {
    this.employeesByCategory={};
    this.employeesByBaseAndCategory={};
    this.staffJobCategories.forEach(cat=>{
      this.employeesByCategory[cat.id]=[];
    });
    this.rosterBases.forEach(base=>{
      this.employeesByBaseAndCategory[base]={};
      this.staffJobCategories.forEach(cat=>{
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
    this.staffJobCategories.forEach(cat=>{
      this.employeesByCategory[cat.id].sort((a,b)=>{
        return this.employeeDisplayName(a).localeCompare(this.employeeDisplayName(b));
      });
      this.rosterBases.forEach(base=>{
        if (!this.employeesByBaseAndCategory[base]) return;
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

  setActiveView(view) {
    if (this.activeView === view) return;
    this.viewRefreshing=true;
    this.activeView=view;
    window.sessionStorage.setItem('rosterActiveView', view);
    this.timeout(()=>{
      if (view === 'team') this.refreshTeamLists();
      if (view === 'schedule') this.refreshSummaryRows();
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

  openEmployeeForm(employee) {
    this.editingEmployee=employee || null;
    this.employeeForm=employee ? angular.copy(employee) : {
      firstName:'',
      lastName:'',
      employeeNumber:'',
      qualifications:'',
      jobCategory:'csa-dispatch',
      isActive:true
    };
    if (!this.employeeForm.jobCategory) this.employeeForm.jobCategory='uncategorized';
    this.showEmployeeForm=true;
  }

  cancelEmployeeForm() {
    this.showEmployeeForm=false;
    this.editingEmployee=null;
    this.employeeForm={};
  }

  saveEmployee() {
    if (!this.isLocalMode() || this.savingEmployee) return;
    this.savingEmployee=true;
    this.http.post('/api/calendar/rosterEmployeeSave', Object.assign({}, this.employeeForm, {
      base:this.getNavBaseCode(),
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
    const requests=this.rosterBases.map(base=>{
      return this.http.post('/api/calendar/rosterEmployees', { base }).then(empResp=>{
        return (empResp && empResp.data ? empResp.data : []).map(employee=>{
          return Object.assign({}, employee, { base:employee.base || base });
        });
      });
    });
    return Promise.all(requests).then(results=>{
      this.allEmployees=[].concat.apply([], results);
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
    (this.pilots || []).forEach(pilot=>{
      const label=this.pilotDisplayName(pilot);
      const key=this.normalizeRosterPersonName(label);
      if (!label || seen.has(key)) return;
      seen.add(key);
      options.push({ key:label, label, kind:'pilot' });
    });
    (this.employees || []).forEach(employee=>{
      const label=this.employeeDisplayName(employee);
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
    const user=this.Auth.getCurrentUser();
    const userName=user && user.name ? String(user.name).trim() : '';
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
    const pilot=(this.pilots || []).find(item=>{
      return this.normalizeRosterPersonName(this.pilotDisplayName(item)) === target;
    });
    if (pilot && pilot._id) {
      return {
        base:pilot.pilotBase || this.getNavBaseCode(),
        rosterId:`pilot:${pilot._id}`,
        kind:'pilot'
      };
    }
    const employee=(this.allEmployees || this.employees || []).find(item=>{
      return this.normalizeRosterPersonName(this.employeeDisplayName(item)) === target;
    });
    if (employee && employee._id) {
      return {
        base:employee.base || this.getNavBaseCode(),
        rosterId:`employee:${employee._id}`,
        kind:'employee'
      };
    }
    return {
      base:this.getNavBaseCode(),
      rosterId:null,
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
      personName:this.calendarPerson,
      source:this.isLocalMode() ? 'local' : 'acroroster',
      pilots:this.pilots,
      employees:this.allEmployees || this.employees
    }).then(resp=>{
      this.processCalendarEvents((resp && resp.data && resp.data.events) ? resp.data.events : []);
    }).finally(()=>{
      this.calendarLoading=false;
    });
  }

  processCalendarEvents(events) {
    this.calendarEventsByDay={};
    this.calendarRequests=[];
    const requestKeys={};
    (events || []).forEach(event=>{
      const day=event.day || new Date(event.start_plain_date_time).getUTCDate();
      if (!day) return;
      if (!this.calendarEventsByDay[day]) this.calendarEventsByDay[day]=[];
      this.calendarEventsByDay[day].push(event);
      const kind=this.calendarEventKind(event);
      if (kind === 'scheduled') return;
      const key=`${day}:${kind}:${String(event.label || '').toUpperCase()}`;
      if (requestKeys[key]) return;
      requestKeys[key]=true;
      this.calendarRequests.push({
        day,
        kind,
        label:event.label,
        requestType:event.requestType || (kind === 'time-off' ? 'time_off' : 'work'),
        type:event.type,
        status:event.status || (event.source === 'local' ? 'pending' : 'approved'),
        title:this.calendarEventTitle(event, kind),
        source:event.source
      });
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

  calendarEventKind(event) {
    const label=String(event.label || '').trim().toUpperCase();
    const offCodes=['V','RA','RV','RO','RP','B','T'];
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
    return this.isLocalMode();
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
      personName:this.calendarPerson,
      days,
      requestType:requestType,
      rosterId:meta.rosterId,
      applyToSchedule:true,
      action:'add'
    }).then(resp=>{
      this.applyCalendarScheduleResponse(meta, resp);
      return this.loadCalendarData();
    }).finally(()=>{
      this.savingCalendarRequest=false;
    });
  }

  deleteCalendarRequest(request) {
    if (!this.canEditCalendar() || !request || this.savingCalendarRequest) return;
    const meta=this.resolveCalendarPersonMeta();
    if (!meta.base) return;
    this.savingCalendarRequest=true;
    this.http.post('/api/calendar/rosterCalendarSave', {
      date:this.date,
      base:meta.base,
      personName:this.calendarPerson,
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
    return `${base} CAPT`;
  }

  foSectionLabel(base) {
    if (!base) return '';
    if (base === 'OME') return 'NOME FO';
    if (base === 'OTZ') return 'KOTZEBUE FO';
    if (base === 'UNK') return 'UNK FO';
    return `${base} FO`;
  }

  baseShortLabel(base) {
    if (base === 'OME') return 'NOME';
    if (base === 'OTZ') return 'KOTZ';
    if (base === 'UNK') return 'UNK';
    return base;
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
      filters[this.sectionFilterKey(base, 'captains')]=base === 'OME';
      if (base !== 'OTZ') filters[this.sectionFilterKey(base, 'fos')]=false;
      this.staffJobCategories.forEach(cat=>{
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
      options.push({
        key:this.sectionFilterKey(base, 'captains'),
        label:this.baseSectionLabel(base),
        base,
        sectionType:'captains'
      });
      if (base !== 'OTZ') {
        options.push({
          key:this.sectionFilterKey(base, 'fos'),
          label:this.foSectionLabel(base),
          base,
          sectionType:'fos'
        });
      }
      this.staffJobCategories.forEach(cat=>{
        options.push({
          key:this.sectionFilterKey(base, cat.id),
          label:`${this.baseShortLabel(base)} ${cat.label}`,
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
      return this.staffJobCategories.some(cat=>{
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
    return entity && !entity.isSummaryRow && !entity.isSectionHeader && !entity.isSpacerRow;
  }
  
  $onInit(){
    const self=this;
    this.refreshSectionPickerOptions();
    this.gridOptions.onRegisterApi=function(gridApi) {
      self.gridApi=gridApi;
      if (!gridApi.edit) return;
      gridApi.edit.on.afterCellEdit(self.scope, function(rowEntity, colDef, newValue, oldValue) {
        if (!self.isLocalMode()) return;
        if (newValue === oldValue) return;
        self.saveScheduleCell(rowEntity, colDef.field, newValue);
        self.refreshSummaryRows();
      });
    };
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      if (!newVal||newVal==='') return;
      if (!oldVal||oldVal==='') return;
      if (this.scope.nav) this.scope.nav.isCollapsed=true;
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

  saveScheduleCell(rowEntity, dayField, code) {
    const day = parseInt(dayField, 10);
    if (!day || !rowEntity || !rowEntity.rosterId) return;
    const normalized=(code || '').trim().toUpperCase();
    const base=rowEntity.base || rowEntity.pilotBase || this.getNavBaseCode();
    if (!base) return;
    this.savingCell = true;
    this.http.post('/api/calendar/rosterScheduleSave', {
      date: this.date,
      base,
      rosterId: rowEntity.rosterId,
      day: day,
      code: normalized
    }).then(() => {
      if (!this.scheduleDays[rowEntity.rosterId]) this.scheduleDays[rowEntity.rosterId]={};
      if (normalized) this.scheduleDays[rowEntity.rosterId][String(day)] = normalized;
      else delete this.scheduleDays[rowEntity.rosterId][String(day)];
      this.localEmpty = false;
      this.refreshSummaryRows();
    }).finally(() => {
      this.savingCell = false;
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
    const requests=this.rosterBases.map(base=>{
      return this.http.post('/api/calendar/rosterScheduleLocal', {
        date:this.date,
        base
      });
    });
    return Promise.all(requests).then(results=>{
      this.scheduleDays={};
      this.localEmpty=true;
      results.forEach(resp=>{
        if (!resp || !resp.data) return;
        Object.assign(this.scheduleDays, resp.data.days || {});
        if (!resp.data.empty) this.localEmpty=false;
      });
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
      const personDays=this.scheduleDays[row.rosterId] || {};
      for (let day=1; day<=lastDay; day++) {
        row[String(day)]=personDays[String(day)] || '';
      }
    });
    this.cachedPersonRows=rows;
    this.gridOptions.data=this.buildGridWithSummaries(rows);
    this.updateGridEditing();
  }

  personRowsOnly() {
    return (this.gridOptions.data || []).filter(row=>!row.isSummaryRow && !row.isSectionHeader && !row.isSpacerRow);
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

  buildSummaryRows(rows, summaryCodes) {
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    const summaryRows=summaryCodes.map(code=>{
      const summaryRow={
        displayName: code,
        isSummaryRow: true,
        isSummaryTotal: false,
        rosterKind: 'summary',
        summaryCode: code
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
      totalRow[dayKey]=summaryRows.reduce((sum, row)=>sum + (parseInt(row[dayKey], 10) || 0), 0);
    }
    summaryRows.push(totalRow);
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
        captains.forEach(row=>{ row.rowSection='captain'; });
        parts.push.apply(parts, captains);
        const captainSummary=this.buildSummaryRows(captains, this.captainSummaryCodes);
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
        fos.forEach(row=>{ row.rowSection='fo'; });
        parts.push.apply(parts, fos);
        const foSummary=this.buildSummaryRows(fos, this.foSummaryCodes);
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
        rows.forEach(row=>{
          row.rowSection='employee';
          row.staffCategory=opt.staffCategory;
        });
        parts.push.apply(parts, rows);
        if (rows.length) rows[rows.length - 1].sectionEnd=true;
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
  }

  updateGridEditing() {
    const editable=this.isLocalMode();
    const self=this;
    this.gridOptions.enableCellEditOnFocus=editable;
    if (!this.gridOptions.columnDefs) return;
    this.gridOptions.columnDefs.forEach(col=>{
      if (col.field === 'displayName') {
        col.enableCellEdit=false;
        col.cellClass=this.nameCellClass.bind(this);
        return;
      }
      col.enableCellEdit=editable;
      col.cellClass=this.dayCellClass.bind(this);
      col.cellEditableCondition=function($scope) {
        return editable && self.canEditRowEntity($scope.row && $scope.row.entity);
      };
      col.editableCellTemplate='<input type="text" ui-grid-editor ng-model="MODEL_COL_FIELD" maxlength="4" style="text-transform:uppercase;" />';
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
          if (p.pilotObj.pilotBase==="OME"){
            if (p.pilotObj.far299Exp&&this.dutyCodes.indexOf(p.label)>-1) totalCaptOME++;
            if (!p.pilotObj.far299Exp&&this.dutyCodes.indexOf(p.label)>-1) totalFOOME++;
          }
          if (p.pilotObj.pilotBase==="OTZ"){
            if (p.pilotObj.far299Exp&&this.dutyCodes.indexOf(p.label)>-1) totalCaptOTZ++;
            if (!p.pilotObj.far299Exp&&this.dutyCodes.indexOf(p.label)>-1) totalFOOTZ++;
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
            let newPilotArr=pilotArr.filter(e=>{return e.type==='shift'});
            if (newPilotArr.length>0) pilotArr=newPilotArr;
            let index=0;
            if (pilotArr[index].label==="8") pilotArr[index].label="C8";
            if (pilotArr[index].label==="16") {
              if (pilot.far299Exp) pilotArr[index].label="NM";
              else pilotArr[index].label="ND";
            }
            pilot[element.day]=pilotArr[index].label;
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
    return allRows;
  }
  
  setDaysOfMonth(){
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    const editable=this.isLocalMode();
    const self=this;
    const dow=['SU','MO','TU','WE','TH','FR','SA'];
    let columnDefs=[{
      name:'Name',
      field:'displayName',
      minWidth:180,
      enableCellEdit:false,
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
        enableCellEdit:editable,
        cellEditableCondition:function($scope) {
          return editable && self.canEditRowEntity($scope.row && $scope.row.entity);
        },
        editableCellTemplate:'<input type="text" ui-grid-editor ng-model="MODEL_COL_FIELD" maxlength="4" style="text-transform:uppercase;" />'
      });
    }
    this.gridOptions.columnDefs=columnDefs;
    this.gridOptions.enableCellEditOnFocus=editable;
  }

  nameCellClass(grid, row, col) {
    if (row && row.entity && row.entity.isSpacerRow) return 'roster-spacer-cell';
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
    if (col && col.colDef && col.colDef.isWeekend) classes.push('roster-weekend-cell');
    if (row && row.entity && row.entity.isSectionHeader) {
      classes.push('roster-section-header-day');
      return classes.join(' ');
    }
    if (row && row.entity && row.entity.isSummaryRow) {
      const value=grid.getCellValue(row, col);
      if (row.entity.isSummaryTotal) classes.push('roster-summary-total');
      else if (value === 0 || value === '0') classes.push('roster-summary-zero');
      else classes.push('roster-summary-count');
      return classes.join(' ');
    }
    const dutyClass=this.cellClass(grid, row, col);
    if (dutyClass) classes.push(dutyClass);
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
