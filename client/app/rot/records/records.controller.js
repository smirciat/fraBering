'use strict';

(function(){

class RecordsComponent {
  constructor($scope,$timeout,$interval,$http,rotAppConfig,Modal,categoryFilterFilter,$state,Auth,RotPilotContext,RotAccess) {
    this.categoryFilter=categoryFilterFilter;
    this.appConfig=rotAppConfig;
    this.Auth=Auth;
    this.RotAccess=RotAccess;
    this.RotPilotContext=RotPilotContext;
    this.Modal=Modal;
    this.http=$http;
    this.timeout=$timeout;
    this.interval=$interval;
    this.scope=$scope;
    this.state=$state;
    this.testString-'Test String';
    this.fileName='';
    this.file=null;
    this.files=null;
    this.fullFiles=[];
    this.queryObj={collection:'flights',limit:3000,parameter:'coPilot',value:'K. Janke'};
    this.assignmentSource=['B190','BE20','C208','C212','C408'];
    this.assignments=["Clear Selection"];
    this.tabs=['CERT','BI','HAZ','INTL','C208G','C408G','C212G','BE20G','B190G','RVSM','293A','C208','C408','C212','BE20','B190','297','297g','299','244','CFIT','FLT-INSTRUCTOR','CHECK-AIRMAN','OTHER-RECORDS'];
    this.subtabs=['Recurrent','Initial','Transition','Upgrade','Requalification'];
    this.categories=['Annual-Resume','Medical','Certificate','Drivers-License','Passport'];
    this.graces=['Uncurrent','Late Grace','In Base Month','Early Grace'];
    this.tab='CERT';
    this.dateString=new Date().toLocaleDateString();
    this.newPilot={};
    this.year=new Date().getFullYear();
    this.quarter=1;
    this.uploaderEmails=['fen@beringair.com','nathaniel@beringair.com','nathanielwkolson@gmail.com','smirciat@gmail.com','kalebjanke@gmail.com','ssman42@gmail.com'];
    this.approvalEmails=['fen@beringair.com','nathaniel@beringair.com','nathanielwkolson@gmail.com','smirciat@gmail.com'];
      this.pilotsOld=[];
      this.months=[];
      var formLabels = ["Basic Indoc", "HAZMAT", "293(b) & 299", "297", "-", "Caravan", "1900", "King Air", "Sky Courier", "CASA"];
      this.suffices = ['baseIndoc','baseHazmat','base293','base297','-','base208','base1900','baseKingAir','base408','baseCasa'];
      this.trainingTypes=['none','initial','recurrent', 'transition', 'upgrade', 'requalification'];
      this.types=['none','BasicIndoc','Hazmat','far299','far297','far297g','C208','B190','BE20','C408','C212'];
      this.instructors=['none','not listed','Kyle Lefebvre','Nick Hajdukovich','Fen Kinneen','Ryan Woehler','Nathaniel Olson','Mike R. Evans','Michael K. Evans','Andy Smircich','Neill Toelle','Josh Krebiehl','Tim Kunkel','Frank Parker','Tim Hopley','Scott Gordon'];
      this.formTypes=[];
      for (var i=0;i<formLabels.length;i++) {
        this.formTypes.push({label:formLabels[i],suffix:this.suffices[i],radio:false,id:i});
      }
      for (var i=1;i<13;i++){
        this.months.push(new Date(i + '/15/2020').toLocaleString('default', { month: 'long' }));
      }
      this.quickModal = this.Modal.confirm.quickMessage(response => {
      
      });
      let quick = this.quickModal;
      this.toaster = {
        success: (title, msg) => quick(msg, title || 'Success', false),
        error: (title, msg) => quick(msg, title || 'Error', true),
        warning: (title, msg) => quick(msg, title || 'Warning', false)
      };
      this.radioModal = this.Modal.confirm.radio(formData => {
        //select training types
        let recordIndex = 0;
        if (formData._id) recordIndex= this.records.map(e => e._id).indexOf(formData._id);
        const baseMonthManual=this.records[recordIndex].baseMonthManual;
        const savedBaseMonth=this.records[recordIndex].baseMonth;
        Object.assign(this.records[recordIndex],formData);
        if (baseMonthManual) {
          this.records[recordIndex].baseMonthManual=true;
          this.records[recordIndex].baseMonth=savedBaseMonth;
        }
        this.records[recordIndex].trainingTypeArray=[];
        for (let key in this.records[recordIndex]) {
          if (this.appConfig.trainingEventKeys.indexOf(key)<0) continue;
          if (this.records[recordIndex][key]&&typeof this.records[recordIndex][key]=="boolean") {
            this.records[recordIndex][key]="true";
            this.records[recordIndex].trainingTypeArray.push(key);
            if (key!=='far297'&&!this.records[recordIndex].baseMonthManual){
              let expKey=key+'Exp';
              //find pilot record
              let pilotIndex = this.pilots.map(e => e.name).indexOf(this.records[recordIndex].name);
              if (pilotIndex>-1&&this.pilots[pilotIndex][expKey]) {
                let newMonth=new Date(this.pilots[pilotIndex][expKey]).toLocaleString('default', { month: 'long' });
                if (this.months.indexOf(newMonth)>-1) this.records[recordIndex].baseMonth=newMonth;
              }
            }
          }
          if (!this.records[recordIndex][key]&&typeof this.records[recordIndex][key]=="boolean") {
            this.records[recordIndex][key]="false";
          }
        }
        this.enrichRecords();
        this.buildRecordsChoice();
      });
      this.expPreviewModal = this.Modal.confirm.expPreview((record, rows) => {
        this.finalizeApproval(record, rows);
      });
      this.pilotModal = this.Modal.confirm.pilotData(formData =>{
        if (!formData||!formData.name) {
          this.quickModal('Try again to enter the pilot data');
          return;
        }
        if (formData._id) {
          this.logManualExpHistoryChanges(formData);
          formData.trainingExpHistory=this.fullPilot.trainingExpHistory;
          this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:formData}).then(()=>{
            this.toaster.success('Success','Pilot training dates updated');
            let pilotIndex = this.pilots.map(e => e._id).indexOf(formData._id);
            if (pilotIndex>-1) this.pilots[pilotIndex]=JSON.parse(JSON.stringify(formData));
            if (this.fullPilot&&this.fullPilot._id===formData._id) {
              Object.assign(this.fullPilot, formData);
              this.pilot=this.cleanObject(formData);
            }
          }).catch(err=>{
            console.log(err);
            this.toaster.error('Error','Failed to update pilot training dates');
          });
        }
      });
  }
  
  $onInit(){
    this.showTable=true;
    this.showApproved=false;
    this.showSLEArray=[];
    this.bootstrapped=false;
    this.date=new Date();
    this.upDate();
    window.categories=this.categories;
    window.subtabs=this.subtabs;
    this.assignmentSource.forEach(a=>{
      this.assignments.push('PIC / ' + a);
      if (a==='B190'||a==='C408'||a==='C212') this.assignments.push('SIC / ' + a);
    });

    // Wait for User.me — sync isLoggedIn() is false on cold load until profile resolves.
    this.Auth.getCurrentUser(user => {
      if (!user || !user.role) return;
      this.user = user;
      this.bootstrapped = true;
      if (!this.canAccessRecords()) return;
      this.RotPilotContext.loadPilots().then(() => {
        let chosen = this.RotPilotContext.getChosenPilot();
        if (chosen) this.queryObj.value = chosen.displayName || chosen.name;
        this.pilots = this.RotPilotContext.getPilots();
        this.scope.$watch(
          () => this.RotPilotContext.getChosenPilot(),
          (newVal, oldVal) => {
            if (newVal) this.queryObj.value = newVal.displayName || newVal.name;
            if (oldVal && newVal && oldVal._id !== newVal._id) this.init();
          }
        );
        this.init();
      }).catch(err => {
        console.error('Records: pilot load failed', err);
        this.toaster.error('Error', 'Could not load pilot data from Firebase');
      });
    });
    
    this.scope.$watch(() => this.tab, (newVal) => {
      if (newVal) {
        if (newVal==='CERT') this.subs=this.categories;
        else this.subs=this.subtabs;
        this.subtab=undefined;
        this.seat=undefined;
      }
    });
    
  }
  
  parseRecordFileList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Records: could not parse listRecords response', e);
        return [];
      }
    }
    return [];
  }

  findSelectedPilot() {
    let chosen = this.RotPilotContext.getChosenPilot();
    if (!chosen) return null;
    if (!this.pilots || !this.pilots.length) return chosen;
    let index = this.pilots.map(e => e._id).indexOf(chosen._id);
    if (index > -1) return this.pilots[index];
    let label = chosen.displayName || chosen.name;
    if (label) {
      index = this.pilots.findIndex(pilot => pilot.displayName === label || pilot.name === label);
      if (index > -1) return this.pilots[index];
    }
    return chosen;
  }

  init(){
    //build array of upcoming events sorted by tab
    this.upcomingEvents=[];
    this.upcomingEventsSorted=[];
    this.appConfig.trainingEventKeys.forEach((key,index)=>{
      let k=key + 'Exp';
      if (key==='far293a') k=key+'148';
      let obj={key:key,k:k,events:[]};
      if (!this.pilots) return;
      this.pilots.forEach(pilot=>{
        if (!pilot[k]) return;
        let eventObj={name:pilot.name,id:pilot._id,event:key,exp:pilot[k]};
        //in base month
        if (this.isWithinMonth(pilot[k],0)) eventObj.grace=2;
        //late grace
        if (this.isWithinMonth(pilot[k],1)) eventObj.grace=1;
        if (this.isWithinMonth(pilot[k],-1)) eventObj.grace=3;
        //uncurrent
        if (this.isPriorToStartOfLastMonth(pilot[k])) eventObj.grace=0;
        if (eventObj.grace>-1) {
          obj.events.push(eventObj);
          this.upcomingEventsSorted.push(eventObj);
        }
      });
      this.upcomingEvents.push(obj);
    });
    
    //sort the sorted
    this.upcomingEventsSorted=this.upcomingEventsSorted.sort((a,b)=>new Date(a.exp)-new Date(b.exp));
    
    this.tabs.forEach(tab=>{
      this.showSLEArray.push({showSLE:false,showTab:false});
    });
    this.flights=[];
    this.timeframe=0;
    this.expKey='';
    this.associated=undefined;
    let p = this.findSelectedPilot();
    if (!p || p._id === undefined || p._id === null) return;
    this.fullPilot=p;
    this.pilot=this.cleanObject(p);
    if (!this.pilot.quals||this.pilot.quals.length===0) this.pilot.quals=[{}];
    if (!this.pilot.removals||this.pilot.removals.length===0) this.pilot.removals=[];
    if (!this.fullPilot.trainingExpHistory) this.fullPilot.trainingExpHistory={};
    this.installExpHistoryDebug();
    this.fullFiles.forEach(file=>{
      if (file.urlMain) URL.revokeObjectURL(file.urlMain);
    });
    this.fullFiles=[];
    //get file list from records that start with this.pilot employee number
    this.http.post('/api/rot/listRecords').then(res=>{
      let list = this.parseRecordFileList(res.data);
      this.files=list.filter(file=>file.startsWith(this.pilot._id.toString()));
      //get records from api for this pilot
      this.http.post('/api/rot/firebaseQuery',{
        collection:'records',
        parameter:'pilotNumber',
        value:this.pilot._id.toString(),
        limit:5000
      }).then(res=>{
        this.records=res.data || [];
        this.refreshRecords();
        this.timeout(()=>{this.getPilotsFiles();},0);
      }).catch(err=>{
        console.error('Records: firebaseQuery failed', err);
        this.records=[];
        this.toaster.error('Error','Could not load training records from Firebase');
      });
    });
    
  }
  
  fillCert(type,record){
    if (type==='instructor'){
      if (record.instructor==='none') record.instructor=null;
      if (record.instructor==='not listed') {
        record.instructor=prompt('Enter the name of the instructor from Flight Safety or similar:');
      }
    }
    else {
      if (record.checkAirman==='none') record.checkAirman=null;
      if (record.checkAirman==='not listed') {
        record.checkAirman=prompt('Enter the name of the check airman from Flight Safety or similar:');
      }
    }
  }
  
  isPriorToStartOfLastMonth(targetDate) {
    targetDate=new Date(targetDate);
    const today = new Date();
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return targetDate < startOfLastMonth;
  }
  
  isWithinMonth(targetDate,increment) {
    //increment is 0 for this month, 1 for last month, -1 for next month
    targetDate=new Date(targetDate);
    const today = new Date();
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - increment, 1);
    const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - increment + 1, 0, 23, 59, 59, 999);
    return targetDate >= startOfPrevMonth && targetDate <= endOfPrevMonth;
  }
  
  eventClass(index){
    if (index===0) return 'event-purple';
    if (index===1) return 'event-red';
    if (index===2) return 'event-yellow';
    if (index===3) return 'event-green';
  }
  
  getExpDate(key){
    if (!this.fullPilot) return;
    if (key==='far293a') return this.fullPilot[key+'148'];
    return this.fullPilot[key+'Exp'];
  }

  getPilotExpFieldKey(trainingEventKey){
    if (trainingEventKey==='far293a') return 'far293a148';
    return trainingEventKey+'Exp';
  }

  buildExpHistoryEntry(exp,context){
    return {
      exp: exp,
      baseMonth: context.baseMonth||null,
      checkDate: context.checkDate||null,
      recordId: context.recordId||null,
      approvedAt: new Date().toISOString(),
      approvedBy: (this.user && this.user.email) || null,
      newBaseMonth: context.newBaseMonth==='true'||context.newBaseMonth===true,
      source: context.source||'approval',
    };
  }

  prependExpHistory(expKey,entry){
    if (!expKey||!entry||!entry.exp) return false;
    if (!this.fullPilot) return false;
    if (!this.fullPilot.trainingExpHistory) this.fullPilot.trainingExpHistory={};
    let history=this.fullPilot.trainingExpHistory[expKey]||[];
    if (history.length>0&&history[0].exp===entry.exp&&entry.source!=='restore') return false;
    history.unshift(entry);
    this.fullPilot.trainingExpHistory[expKey]=history.slice(0,3);
    return true;
  }

  logApprovalExpHistory(record,expKey,expValue,expKeyAlt){
    const context={
      baseMonth: record.baseMonth,
      checkDate: record.date,
      recordId: record._id,
      newBaseMonth: record.newBaseMonth,
      source: 'approval',
    };
    const prior=this.fullPilot[expKey];
    if (prior&&prior!==expValue) {
      this.prependExpHistory(expKey,this.buildExpHistoryEntry(prior,{source:'superseded',checkDate:record.date}));
    }
    const entry=this.buildExpHistoryEntry(expValue,context);
    this.prependExpHistory(expKey,entry);
    if (expKeyAlt) {
      const priorAlt=this.fullPilot[expKeyAlt];
      if (priorAlt&&priorAlt!==expValue) {
        this.prependExpHistory(expKeyAlt,this.buildExpHistoryEntry(priorAlt,{source:'superseded',checkDate:record.date}));
      }
      this.prependExpHistory(expKeyAlt,entry);
    }
  }

  logManualExpHistoryChanges(updatedPilot){
    if (!this.fullPilot||!updatedPilot) return;
    const context={source:'manual'};
    const fields=this.getTrackedExpFields();
    fields.forEach(field=>{
      if (this.fullPilot[field]&&updatedPilot[field]!==this.fullPilot[field]) {
        this.prependExpHistory(field,this.buildExpHistoryEntry(this.fullPilot[field],context));
      }
    });
  }

  logRevertExpHistory(priorExpDates){
    if (!priorExpDates) return;
    const context={source:'revert'};
    Object.keys(priorExpDates).forEach(expKey=>{
      this.prependExpHistory(expKey,this.buildExpHistoryEntry(priorExpDates[expKey],context));
    });
  }

  getTrackedExpFields(){
    const fields=this.appConfig.trainingEvents.map(event=>event.name+'Exp');
    fields.push('far293a148');
    return fields;
  }

  hasExpColumn(key){
    if (this.getExpDate(key)) return true;
    if (!this.fullPilot||!this.fullPilot.trainingExpHistory) return false;
    const fieldKey=this.getPilotExpFieldKey(key);
    const history=this.fullPilot.trainingExpHistory[fieldKey];
    return !!(history&&history.length);
  }

  expHistoryRowIndexes(){
    return [0,1,2];
  }

  expHistoryRowLabel(rowIndex){
    if (rowIndex===0) return 'Current';
    return 'Previous';
  }

  expHistoryRowClass(rowIndex){
    if (rowIndex===0) return 'exp-history-current';
    if (rowIndex===1) return 'exp-history-prev1';
    return 'exp-history-prev2';
  }

  getExpHistoryHistoryIndex(trainingEventKey,rowIndex){
    const fieldKey=this.getPilotExpFieldKey(trainingEventKey);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const live=this.getExpDate(trainingEventKey);
    const loggedCurrentMatchesLive=history.length>0&&history[0].exp===live;
    if (rowIndex===1) return loggedCurrentMatchesLive?1:0;
    if (rowIndex===2) return loggedCurrentMatchesLive?2:1;
    return -1;
  }

  getExpHistoryCell(trainingEventKey,rowIndex){
    if (rowIndex===0) return this.getExpDate(trainingEventKey);
    const fieldKey=this.getPilotExpFieldKey(trainingEventKey);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const historyIndex=this.getExpHistoryHistoryIndex(trainingEventKey,rowIndex);
    if (historyIndex<0||!history[historyIndex]) return null;
    return history[historyIndex].exp;
  }

  getExpHistoryTooltip(trainingEventKey,rowIndex){
    if (rowIndex===0) return 'Current value on pilot profile';
    const fieldKey=this.getPilotExpFieldKey(trainingEventKey);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const historyIndex=this.getExpHistoryHistoryIndex(trainingEventKey,rowIndex);
    const entry=historyIndex>=0?history[historyIndex]:null;
    if (!entry) return '';
    const parts=['Logged '+entry.source];
    if (entry.checkDate) parts.push('check '+entry.checkDate);
    if (entry.baseMonth) parts.push('base '+entry.baseMonth);
    if (entry.approvedBy) parts.push('by '+entry.approvedBy);
    if (entry.approvedAt) parts.push('at '+new Date(entry.approvedAt).toLocaleString());
    if (this.canRestoreExpHistory(trainingEventKey,rowIndex)) parts.push('Click to restore');
    return parts.join(' · ');
  }

  getExpHistoryEntry(trainingEventKey,rowIndex){
    if (rowIndex===0) return null;
    const fieldKey=this.getPilotExpFieldKey(trainingEventKey);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const historyIndex=this.getExpHistoryHistoryIndex(trainingEventKey,rowIndex);
    if (historyIndex<0||!history[historyIndex]) return null;
    return history[historyIndex];
  }

  canRestoreExpHistory(trainingEventKey,rowIndex){
    if (!this.isApprover()||rowIndex===0) return false;
    const expValue=this.getExpHistoryCell(trainingEventKey,rowIndex);
    if (!expValue) return false;
    return expValue!==this.getExpDate(trainingEventKey);
  }

  restoreExpHistory(trainingEventKey,rowIndex){
    if (!this.canRestoreExpHistory(trainingEventKey,rowIndex)) return;
    const fieldKey=this.getPilotExpFieldKey(trainingEventKey);
    const entry=this.getExpHistoryEntry(trainingEventKey,rowIndex);
    const expValue=entry?entry.exp:this.getExpHistoryCell(trainingEventKey,rowIndex);
    const current=this.getExpDate(trainingEventKey);
    const label=trainingEventKey;
    if (!confirm('Restore '+label+' for '+this.pilot.name+' from '+current+' to '+expValue+'?')) return;
    const context={
      source: 'restore',
      baseMonth: entry&&entry.baseMonth,
      checkDate: entry&&entry.checkDate,
      recordId: entry&&entry.recordId,
      newBaseMonth: entry&&entry.newBaseMonth,
    };
    let doc={_id:this.fullPilot._id};
    doc[fieldKey]=expValue;
    this.fullPilot[fieldKey]=expValue;
    this.prependExpHistory(fieldKey,this.buildExpHistoryEntry(expValue,context));
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      let index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index],doc);
      this.toaster.success('Success',label+' restored to '+expValue);
    }).catch(err=>{
      console.log(err);
      this.toaster.error('Error','Failed to restore '+label);
    });
  }

  dumpExpHistory(trainingEventKey){
    const key=trainingEventKey||'C208PIC';
    const fieldKey=this.getPilotExpFieldKey(key);
    return {
      trainingEventKey: key,
      fieldKey: fieldKey,
      live: this.getExpDate(key),
      history: (this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[],
      rows: this.expHistoryRowIndexes().map(rowIndex=>({
        label: this.expHistoryRowLabel(rowIndex),
        value: this.getExpHistoryCell(key,rowIndex),
        tooltip: this.getExpHistoryTooltip(key,rowIndex),
      })),
    };
  }

  dumpAllExpHistory(){
    if (!this.appConfig||!this.appConfig.trainingEventKeys) return [];
    return this.appConfig.trainingEventKeys
      .filter(key=>this.hasExpColumn(key))
      .map(key=>this.dumpExpHistory(key));
  }

  installExpHistoryDebug(){
    if (!this.isApprover()) return;
    window.recordsExpHistoryDebug={
      dump: (key)=>this.dumpExpHistory(key),
      dumpAll: ()=>this.dumpAllExpHistory(),
      pilot: ()=>this.fullPilot&&this.fullPilot.name,
      restore: (key,rowIndex)=>this.restoreExpHistory(key,rowIndex),
      canRestore: (key,rowIndex)=>this.canRestoreExpHistory(key,rowIndex),
    };
  }
  
  isUserUploader(){
    if (this.user && this.uploaderEmails.indexOf(this.user.email) > -1) return true;
    return false;
  }

  canUploadRecords(){
    return this.isUserUploader() || this.isApprover();
  }

  pendingRecordCount(){
    if (!this.records || !Array.isArray(this.records)) return 0;
    return this.records.filter(record => record._id && !record.approved).length;
  }

  recordHasPdf(record){
    if (!record || !record._id || !this.fullFiles || !this.fullFiles.length) return false;
    const marker = 'associated_' + record._id + '_';
    return this.fullFiles.some(file => file.filename && file.filename.indexOf(marker) > -1);
  }

  canApproveRecord(record){
    return this.isApprover() && record && record._id && !record.approved;
  }

  getUploadFileElement(){
    return document.getElementById('recordUploadFile')
      || document.getElementById('file')
      || document.getElementById('fileApproval');
  }

  isApprover(){
    return !!(this.user && this.approvalEmails.indexOf(this.user.email) > -1);
  }

  onBaseMonthChange(record){
    if (record) record.baseMonthManual=true;
  }

  showPilotTrainingDates(){
    if (!this.fullPilot||!this.fullPilot._id) return this.toaster.error('Error','Select a pilot first');
    if (!this.isApprover()) return this.toaster.error('Error','Only approvers can edit pilot training dates');
    let pilotCopy=JSON.parse(JSON.stringify(this.fullPilot));
    this.pilotModal(pilotCopy,this.pilots);
  }

  parseShortExpDate(expStr){
    if (!expStr) return null;
    let parts=expStr.split('/');
    if (parts.length!==3) return null;
    let year=parseInt(parts[2],10);
    if (year<100) year+=2000;
    return new Date(year,parseInt(parts[0],10)-1,parseInt(parts[1],10));
  }

  isNewBaseMonth(record){
    return record.newBaseMonth===true||record.newBaseMonth==='true';
  }

  computeExpDate(record, expKey, timeframe, options){
    options = options || {};
    let recordDate=new Date(record.date);
    let existingRaw=this.fullPilot[expKey];
    let existingDate=existingRaw?new Date(existingRaw):null;
    let hasExisting=existingDate&&!isNaN(existingDate.getTime());

    if (this.isNewBaseMonth(record)) {
      if (hasExisting&&this.isWithinOneMonth(recordDate, existingDate)) {
        if (!options.preview && !confirm('Are you sure you want to create a new base month? It appears you are within the window.')) {
          return null;
        }
      }
      if (record.baseMonth) {
        let expFromBase=this.getExp(record.baseMonth,record.date,String(timeframe),1);
        let parsedBaseExp=this.parseShortExpDate(expFromBase);
        if (parsedBaseExp) return parsedBaseExp;
      }
      let rebased=new Date(recordDate);
      rebased.setMonth(rebased.getMonth()+timeframe);
      return rebased;
    }

    // Standard recurrent — extend from current expiration, do not rebase from training date.
    if (hasExisting) {
      let extended=new Date(existingDate);
      extended.setMonth(extended.getMonth()+timeframe);
      return extended;
    }
    let initial=new Date(recordDate);
    initial.setMonth(initial.getMonth()+timeframe);
    return initial;
  }

  snapshotPriorExpDates(record){
    if (!record.trainingTypeArray||record.trainingTypeArray.length===0) return {};
    let priorExpDates={};
    record.trainingTypeArray.forEach(type=>{
      const {tab,seat}=this.typeToTab(type);
      const {expKey,expKeyAlt,timeframe}=this.setExp(tab,seat);
      if (timeframe&&expKey&&this.fullPilot[expKey]) {
        priorExpDates[expKey]=this.fullPilot[expKey];
        if (expKeyAlt&&this.fullPilot[expKeyAlt]) priorExpDates[expKeyAlt]=this.fullPilot[expKeyAlt];
      }
    });
    return priorExpDates;
  }

  revertPriorExpDates(priorExpDates){
    if (!priorExpDates||!Object.keys(priorExpDates).length) return;
    this.logRevertExpHistory(priorExpDates);
    let doc={_id:this.pilot._id};
    Object.assign(doc,priorExpDates);
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      Object.assign(this.fullPilot, priorExpDates);
      let index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index], priorExpDates);
      this.toaster.success('Success','Pilot expiration dates reverted');
    }).catch(err=>{
      console.log(err);
      this.toaster.error('Error','Failed to revert pilot expiration dates');
    });
  }
  
  loggedIn(){
    return !!this.bootstrapped;
  }

  canAccessRecords(){
    return this.RotAccess.canAccessRecords(this.user);
  }
  
  cleanObject(p){
    if (!p) return {};
    return {
      _id:p._id,name:p.name,quals:p.quals,removals:p.removals,ratings:p.ratings,other:p.other,otherDescription:p.otherDescription,
      cfi:p.cfi,commercial:p.commercial,atp:p.atp,cert:p.cert,medicalClass:p.medicalClass,medicalDate:p.medicalDate,medicalInterval:p.medicalInterval,
      highMinimumsC208:p.highMinimumsC208,highMinimumsC408:p.highMinimumsC408,highMinimumsC212:p.highMinimumsC212,highMinimumsB190:p.highMinimumsB190,highMinimumsBE20:p.highMinimumsBE20
    };
  }
  
  selectRemoval(row,index){
    if (row.pda==="Clear Selection") {
      if (index||index===0) this.pilot.removals[index]={};
    }
  }
  
  selectPda(row,index){
    if (row.pda==="Clear Selection") {
      if (index||index===0) this.pilot.quals[index]={};
    }
  }
  
  formatDate(dateString){
    let date=new Date(dateString);
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    
    return `${mm}${dd}${yyyy}`;
  }
  
  getDate(file){
    let arr=file.split('_');
    let str=arr[1];
    str=str.slice(0, 2) + '/' + str.slice(2);
    str=str.slice(0, 5) + '/' + str.slice(5);
    return new Date(str).toLocaleDateString();
  }
  
  upDate(key){
    //this.isCollapsed=true;
    if (key==='string') this.date=new Date(this.dateStringFormatted);
    this.dateString=this.date.toLocaleDateString();
    this.dateStringFormatted=this.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'numeric',//''long', 
        day: 'numeric' 
    });
  }
  
  handle(event){
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault(); 
      this.upDate('string');
    }
  }
  
  whichSubs(cat){
    if (cat==='CERT') return this.categories;
    return this.subtabs;
  }
  
  selectTR(){
    if (this.associated&&(this.associated._id===-1||(typeof this.associated.index==='number'&&this.associated.index<0))){
      this.tab='CERT';
      this.subtab=undefined;
    }
  }

  getAssociatedRecord(){
    if (!this.associated||this.associated._id===-1) return null;
    if (typeof this.associated.index==='number'&&this.associated.index>-1) {
      return this.records[this.associated.index]||null;
    }
    if (this.associated._id) {
      const match=this.records.find(r=>r._id===this.associated._id);
      return match||this.associated;
    }
    return null;
  }

  hasAssociatedRecord(){
    const record=this.getAssociatedRecord();
    return !!(record&&record._id);
  }
  
  add(approval){
    if (this.associated&&this.associated._id===undefined) this.associated=undefined;
    if ((!this.tab||!this.subtab)&&!this.hasAssociatedRecord()) return this.toaster.error('Error','Need to select a tab before uploading');
    if (this.tab==='C212'||this.tab==='B190'||this.tab==='C408') {
      if (!this.seat) return this.toaster.error('Error','Need to select PIC or SIC for this aircraft');
    }
    else this.seat=undefined;
    if (!this.pilot||!this.pilot._id) return this.toaster.error('Error','Need to select a pilot in the navbar before uploading');
    const fileInput=this.getUploadFileElement();
    let files=fileInput?Array.from(fileInput.files):[];
    if (files&&files.length>0) {
      let f=files[0];
      let tabArray=[];
      const localAssociated=this.getAssociatedRecord();
      const approveAfterUpload=!!(approval && localAssociated && localAssociated._id);
      if (localAssociated) {
        if (!Array.isArray(localAssociated.trainingTypeArray)||localAssociated.trainingTypeArray.length===0) {
          return this.toaster.error('Error','Need to select some training types within the associated record before uploading');
        }
        localAssociated.trainingTypeArray.forEach(type=>{
          const sub=localAssociated.trainingType.charAt(0).toUpperCase() + localAssociated.trainingType.slice(1).toLowerCase();
          const {tab,seat}=this.typeToTab(type);
          tabArray.push({tab:tab,sub:sub,seat:seat});
        });
      }
      else tabArray=[{tab:this.tab,sub:this.subtab,seat:this.seat}];
      let uploadsPending=tabArray.length;
      const onUploadFinished=()=>{
        uploadsPending--;
        if (uploadsPending<=0) {
          if (approveAfterUpload) {
            const recordIndex=this.records.findIndex(r=>r._id===localAssociated._id);
            this.approve(localAssociated, recordIndex);
          }
          this.timeout(()=>{this.init();},1000);
        }
      };
      for (const obj of tabArray) {
        let filename=this.setFilename(f.name,obj);
        let r=new FileReader();
        r.onerror=()=>{
          console.log('FileReader error for', filename);
          this.toaster.error('Error',filename+' could not be read');
          onUploadFinished();
        };
        r.onloadend=e=>{
          if (!e.target||e.target.result===null||e.target.result===undefined) {
            this.toaster.error('Error',filename+' could not be read');
            onUploadFinished();
            return;
          }
          let encoded;
          try {
            encoded=btoa(e.target.result);
          } catch (err) {
            console.log(err);
            this.toaster.error('Error',filename+' could not be encoded');
            onUploadFinished();
            return;
          }
          this.http.post('/api/rot/uploadRecord',{data:encoded,filename:filename}).then(res=>{
            this.toaster.success('Success',filename+' uploaded successfully');
            if (this.subtab==='Medical') {
              let doc={_id:this.pilot._id};
              doc.medicalDate=this.dateString;
              this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(res=>{
                this.fullPilot.medicalDate=this.dateString;
                let pilotIndex=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
                if (pilotIndex>-1) Object.assign(this.pilots[pilotIndex],doc);
                this.toaster.success('Success','medical updated to '+this.dateString);
                this.init();
              }).catch(err=>{
                console.log(err);
                this.toaster.error('Error','Failed to update medical date');
                onUploadFinished();
              });
            }
            else onUploadFinished();
          }).catch(err=>{
            console.log(err);
            this.toaster.error('Error',filename+' upload failed');
            onUploadFinished();
          });
        };
        r.readAsBinaryString(f);
      }
    }
    else this.toaster.error('Error','Need to finish adding the file first');
  }
  
  updateExp(record){
    const rows=this.buildExpPreviewRows(record);
    if (!rows.length) return;
    this.applyExpUpdates(record, rows);
  }

  buildExpPreviewRows(record){
    const rows=[];
    if (!record||!record.trainingTypeArray||record.trainingTypeArray.length===0) return rows;
    record.trainingTypeArray.forEach(type=>{
      const {tab,seat}=this.typeToTab(type);
      if (!tab) return;
      const {expKey,expKeyAlt,timeframe}=this.setExp(tab,seat);
      if (!timeframe||!expKey) return;
      const newDate=this.computeExpDate(record, expKey, timeframe, {preview:true});
      if (!newDate||isNaN(newDate.getTime())) return;
      const existingRaw=this.fullPilot[expKey];
      const existingDate=existingRaw?new Date(existingRaw):null;
      const hasExisting=existingDate&&!isNaN(existingDate.getTime());
      let action='extend';
      if (this.isNewBaseMonth(record)) action='rebase';
      else if (!hasExisting) action='initial';
      rows.push({
        type:type,
        expKey:expKey,
        expKeyAlt:expKeyAlt,
        newDate:newDate,
        current:existingRaw||'—',
        proposed:newDate.toLocaleDateString(),
        action:action,
        warnEarlier:hasExisting&&newDate<existingDate
      });
    });
    return rows;
  }

  applyExpUpdates(record, rows){
    if (!rows||!rows.length) return;
    const doc={_id:this.pilot._id};
    rows.forEach(row=>{
      const expValue=row.newDate.toLocaleDateString();
      doc[row.expKey]=expValue;
      if (row.expKeyAlt) doc[row.expKeyAlt]=expValue;
      this.logApprovalExpHistory(record,row.expKey,expValue,row.expKeyAlt);
    });
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      this.toaster.success('Success','Pilot Profile Updated');
      rows.forEach(row=>{
        const expValue=row.newDate.toLocaleDateString();
        this.fullPilot[row.expKey]=expValue;
        if (row.expKeyAlt) this.fullPilot[row.expKeyAlt]=expValue;
      });
      const index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index], doc);
    }).catch(err=>{console.log(err)});
  }

  finalizeApproval(record, rows){
    if (!record||!record._id) return;
    const index=this.records.findIndex(e=>e._id===record._id);
    const localRecord=index>-1?this.records[index]:record;
    localRecord.approved=true;
    if (!localRecord.priorExpDates||!Object.keys(localRecord.priorExpDates).length) {
      localRecord.priorExpDates=this.snapshotPriorExpDates(localRecord);
    }
    this.http.post('/api/rot/updateFirebase',{collection:'records',doc:localRecord}).then(res=>{
      if (index>-1) this.records[index]=res.data;
      this.applyExpUpdates(localRecord, rows);
      this.buildRecordsChoice();
    }).catch(err=>{
      console.log(err);
      this.toaster.error('Error','Failed to save approval');
    });
  }

  startApprove(record, index){
    if (!this.isApprover()) return this.toaster.error('Error','Only approvers can approve records');
    if (!record||!record._id) return this.toaster.error('Error','Save the record before approving');
    const localRecord=typeof index==='number'&&index>-1?this.records[index]:record;
    const previewRows=this.buildExpPreviewRows(localRecord);
    if (!previewRows.length) return this.toaster.error('Error','Select training types on this record before approving');
    this.expPreviewModal(localRecord, previewRows, this.pilot.name);
  }
  
  typeToTab(type){
    //['BasicIndoc','Hazmat','far299','far297','far297g','C208PIC','C208TKS','C208Ground','B190PIC','B190SIC','B190Ground','BE20PIC','BE20Ground','C408PIC','C408SIC','C408Ground','C212PIC','C212SIC','C212Ground','CheckAirmanObs','FlightInstructorObs']
    //['CERT','BI','HAZ','INTL','C208G','C408G','C212G','BE20G','B190G','RVSM','293A','C208','C408','C212','BE20','B190','297','297g','299','244','CFIT','FLT-INSTRUCTOR','CHECK-AIRMAN','OTHER-RECORDS'];
    let tab,seat;
    switch (type) {
      case 'FlightInstructorObs':
        tab="FLT-INSTRUCTOR";
        break;
      case 'CheckAirmanObs':
        tab="CHECK-AIRMAN";
        break;
      case 'C212Ground':
        tab="C212G";
        break;
      case 'C212PIC':
        tab="C212";
        seat="PIC";
        break;
      case 'C212SIC':
        tab="C212";
        seat="SIC";
        break;
      case 'C408Ground':
        tab="C408G";
        break;
      case 'C408SIC':
        tab="C408";
        seat="SIC";
        break;
      case 'C408PIC':
        tab="C408";
        seat="PIC";
        break;
      case 'BE20Ground':
        tab="BE20G";
        break;
      case 'BE20PIC':
        tab="BE20";
        break;
      case 'B190Ground':
        tab="B190G";
        break;
      case 'B190SIC':
        tab="B190";
        seat="SIC";
        break;
      case 'B190PIC':
        tab="B190";
        seat="PIC";
        break;
      case 'C208Ground':
        tab="C208G";
        break;
      case 'C208TKS':
        tab="OTHER-RECORDS";
        break;
      case 'BasicIndoc':
        tab="BI";
        break;
      case 'Hazmat':
        tab="HAZ";
        break;
      case 'far299':
        tab="299";
        break;
      case 'far297':
        tab="297";
        break;
      case 'far297g':
        tab="297g";
        break;
      case 'C208PIC':
        tab="C208";
        break;
      default:
        tab=type;
        break;
    }
    return {tab:tab,seat:seat};
  }
  
  isWithinOneMonth(testDate, refDate) {
    if (!refDate) return false;
    testDate=new Date(testDate);
    refDate=new Date(refDate);
    // Create new Date objects to avoid mutating original dates
    const lowerBound = new Date(refDate);
    const upperBound = new Date(refDate);

    // Set boundaries to one month before and after
    lowerBound.setMonth(refDate.getMonth() - 1);
    upperBound.setMonth(refDate.getMonth() + 1);

    // Return true if testDate is within the inclusive range
    return testDate >= lowerBound && testDate <= upperBound;
}
  
  setFilename(filename,obj){
    let fn='';
    let date=this.dateString;
    const associated=this.getAssociatedRecord();
    if (associated) date=associated.date;
    fn=this.pilot._id+'_'+this.formatDate(date)+'_'+obj.tab+'_';
    if (obj.sub) fn+=obj.sub+'_';
    if (obj.seat) fn+=obj.seat+'_';
    if (associated) fn+='associated_'+associated._id+'_';
    fn+=filename;
    return fn;
  }
  
  setExp(tab,seat){
    if (!seat) seat="PIC";
    if (!tab) return {};
    let timeframe,expKey,expKeyAlt;
    switch (tab) {
      case 'CERT':
        timeframe=0;
        break;
      case 'HAZMAT':
        timeframe=24;
        break;
      case 'INTL':
        timeframe=0;
        break;
      case '297':
        timeframe=6;
        break;
      case 'RVSM':
        timeframe=0;
        break;
      case '244':
        timeframe=0;
        break;
      case 'CFIT':
        timeframe=0;
        break;
      case 'FLT-INSTRUCTOR':
        timeframe=24;
        break;
      case 'CHECK-AIRMAN':
        timeframe=24;
        break;
      case 'OTHER-RECORDS':
        timeframe=12;
        break;
      default:
        timeframe=12;
        break;
    }
    expKey='';
    if (timeframe===0) {
      return;
    }
    switch (tab) {
      case 'BI':
        expKey='BasicIndocExp';
        expKeyAlt='far293a148';
        break;
      case 'HAZ':
        expKey='HazmatExp';
        break;
      case 'FLT-INSTRUCTOR':
        expKey='FlightInstructorObsExp';
        break;
      case 'CHECK-AIRMAN':
        expKey='CheckAirmanObsExp';
        break;
      case 'OTHER-RECORDS':
        expKey='C208TKSExp';
        break;
      default:  
        if (/^\d/.test(tab)) {
          //first character is an integer
          expKey='far' + tab + 'Exp';
          break;
        }
        if (tab.at(-1)==="G") {
          //All the ground currency tabs
          expKey=tab+'roundExp';
          expKeyAlt=tab+'OSExp';
          break;
        }
        if (tab.substring(0,1)==="C"||tab.substring(0,1)==="B") {
          expKey=tab + seat + 'Exp';
          break;
        }
    }
    return {timeframe:timeframe,expKey:expKey,expKeyAlt:expKeyAlt};
  }
  
  getPilotsFiles(){
    this.singleLineEntry=[];
    this.tabs.forEach(tab=>{
      this.singleLineEntry.push({tab:tab,lines:[]});
    });
    this.files.forEach(filename=>{
      //populate SLE
      let type,inst,associated,date;
      const arr=filename.split('_');
      const index=this.tabs.indexOf(arr[2]);
      if (index>-1){
        type=arr[3];
        if (arr[4]==='PIC'||arr[5]==='SIC') type+=' '+arr[4];
        arr.forEach((str,i)=>{
          if (str==="associated") associated=arr[i+1];
        });
        let recordsIndex=-1;
        if (this.records) recordsIndex=this.records.map(e=>e._id).indexOf(associated);
        if (recordsIndex>-1) {
          if (this.records[recordsIndex].checkAirman) inst=this.records[recordsIndex].checkAirman;
          if (this.records[recordsIndex].instructor) inst=this.records[recordsIndex].instructor;
        }
        if (arr[1]&&typeof arr[1]==='string'&&arr[1].length>4) date=arr[1].substring(0,2)+'/'+arr[1].substring(2,4)+'/'+arr[1].slice(4);
        this.singleLineEntry[index].lines.push({name:this.pilot.name,cert:this.pilot.cert,date:date,type:type,inst:inst});
      }
      
      //get the file
      this.http({ url: "/api/rot/files/records?filename=" + filename,
          method: "GET", 
          responseType: 'arraybuffer' })
        .then(response=> {
          let obj={type:'application/pdf'};
          if (filename.split('.')[filename.split('.').length-1]!=='pdf') obj={type:'image/jpeg'};
  		    let blob = new Blob([response.data],obj);
  		    let arr=filename.split('.');
  		    let type='image';
  		    if (arr[arr.length-1]==='pdf') type='pdf';
  		    this.fullFiles.push({filename:filename,date:new Date(this.getDate(filename)),type:type,urlMain:URL.createObjectURL(blob)});
        });
    });  
  }
  
  filePreviewUrl(file) {
    if (!file || !file.urlMain) return '';
    return file.type === 'pdf' ? file.urlMain + '#navpanes=0' : file.urlMain;
  }

  filenamePrompt(filename){
    let newName = prompt('What would you like to change the filename to for ' + filename + '?',filename);
    if (newName&&newName!==filename) {
      this.http.post('/api/rot/changeFilename',{filename:filename,newName:newName}).then(res=>{
        console.log(res.data);
        this.toaster.success('Success','Filename Updated');
        this.init();
      })
      .catch(err=>{
        console.log(err);
        this.toaster.error('Error','Unable to update filename');
      });
    }
  }
  
  downloadFile(filename){
    this.http({ url: "/api/rot/files/records?filename=" + filename,
          method: "GET", 
          responseType: 'arraybuffer' })
        .then(response=> {
  		    let blob = new Blob([response.data]);
  	      saveAs(blob, filename);
        }).catch(err=>{
          this.toaster.error('Error',"File Not Found");
          console.log(err);
          this.loading=false;
        });
  }
  
  deleteFile(filename){
    let answer=confirm("Are you sure you want to delete this file?");
    if (answer) {
      this.http.post('/api/rot/deleteRecord',{filename:filename}).then(res=>{
        this.toaster.warning('Warning','Record has been deleted');
        console.log(res.data);
        this.init();
      });
    }
  }
  
  savePilotAssignment(){
    let arr=JSON.parse(JSON.stringify(this.pilot.quals));
    let indexesToRemove=[];
    for (let [index,row] of arr.entries()){
      if (!row.pda) indexesToRemove.push(index);
    }
    let filtered = this.pilot.quals.filter((_, index) => !indexesToRemove.includes(index));
    this.pilot.quals = filtered;
    if (this.pilot.removals) {
      this.pilot.removals.forEach(removal=>{
        if (removal.permanent) removal.locked=true;
      });
    }
    console.log(this.pilot)
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:this.pilot}).then(res=>{
      let index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index], this.pilot );
      let navIndex=this.scope.$root.nav.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (navIndex>-1) this.scope.$root.nav.pilots[navIndex]=this.pilots[index];
      console.log(this.scope.$root.nav.pilots)
      this.toaster.success('Success','Pilot '+this.pilot.name+' is updated');
    }).catch(err=>{console.log(err)});
  }
  
  seatArray(cat){
    if (cat==="B190"||cat==="C212"||cat==="C408") return ['PIC','SIC'];
    return [null];
  }
  
  filterCheck(cat,sub,seat){
    let array=this.categoryFilter(this.fullFiles,cat,sub,seat);
    return array.length>0;
  }
  
  update(record,index){
    if (!record.trainingTypeArray||record.trainingTypeArray.length===0) return this.toaster.error('Error','You Need to Select at least one training type before saving');
    if (record.checkAirman&&(!record.aircraft||record.aircraft==='none')) return this.toaster.error('Error','An aircraft has to be selected if the event is a checkride');
    record.dateObj=new Date(record.date);
    console.log(record)
    //create or update record in firebase, if it was a new record, unshift a new new one
    this.http.post('/api/rot/updateFirebase',{collection:'records',doc:record}).then(res=>{
      this.toaster.success('Success','Record is Updated');
      const id=record._id;
      this.records[index]=res.data;
      if (!id) this.records.unshift(this.createNewRecord());
      this.enrichRecords();
      this.buildRecordsChoice();
    });
  }
  
  createNewRecord(){
    let nr=JSON.parse(JSON.stringify(this.fullPilot));
    let newObj={name:this.fullPilot.name,pilotNumber:this.fullPilot._id,dateObj:new Date(),date:new Date().toLocaleDateString(),newBaseMonth:'false',baseMonthManual:false,trainingType:'recurrent',baseMonth:new Date().toLocaleString('default', { month: 'long' })};
    Object.assign(nr, newObj );
    delete nr._id;
    return nr;
  }
  
  //Upload PDF File and approve the record selected as this.associated
  approve(r,i){
    const record=r||this.getAssociatedRecord();
    if (!record||!record._id) return this.toaster.error('Error','Cannot save this approval for this record, not finding it in my list of records!');
    const index=typeof i==='number'?i:this.records.findIndex(e=>e._id===record._id);
    this.startApprove(record, index);
  }
  
  delete(record,index){
    if (!record._id) return alert('No ID associated with this record, nothing to delete in Firestore');
    let revertExp=false;
    if (record.approved&&record.priorExpDates&&Object.keys(record.priorExpDates).length) {
      revertExp=confirm('This record was approved and updated pilot expiration dates. Also revert those expiration dates to their values before this record was approved?');
    }
    const priorExpDates=revertExp?record.priorExpDates:null;
    //remove record from firebase and update local array
    this.http.post('/api/rot/deleteFirebase',{id:record._id}).then(res=>{
      this.toaster.warning('Warning','Record has been deleted');
      this.records.splice(index,1);
      this.buildRecordsChoice();
      if (priorExpDates) this.revertPriorExpDates(priorExpDates);
    })
    .catch(err=>{console.log(err)});
  }
  
  quarterlyReport(quarter,year){
    
    quarter=quarter||this.quarter||1;
    year = year||this.year||new Date().getFullYear();
    let records=[];
    let startMonth=1;
    if (quarter>1) {
      startMonth=(quarter-1)*3+1;
    }
    let endMonth=startMonth+2;
    if (year.length===2) year ='20'+year;
    let startDate=new Date(startMonth+'/1/'+year);
    startDate.setHours(0, 0, 0, 0); 
    const today = new Date(endMonth+'/1/'+year);
    let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endDate.setHours(23, 0, 0, 0); 
    let query={collection:'records',parameter:'dateObj',operator:'>=',value:startDate,parameter2:'dateObj',operator2:'<=',value2:endDate,timestampBoolean:false};
    
    this.http.post('/api/rot/firebaseQuery',query).then(res=>{
      let header=["Date","Pilot","Certificate Number","Aircraft",
            "135.293a", "135.293b", "135.297", "135.297g", "135.299",
            "Initial Recurrent","Check Airman","Pass Fail","Additional Instruction Given","outcome"];
      res.data.forEach(r=>{
        if (!r.checkAirman||r.checkAirman==='none') return;
        let obj={Date:r.date,Pilot:r.name,"Certificate Number":r.cert,Aircraft:r.aircraft,
            "135.293a":"", "135.293b":"", "135.297":"", "135.297g":"", "135.299":"",
            "Initial Recurrent":r.trainingType,"Pass Fail":r.result,
            "Check Airman":r.checkAirman,"Additional Instruction Given":r.additionalInstruction||"None",outcome:r.outcome||""
        };
        if (r[r.aircraft+'PIC']||r[r.aircraft+'SIC']||r[r.aircraft]) {
          obj["135.293a"]='2,3';
          obj["135.293b"]='X';
        }
        if (r.far297) obj["135.297"]="X";
        if (r.far297g) obj["135.297g"]="X";
        if (r.far299) obj["135.299"]="X";
        if (!r.result) obj["Pass Fail"]="Satisfactory";
        records.push(obj);
      }); 
      this.http({ url: "/api/rot/files/pdfs?filename=quarterly.xlsx", 
        method: "GET", 
        headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, //'text/plain'
        responseType: 'arraybuffer' })
      .then(response=> {
        //response.data is the arraybuffer
        const workbook = XLSX.read(response.data, { type: "array", cellStyles: true, cellNF: true, cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const mergeRange = { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } };
        const mergeRange1 = { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }; 
        const mergeRange2 = { s: { r: 2, c: 4 }, e: { r: 2, c: 8 } }; 
        worksheet['!merges'] = [mergeRange,mergeRange1,mergeRange2];
        for (let r = mergeRange.s.r; r <= mergeRange.e.r; r++) {
          for (let c = mergeRange.s.c; c <= mergeRange.e.c; c++) {
        
            // Convert indexes (0, 0) into Excel standard notation keys ("A1")
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            
            // Initialize cell structure
            worksheet[cellRef] = {
                t: 's',
                v: (r === mergeRange.s.r && c === mergeRange.s.c) ? "Bering Air" : "", // Data only in top-left
                s: {
                    font: { name: "Cambria", sz: 20, bold: true, underline:true, italic:true, color: { rgb: "000000" } },
                    fill: { patternType: "solid", fgColor: { rgb: "fbfb00" } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {},
                    numFmt: "$#,##0.00"
                }
            };
    
            // Construct outer border perimeter piece-by-piece
            if (r === mergeRange.s.r) worksheet[cellRef].s.border.top = { style: "thin", color: { rgb: "FF000000" } };
            if (r === mergeRange.e.r) worksheet[cellRef].s.border.bottom = { style: "thin", color: { rgb: "FF000000" } };
            if (c === mergeRange.s.c) worksheet[cellRef].s.border.left = { style: "thin", color: { rgb: "FF000000" } };
            if (c === mergeRange.e.c) worksheet[cellRef].s.border.right = { style: "thin", color: { rgb: "FF000000" } };
          }
        }
        for (let r = 2; r <= 3; r++) {
          for (let c = 0; c <= 13; c++) {
        
            // Convert indexes (0, 0) into Excel standard notation keys ("A1")
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            if (!worksheet[cellRef]||!worksheet[cellRef].v) worksheet[cellRef]={t:'s',v:''};
            // Initialize cell structure
            worksheet[cellRef].s= {
                    font: { name: "Arial", sz: 10, bold: false, underline:false, color: { rgb: "000000" } },
                    fill: { patternType: "solid", fgColor: { rgb: "bebebe" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {left : { style: "thin", color: { rgb: "FF000000" } },right : { style: "thin", color: { rgb: "FF000000" } }},
                    numFmt: "$#,##0.00"
                };
            if (c>=4&&c<=8){
              if (r===2) worksheet[cellRef].s.border={bottom : { style: "thin", color: { rgb: "FF000000" } }}; 
              if (r===3) worksheet[cellRef].s.border.top={ style: "thin", color: { rgb: "FF000000" } };
            }
            
          }
        }
        for (let r = mergeRange1.s.r; r <= mergeRange1.e.r; r++) {
          for (let c = mergeRange1.s.c; c <= mergeRange1.e.c; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            worksheet[cellRef] = {
                t: 's',
                v: (r === mergeRange.s.r && c === mergeRange.s.c) ? "Check Airman Quarterly Report" : "", // Data only in top-left
                s: {
                    font: { name: "Arial", sz: 10, bold: false, underline:false, color: { rgb: "000000" } },
                    fill: { patternType: "solid", fgColor: { rgb: "fb9700" } },
                    alignment: { horizontal: "left", vertical: "center" },
                    numFmt: "$#,##0.00"
                }
            };
          }
        }
        XLSX.utils.sheet_add_json(worksheet, records, { header: header,origin:"A5",skipHeader:true });
        worksheet['A2'].v = 'Check Airman Quarterly Report ' + year + ' Quarter ' + quarter;
        //center all appended cells
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        for (let R = 4; R <= range.e.r; ++R) {
          for (let C = 0; C <= 13; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
            
            // Check if the cell exists before applying styles
            if (!worksheet[cellAddress]) worksheet[cellAddress]={t:'s',v:''};
            worksheet[cellAddress].s = {
              font: { name: "Arial", sz: 10, bold: false, underline:false, color: { rgb: "000000" } },
              alignment: { horizontal: "center", vertical: "center" },
              border:{
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          }
        }
        XLSX.writeFile(workbook,"CheckAirmanQuarterly_8E_"+year+"_"+quarter+".xlsx", { cellStyles: true });
      });
    });
  }
  
  isItDisabled(button){
    if (this.loading) return true;
    if (button&&button==='approve') return !this.isApprover();
    return false;
  }
  
  newRecordClass(record){
    if (!record._id) return "darkBackground";
    if (!record.approved) return "blueBackground";
    return "approvedBackground";
  }
  
  displayArray(record){
    if (!record) return "No Type Selected";
    let result="";
    if (record.trainingTypeArray&&record.trainingTypeArray.length>0) {
      record.trainingTypeArray.forEach((type,index)=>{
        if (index>0) result+=", ";
        result+=type;
      });
    }
    else return "No Type Selected";
    return result;
  }
  
  enrichRecords(){
    this.records.forEach(record=>{
      if (this.fullPilot&&this.fullPilot._id){
        if (!record.dateOfBirth) record.dateOfBirth=this.fullPilot.dateOfBirth;
        if (!record.medicalDate) record.medicalDate=this.fullPilot.medicalDate;
        if (!record.medicalClass) record.medicalClass=this.fullPilot.medicalClass;
        if (!record.medicalInterval) record.medicalInterval=this.fullPilot.medicalInterval;
        if (!record.cert) record.cert=this.fullPilot.cert;
        if (!record.certType) record.certType=this.fullPilot.certType;
        if (!record.name) record.name=this.fullPilot.name;
        record.trainingTypeCombo=record.trainingType + ' ' + record.flightOrGround;
        record.trainingTypeArray=[];
        this.appConfig.trainingEventKeys.forEach(key=>{
          if (record[key]&&record[key]==="true") {
            if (key.slice(0,3)==="far") key=key.substring(3);
            record.trainingTypeArray.push(key);
          }
        });
      }
    });
  }

  buildRecordsChoice(){
    this.recordsChoice=this.records.map((record,index)=>{
      const display=this.displayArray(record);
      return {
        _id:record._id,
        display:display,
        date:record.date,
        index:index
      };
    });
    if (this.recordsChoice.length) {
      this.recordsChoice[0]={_id:-1,display:"UPLOAD A CERT",date:'',index:-1};
    }
    this.uploadRecordChoices=this.records
      .map((record,index)=>({
        _id:record._id,
        display:this.displayArray(record),
        date:record.date,
        index:index,
        approved:record.approved
      }))
      .filter(choice=>choice._id);
    if (this.isApprover()&&this.recordsChoice.length) {
      this.uploadRecordChoices.unshift(this.recordsChoice[0]);
    }
    if (this.associated&&this.associated._id&&this.associated._id!==-1) {
      const choice=this.recordsChoice.find(c=>c._id===this.associated._id);
      if (choice) this.associated=choice;
    }
  }

  refreshRecords(){
    this.enrichRecords();
    this.records.sort((a,b)=>{
      return new Date(b.date) - new Date(a.date);
    });
    this.records.unshift(this.createNewRecord());
    this.buildRecordsChoice();
  }
  
  tweakDate(date) {
    return new Date(date).toLocaleDateString();
  }
  
  dobBlur(id) {
    var index = this.pilotsOld.map(e => e._id).indexOf(id);
    this.pilotsOld[index].dateOfBirth=this.tweakDate(this.pilotsOld[index].dateOfBirth);
  }
  
  medBlur(id) {
    var index = this.pilotsOld.map(e => e._id).indexOf(id);
    this.pilotsOld[index].medicalDate=this.tweakDate(this.pilotsOld[index].medicalDate);
  }
  
  isItLoading(){
    return this.loading;
  }
  
  keysToString(o){
    return JSON.stringify(o);
  }
  
  getExp(baseMonthString,recordDateString,frequencyString,skew){
    let index=this.months.indexOf(baseMonthString);
    let baseMonthInt;
    if (index===-1) {
      return "";
    } else baseMonthInt=index+skew;
    if (baseMonthInt===13) baseMonthInt=1;
    let dateArray=recordDateString.split('/');
    let month=parseInt(dateArray[0],10);//it comes from string, so its 1-12, there is no zero
    let year=parseInt(dateArray[2],10);
    let nextYear=year+1;
    let yearAfter=year+2;
    let nextBaseMonth=baseMonthInt;
    let nextBaseYear=nextYear;
    if (frequencyString==='6'){
      if (baseMonthInt<7){
        nextBaseMonth+=6;
        nextBaseYear=year;
        //if ((baseMonthInt===1||baseMonthInt===2)&&(month=11||month===12)) nextBaseYear=nextYear;
      }
      else {
        nextBaseMonth-=6;
        nextBaseYear=nextYear;
      }
    }
    else {
      if ((baseMonthInt===1||baseMonthInt===2)&&(month===11||month===12)){
        nextBaseYear=yearAfter;
      }
    }
    if (frequencyString==='24') nextBaseYear++;
    let arr=new Date(nextBaseYear,nextBaseMonth,0).toLocaleDateString().split('/');
    if (arr.length===3) return arr[0]+'/'+arr[1]+'/'+arr[2].substring(2);
  }
  
  pdf(record,PDFFileName) {
      let id=record._id;
      this.update(record);
      //spin buttons
      this.loading=true;
      //
      let index = this.records.map(e => e._id).indexOf(id);
      let pilot = this.records[index];
      if (!pilot||!pilot.date) return this.toaster.error('Error','Check this records for completeness before loading a form from it');
      let certType = "ATP/";
      if (pilot.certType&&pilot.certType.toUpperCase()!="ATP"&&pilot.certType.toUpperCase()!="ATP/") certType="COMM/";
      let medClass="FIRST";
      if (pilot.medicalClass&&pilot.medicalClass.toUpperCase()!=="FIRST") medClass="SECOND";
      let trainingClass;
      if (pilot.trainingTypeCombo) trainingClass=pilot.trainingTypeCombo.split(' ')[0].toUpperCase();
  		let dateObj = pilot.date;//new Date(pilot.date).toLocaleDateString();
  		let dateArray=dateObj.split('/');
	    let m, month, day, year;
	    let exps=[];
	    if (dateArray.length>=3) {
        month = dateArray[0];
        day = dateArray[1];
        year = dateArray[2];
	    }
	    this.suffices.forEach((suffix,suffixIndex)=>{
	      
	      m = month;//this.months.indexOf(pilot[suffix]);
	      let expM;
	      let nextYear=parseInt(year,10)+1;
	      let yearAfter=parseInt(year,10)+2;
	      if (suffix==="base297"){
	        if (m>5) {
	          expM=m-6;
	          exps.push(expM + '/' + nextYear);//this.months[expM] + ' ' + nextYear);
	        }
	        else {
	          expM=m+8;
	          exps.push(expM + '/' + year);//this.months[expM] + ' ' + year);
	        }
	      }
	      else {
  	      if (m===11) {
  	        expM = 1;
  	        exps.push(expM + '/' + nextYear);//this.months[expM] + ' ' + nextYear);
  	      }
  	      else {
  	        expM = m+2;
	          exps.push(expM + '/' + nextYear);//this.months[expM] + ' ' + nextYear);
  	      }
	      }
	    });
	    let nbm="NO"
	    if (pilot.newBaseMonth==="true") {
	      pilot.baseMonth=new Date(dateObj).toLocaleString('default', { month: 'long' })
	      nbm="YES";
	    }
	    let pilotIndex = this.pilots.map(e => e.name).indexOf(pilot.instructor);
	    if (pilotIndex>-1) pilot.instructorCert=this.pilots[pilotIndex].cert;
	    else pilot.instructorCert="";
      var fields={"Cert Type1":[certType],
                  "CertType":[certType],
                  "Pilots Name":[pilot.name],
                  "Date of Birth":[pilot.dateOfBirth],
                  "Cert Number":[pilot.cert],
                  "Medical Class":[medClass],
                  "Medical EXP":[pilot.medicalDate],
                  "Date of Check":[dateObj],
                  "Check Airman":[pilot.checkAirman],
                  "Check Airman Cert #":[pilot.checkAirmanCert],
                  "Group44":["44"],
                  "44":"X",
                  "BaseMonth":[pilot.baseMonth.toUpperCase()],
                  "NewBaseMonth":[nbm],
                  "Group24":["X"],
                  "Text1":[pilot.instructor+'/'+pilot.instructorCert]
      };
      if (PDFFileName!=="ROT") fields.Dropdown19=[trainingClass];
      //this.formTypes.forEach(form=>{
        //if (form.radio) {
          let fieldName,frequency,eventIndex;
          //switch (form.label) {
            if (pilot.BasicIndoc&&pilot.BasicIndoc==="true") {//"Basic Indoc": 
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('BasicIndoc');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              fieldName = "Check Box1";
              fields[fieldName]=["X"];
              fields.Dropdown2=[pilot.baseMonth.toUpperCase()];
              fieldName="BI TEST EXPIRATION";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
              fieldName="Instructor 1";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown1=["S"];
              fieldName="Date1_af_date";
              fields[fieldName]=[dateObj];
              fieldName="Instructor 2";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown2=["S"];
              fieldName="Date2_af_date";
              fields[fieldName]=[dateObj];
            }
            if ((pilot.C208Ground&&pilot.C208Ground==="true")||
                    (pilot.C408Ground&&pilot.C408Ground==="true")||
                    (pilot.B190Ground&&pilot.B190Ground==="true")||
                    (pilot.BE20Ground&&pilot.BE20Ground==="true")||
                    (pilot.C212Ground&&pilot.C212Ground==="true")
                    ){
              frequency='12';
              fieldName="Instructor 8";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown8=["S"];
              fieldName="Date8_af_date";
              fields[fieldName]=[dateObj];
              fieldName="Instructor 9";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown9=["S"];
              fieldName="Date9_af_date";
              fields[fieldName]=[dateObj];
            }
            if ((pilot.C208PIC&&pilot.C208PIC==="true")||
                    (pilot.C408PIC&&pilot.C408PIC==="true")||
                    (pilot.C408SIC&&pilot.C408SIC==="true")||
                    (pilot.B190PIC&&pilot.B190PIC==="true")||
                    (pilot.B190SIC&&pilot.B190SIC==="true")||
                    (pilot.BE20PIC&&pilot.BE20PIC==="true")||
                    (pilot.C212PIC&&pilot.C212PIC==="true")||
                    (pilot.C212SIC&&pilot.C212SIC==="true")
                    ){
              frequency='12';
              fieldName="AC ORAL/WRITTEN EXP";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
              fields.Dropdown3=[pilot.baseMonth.toUpperCase()];
              fieldName = "Check Box2";
              fields[fieldName] =["X"];
              fieldName="293 EXP";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
              fields.Dropdown4=[pilot.baseMonth.toUpperCase()];
              fieldName = "Check Box3";
              fields[fieldName] =["X"];
              fieldName="Instructor 10";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown10=["S"];
              fieldName="Date10_af_date";
              fields[fieldName]=[dateObj];
            }
            if ((pilot.C208PIC&&pilot.C208PIC==="true")||
                  (pilot.C408PIC&&pilot.C408PIC==="true")||
                  (pilot.C212PIC&&pilot.C212PIC==="true")||
                  (pilot.B190PIC&&pilot.B190PIC==="true")||
                  (pilot.BE20PIC&&pilot.BE20PIC==="true")
                  ){
              fieldName="Check Box7";
              fields[fieldName]=["X"];
            }
            if ((pilot.C408SIC&&pilot.CS08PIC==="true")||
                  (pilot.C212SIC&&pilot.C212SIC==="true")||
                  (pilot.B190SIC&&pilot.B190SIC==="true")
                  ){
              fieldName="Check Box8";
              fields[fieldName]=["X"];
            }
            if ((pilot.C208PIC&&pilot.C208PIC==="true")||(pilot.C208Ground&&pilot.C208Ground==="true")){
              fieldName="AC Type";
              fields[fieldName]=["C208"];
              fields.Dropdown26=["C208"];
              //fields.Dropdown17=["C208"];
              fields.Dropdown25=["C208"];
            }
            if ((pilot.BE20PIC&&pilot.BE20PIC==="true")||(pilot.BE20Ground&&pilot.BE20Ground==="true")){
              fieldName="AC Type";
              fields[fieldName]=["BE20"];
              fields.Dropdown25=["BE20"];
              fields.Dropdown26=["BE20"];
              //fields.Dropdown17=["BE20"];
            }
            if ((pilot.B190PIC&&pilot.B190PIC==="true")||(pilot.B190SIC&&pilot.B190SIC==="true")||(pilot.B190Ground&&pilot.B190Ground==="true")){
              fieldName="AC Type";
              fields[fieldName]=["B190"];
              fields.Dropdown25=["B190"];
              fields.Dropdown26=["B190"];
              //fields.Dropdown17=["B190"];
            }
            if ((pilot.C408PIC&&pilot.C408PIC==="true")||(pilot.C408SIC&&pilot.C408SIC==="true")||(pilot.C408Ground&&pilot.C408Ground==="true")){
              fieldName="AC Type";
              fields[fieldName]=["C408"];
              fields.Dropdown25=["C408"];
              fields.Dropdown26=["C408"];
              //fields.Dropdown17=["C408"];
            }
            if ((pilot.C212PIC&&pilot.C212PIC==="true")||(pilot.C212SIC&&pilot.C212SIC==="true")||(pilot.C212Ground&&pilot.C212Ground==="true")){
              fieldName="AC Type";
              fields[fieldName]=["C212"];
              fields.Dropdown25=["C212"];
              fields.Dropdown26=["C212"];
              //fields.Dropdown17=["C212"];
            }
            if (pilot['far299']&&pilot['far299']==="true") {//case "293(b) & 299": 
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far299');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              fieldName = "Check Box6";
              fields[fieldName] =["X"];
              fields.Dropdown4=[pilot.baseMonth.toUpperCase()];
              fields.Dropdown7=[pilot.baseMonth.toUpperCase()];
              fieldName="299 Enroute Check EXP";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
            }
            if (pilot['far297g']&&pilot['far297g']==="true") {//case "297":
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far297g');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency; 
              fieldName="297(G) Autopilot EXP";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
              fields.Dropdown6=[pilot.baseMonth.toUpperCase()];
              fieldName = "Check Box5";
              fields[fieldName]=["X"];
            }
            if (pilot['far297']&&pilot['far297']==="true") {//case "297":
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far297');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency; 
              fieldName = "Check Box4";
              let i=this.months.indexOf(pilot.baseMonth);
              if (i<6) i+=6;
              else i-=6;
              fields.Dropdown5=[this.months[i].toUpperCase()];
              fields[fieldName]=["X"];
              fieldName="297 EXP";
              fields[fieldName]=[this.getExp(pilot.baseMonth,dateObj,frequency,1)];
            }
            if (pilot.Hazmat&&pilot.Hazmat==="true") {//case "HAZMAT":
              fieldName="Instructor 3";
              fields[fieldName]=[pilot.instructor];
              if (PDFFileName==="ROT") fields.Dropdown3=["S"];
              fieldName="Date3_af_date";
              fields[fieldName]=[dateObj];
            }
            //default:
            //  break;
          //}
        
      console.log(fields);
      //return;
      this.http({ url: "/api/rot/files/pdfs?filename=" + PDFFileName + ".pdf", 
          method: "GET", 
          headers: { 'Accept': 'application/pdf' }, //'text/plain'
          responseType: 'arraybuffer' })
        .then(response=> {
          var filled_pdf; // Uint8Array
  		    filled_pdf = pdfform().transform(response.data, fields);
  		    //console.log(pdfform().list_fields(response.data));
  		    var blob = new Blob([filled_pdf], {type: 'application/pdf'});
  		    
  		    var filename=PDFFileName + "_" + pilot.name + '_' + year + '_' + month + '_' + day + '.pdf';
  	      saveAs(blob, filename);
  	      //unspin buttons
  	      this.loading=false;
  	      //
        }).catch(err=>{
          alert(err);
          console.log(err);
          this.loading=false;
        });
    }
}

angular.module('workspaceApp')
  .filter('monthYear', () => {
    return function(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('/');
      if (parts.length !== 3) return dateStr;
      const date = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      if (isNaN(date.getTime())) return dateStr;
      const month = date.toLocaleString('default', { month: 'short' });
      return month + '-' + date.getFullYear();
    };
  })
  .filter('recordFilter',()=>{
    return function(input, showApproved) {
      if (!input||!Array.isArray(input)) return [];
      if (showApproved) return input;
      return input.filter(record=>{
        if (!record._id) return true;
        return !record.approved;
      });
    };
  })
  .filter('categoryFilter',()=>{
    return function(input, cat, sub, seat) {
      if (!input||!Array.isArray(input)) return [];
      
      if (seat) {
        return input.filter(item => {
          let arr=item.filename.split('_');
          if (arr[4]!=="PIC") arr[4]="SIC";
          return arr[2]===cat&&arr[3]===sub&&arr[4]===seat;
        });
      }
      
      if (sub) {
        return input.filter(item => {
          let arr=item.filename.split('_');
          return arr[2]===cat&&arr[3]===sub;
        });
      }
      
      return input.filter(item => {
          let arr=item.filename.split('_');
          return arr[2]===cat;
        });
    };
  })
  .component('rotRecords', {
    templateUrl: 'app/rot/records/records.html',
    controller: RecordsComponent,
    controllerAs: 'rotRecords'
  });

})();
