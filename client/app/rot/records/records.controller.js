'use strict';

(function(){

class RecordsComponent {
  constructor($scope,$timeout,$interval,$http,rotAppConfig,rotFlightTestItems,Modal,categoryFilterFilter,$state,Auth,RotPilotContext,RotAccess,rotPilotExpDate) {
    this.categoryFilter=categoryFilterFilter;
    this.appConfig=rotAppConfig;
    this.rotFlightTestItems=rotFlightTestItems;
    this.Auth=Auth;
    this.RotAccess=RotAccess;
    this.RotPilotContext=RotPilotContext;
    this.rotPilotExpDate=rotPilotExpDate;
    this.Modal=Modal;
    this.http=$http;
    this.timeout=$timeout;
    this.interval=$interval;
    this.scope=$scope;
    this.state=$state;
    this.nNumbers=[];
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
    this.unaffiliatedRotSub='Unaffiliated';
    this.unaffiliatedRotTab='BI';
    this.unaffiliatedLabel='';
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
        if (!this.records[recordIndex].eventResult || typeof this.records[recordIndex].eventResult !== 'object') {
          this.records[recordIndex].eventResult={};
        }
        for (let key in this.records[recordIndex]) {
          if (this.appConfig.trainingEventKeys.indexOf(key)<0) continue;
          if (this.records[recordIndex][key]&&typeof this.records[recordIndex][key]=="boolean") {
            this.records[recordIndex][key]="true";
            if (this.records[recordIndex].trainingTypeArray.indexOf(key)<0) {
              this.records[recordIndex].trainingTypeArray.push(key);
            }
            if (!this.records[recordIndex].eventResult[key]) this.records[recordIndex].eventResult[key]='S';
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
            if (this.records[recordIndex].eventResult) delete this.records[recordIndex].eventResult[key];
          }
        }
        this.enrichRecords();
        this.buildRecordsChoice();
      });
      this.expPreviewModal = this.Modal.confirm.expPreview((record, rows) => {
        this._expPreviewOpen = false;
        if (record&&record._certMedicalPreview) {
          this.finalizeCertMedicalPreview(rows);
          return;
        }
        this.finalizeApproval(record, rows);
      });
      this.flightTestItemsModal = this.Modal.confirm.flightTestItems((record, grades) => {
        record.flightTestItems = {};
        Object.keys(grades||{}).forEach(n=>{
          record.flightTestItems[String(n)]=grades[n];
        });
        this.rotFlightTestItems.rebuildRemarks(record);
        this.persistRecord(record, this.records.indexOf(record), {skipNewRow:true, silent:true}).then(saved => {
          if (this._pendingPdfName) {
            const name=this._pendingPdfName;
            this._pendingPdfName=null;
            this.loading=true;
            this.generatePdf(saved||record, name);
          }
        }).catch(err=>{
          this.loading=false;
          this.persistRecordError(err);
        });
      });
      this.pilotModal = this.Modal.confirm.pilotData(formData =>{
        if (!formData||!formData.name) {
          this.quickModal('Try again to enter the pilot data');
          return;
        }
        if (formData._id) {
          this.logManualExpHistoryChanges(formData);
          this.logManualCertDocHistoryChanges(formData);
          const doc=this.pilotProfileWriteDoc(formData);
          doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
          this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
            this.toaster.success('Success','Pilot training dates updated');
            let pilotIndex = this.pilots.map(e => e._id).indexOf(formData._id);
            if (pilotIndex>-1) Object.assign(this.pilots[pilotIndex], doc);
            if (this.fullPilot&&this.fullPilot._id===formData._id) {
              Object.assign(this.fullPilot, doc);
              this.pilot=this.cleanObject(this.fullPilot);
            }
          }).catch(err=>{
            console.log(err);
            this.toaster.error('Error','Failed to update pilot training dates');
          });
        }
      });
  }
  
  $onInit(){
    this.fullPilot={};
    this.showTable=true;
    this.showApproved=false;
    this.showSLEArray=[];
    this.bootstrapped=false;
    this.rotAircraft=[];
    this.nNumbers=[];
    this.date=new Date();
    this.upDate();
    this.loadRotAircraftFleet();
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
            if (newVal && (!oldVal || oldVal._id !== newVal._id)) this.init();
          }
        );
        this.scope.$watch(
          () => {
            const list = this.RotPilotContext.getPilots();
            return list.map(p => p._id).join(',');
          },
          () => { this.pilots = this.RotPilotContext.getPilots(); }
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
        this.unaffiliatedLabel='';
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

  /** #45 — medical expiration (same rules as pilot board; no FIRST→SECOND revert UI). */
  computeMedicalExpiration(pilot){
    pilot=pilot||this.fullPilot;
    if (!pilot||!pilot.medicalDate) return null;
    const dateString=pilot.medicalDate;
    const medClass=pilot.medicalClass;
    let duration=6;
    if (medClass==='SECOND') duration=12;
    let age=50;
    if (pilot.dateOfBirth&&pilot.dateOfBirth!==''&&window.moment) {
      age=window.moment(dateString).diff(new Date(pilot.dateOfBirth),'years',true);
    }
    if (age&&age<40&&age!==0) {
      duration=12;
      if (medClass==='SECOND') duration=12;
    }
    if (pilot.medicalInterval&&Number.isInteger(pilot.medicalInterval*1)) {
      duration=pilot.medicalInterval*1;
    }
    let expDate;
    if (window.moment) {
      expDate=window.moment(new Date(dateString)).add(duration,'M').format('MM/DD/YYYY');
    } else {
      const d=new Date(dateString);
      d.setMonth(d.getMonth()+duration);
      expDate=(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();
    }
    return expDate;
  }

  getCertDocLiveValue(col){
    if (!col||!this.fullPilot) return null;
    if (col.key==='medical') return this.computeMedicalExpiration(this.fullPilot);
    if (col.key==='passport') return this.fullPilot.passport||null;
    return null;
  }

  getCertDocHistoryFieldKey(col){
    return col&&col.historyField;
  }

  getCertDocHistoryIndex(col,rowIndex){
    const fieldKey=this.getCertDocHistoryFieldKey(col);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const live=this.getCertDocLiveValue(col);
    const loggedCurrentMatchesLive=history.length>0&&history[0].exp===live;
    if (rowIndex===1) return loggedCurrentMatchesLive?1:0;
    if (rowIndex===2) return loggedCurrentMatchesLive?2:1;
    return -1;
  }

  getCertDocHistoryCell(col,rowIndex){
    if (!col) return null;
    if (rowIndex===0) return this.getCertDocLiveValue(col);
    const fieldKey=this.getCertDocHistoryFieldKey(col);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const historyIndex=this.getCertDocHistoryIndex(col,rowIndex);
    if (historyIndex<0||!history[historyIndex]) return null;
    return history[historyIndex].exp;
  }

  getCertDocHistoryEntry(col,rowIndex){
    if (!col||rowIndex===0) return null;
    const fieldKey=this.getCertDocHistoryFieldKey(col);
    const history=(this.fullPilot&&this.fullPilot.trainingExpHistory&&this.fullPilot.trainingExpHistory[fieldKey])||[];
    const historyIndex=this.getCertDocHistoryIndex(col,rowIndex);
    if (historyIndex<0||!history[historyIndex]) return null;
    return history[historyIndex];
  }

  getCertDocHistoryTooltip(col,rowIndex){
    if (!col||rowIndex===0) {
      if (col&&col.key==='medical') return 'Computed medical expiration from exam date, class, and age';
      if (col&&col.key==='passport') return 'Passport expiration on pilot profile';
      return 'Current value on pilot profile';
    }
    const entry=this.getCertDocHistoryEntry(col,rowIndex);
    if (!entry) return '';
    const parts=['Logged '+entry.source];
    if (entry.checkDate) parts.push('check '+entry.checkDate);
    if (entry.medicalDate) parts.push('exam '+entry.medicalDate);
    if (entry.medicalClass) parts.push('class '+entry.medicalClass);
    if (entry.approvedBy) parts.push('by '+entry.approvedBy);
    if (entry.approvedAt) parts.push('at '+new Date(entry.approvedAt).toLocaleString());
    if (this.canRestoreCertDocHistory(col,rowIndex)) parts.push('Click to restore');
    return parts.join(' · ');
  }

  canRestoreCertDocHistory(col,rowIndex){
    if (!this.isApprover()||rowIndex===0||!col) return false;
    const expValue=this.getCertDocHistoryCell(col,rowIndex);
    if (!expValue) return false;
    if (expValue===this.getCertDocLiveValue(col)) return false;
    if (col.key==='medical') {
      const entry=this.getCertDocHistoryEntry(col,rowIndex);
      return !!(entry&&entry.medicalDate);
    }
    return col.key==='passport';
  }

  restoreCertDocHistory(col,rowIndex){
    if (!this.canRestoreCertDocHistory(col,rowIndex)) return;
    const fieldKey=this.getCertDocHistoryFieldKey(col);
    const entry=this.getCertDocHistoryEntry(col,rowIndex);
    const expValue=entry?entry.exp:this.getCertDocHistoryCell(col,rowIndex);
    const current=this.getCertDocLiveValue(col);
    const label=col.label;
    if (!confirm('Restore '+label+' for '+this.pilot.name+' from '+current+' to '+expValue+'?')) return;
    const context={
      source:'restore',
      checkDate:entry&&entry.checkDate,
      recordId:entry&&entry.recordId,
    };
    const doc={_id:this.fullPilot._id};
    if (col.key==='passport') {
      doc.passport=expValue;
      this.fullPilot.passport=expValue;
    } else if (col.key==='medical'&&entry&&entry.medicalDate) {
      doc.medicalDate=entry.medicalDate;
      doc.medicalClass=entry.medicalClass;
      doc.medicalInterval=entry.medicalInterval;
      this.fullPilot.medicalDate=entry.medicalDate;
      this.fullPilot.medicalClass=entry.medicalClass;
      this.fullPilot.medicalInterval=entry.medicalInterval;
      context.medicalDate=entry.medicalDate;
      context.medicalClass=entry.medicalClass;
      context.medicalInterval=entry.medicalInterval;
    }
    const restoredLive=this.getCertDocLiveValue(col);
    this.prependExpHistory(fieldKey,this.buildExpHistoryEntry(restoredLive,context));
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      let index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index],doc);
      this.pilot=this.cleanObject(this.fullPilot);
      this.toaster.success('Success',label+' restored');
    }).catch(err=>{
      console.log(err);
      this.toaster.error('Error','Failed to restore '+label);
    });
  }

  logManualCertDocHistoryChanges(updatedPilot){
    if (!this.fullPilot||!updatedPilot) return;
    const context={source:'manual'};
    (this.appConfig.certDocSummaryColumns||[]).forEach(col=>{
      const fieldKey=this.getCertDocHistoryFieldKey(col);
      const prior=this.getCertDocLiveValueForPilot(this.fullPilot,col);
      const next=this.getCertDocLiveValueForPilot(updatedPilot,col);
      if (prior&&next!==prior) {
        const entry=this.buildExpHistoryEntry(prior,context);
        if (col.key==='medical') {
          entry.medicalDate=this.fullPilot.medicalDate;
          entry.medicalClass=this.fullPilot.medicalClass;
          entry.medicalInterval=this.fullPilot.medicalInterval;
        }
        this.prependExpHistory(fieldKey,entry);
      }
    });
  }

  getCertDocLiveValueForPilot(pilot,col){
    if (!pilot||!col) return null;
    if (col.key==='medical') return this.computeMedicalExpiration(pilot);
    if (col.key==='passport') return pilot.passport||null;
    return null;
  }

  logCertDocHistoryFromPriorSnapshot(col,priorPilot,context){
    if (!col||!priorPilot) return;
    const fieldKey=this.getCertDocHistoryFieldKey(col);
    const prior=this.getCertDocLiveValueForPilot(priorPilot,col);
    if (!prior) return;
    const entry=this.buildExpHistoryEntry(prior,context||{source:'update'});
    if (col.key==='medical') {
      entry.medicalDate=priorPilot.medicalDate;
      entry.medicalClass=priorPilot.medicalClass;
      entry.medicalInterval=priorPilot.medicalInterval;
    }
    this.prependExpHistory(fieldKey,entry);
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

  logApprovalExpHistory(record,expKey,expValue,expKeyAlt,priorOverride){
    const context={
      baseMonth: record.baseMonth,
      checkDate: record.date,
      recordId: record._id,
      newBaseMonth: record.newBaseMonth,
      source: 'approval',
    };
    const prior=priorOverride !== undefined && priorOverride !== null && priorOverride !== ''
      ? priorOverride
      : this.fullPilot[expKey];
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

  savePilotLegalName(){
    if (!this.isApprover()) return this.toaster.error('Error','Only approvers can edit legal name');
    if (!this.fullPilot||!this.fullPilot._id) return this.toaster.error('Error','Select a pilot first');
    let legalName=this.fullPilot.legalName!=null ? String(this.fullPilot.legalName).trim() : '';
    let doc={_id:this.fullPilot._id};
    if (legalName) doc.legalName=legalName;
    else doc.legalName='';
    return this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      if (!legalName) this.fullPilot.legalName='';
      let idx=this.pilots.map(e=>e._id).indexOf(this.fullPilot._id);
      if (idx>-1) this.pilots[idx].legalName=legalName||'';
      this.pilot=this.cleanObject(this.fullPilot);
      let chosen=this.RotPilotContext.getChosenPilot();
      if (chosen&&chosen._id===this.fullPilot._id) {
        chosen.legalName=legalName||'';
        this.RotPilotContext.setChosenPilot(chosen);
      }
      this.toaster.success('Legal name saved', legalName||'(cleared)');
    }).catch(err=>{
      console.error('savePilotLegalName',err);
      this.toaster.error('Error','Could not save legal name');
    });
  }

  inferMedicalFromScan(options){
    options=options||{};
    if (!this.pilot||!this.pilot._id) {
      return Promise.resolve(null);
    }
    return this.http.post('/api/rot/inferMedical',{
      pilotId:String(this.pilot._id),
      filename:options.filename||undefined
    }).then(res=>{
      let data=res.data||{};
      let doc={_id:this.pilot._id};
      let medicalDate=data.medicalDate;
      if (!medicalDate&&options.fallbackDate) medicalDate=options.fallbackDate;
      if (!medicalDate&&!data.medicalClass) {
        if (!options.silent) this.toastMedicalInferFailure(data);
        return data;
      }
      if (medicalDate) doc.medicalDate=medicalDate;
      if (data.medicalClass) doc.medicalClass=data.medicalClass;
      const priorSnapshot=JSON.parse(JSON.stringify(this.fullPilot));
      const nextPilot=Object.assign({},this.fullPilot,doc);
      const medicalCol=(this.appConfig.certDocSummaryColumns||[]).find(c=>c.key==='medical');
      const priorMed=medicalCol?this.getCertDocLiveValueForPilot(priorSnapshot,medicalCol):null;
      const nextMed=medicalCol?this.getCertDocLiveValueForPilot(nextPilot,medicalCol):null;
      if (medicalCol&&priorMed&&nextMed&&priorMed!==nextMed) {
        this.logCertDocHistoryFromPriorSnapshot(medicalCol,priorSnapshot,{source:'medical_scan'});
      }
      doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
      return this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
        Object.assign(this.fullPilot,doc);
        let pilotIndex=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
        if (pilotIndex>-1) Object.assign(this.pilots[pilotIndex],doc);
        if (!options.silent) {
          let msg=medicalDate+(data.medicalClass?' · '+data.medicalClass:'');
          if (data.expirationDate) msg+=' (cert shows exp '+data.expirationDate+')';
          this.toaster.success('Medical from scan',msg);
        }
        return data;
      });
    }).catch(err=>{
      console.error('inferMedical',err);
      if (!options.silent) this.toaster.error('Error','Medical scan read failed');
      return null;
    });
  }

  applyPassportFromCertUpload(expirationInput){
    if (!this.isApprover()||!this.fullPilot||!this.fullPilot._id) {
      return this.toaster.error('Error','Select a pilot and use approver login for passport approve');
    }
    const expValue=this.formatPilotExpDateStr(expirationInput)||String(expirationInput||'').trim();
    if (!expValue) return this.toaster.error('Error','Enter a valid passport expiration date');
    const col=(this.appConfig.certDocSummaryColumns||[]).find(c=>c.key==='passport');
    const priorSnapshot=JSON.parse(JSON.stringify(this.fullPilot));
    const doc={_id:this.fullPilot._id,passport:expValue};
    if (col) this.logCertDocHistoryFromPriorSnapshot(col,priorSnapshot,{source:'cert_upload'});
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      this.fullPilot.passport=expValue;
      const idx=this.pilots.map(e=>e._id).indexOf(this.fullPilot._id);
      if (idx>-1) this.pilots[idx].passport=expValue;
      this.pilot=this.cleanObject(this.fullPilot);
      this.toaster.success('Passport approved',expValue+' on pilot profile');
    }).catch(err=>{
      console.error('applyPassportFromCertUpload',err);
      this.toaster.error('Error','Could not save passport expiration');
    });
  }

  finishCertMedicalUploadApprove(){
    const filename=this._lastCertUploadFilename;
    return this.inferMedicalFromScan({
      filename:filename,
      fallbackDate:this.dateString,
      silent:true
    }).then(()=>{
      this.openCertMedicalApprovePreview();
    }).catch(()=>{
      this.toaster.error('Error','Medical upload succeeded but scan read failed — use Read medical or enter dates manually');
    });
  }

  openCertMedicalApprovePreview(){
    if (!this.fullPilot||!this.fullPilot._id) return;
    const medicalCol=(this.appConfig.certDocSummaryColumns||[]).find(c=>c.key==='medical');
    const current=medicalCol?this.getCertDocLiveValue(medicalCol):null;
    const proposed=this.computeMedicalExpiration(this.fullPilot);
    const rows=[{
      type:'Medical',
      expKey:'medicalProfile',
      current:current||'—',
      proposed:proposed||'—',
      newBase:false,
      newDate:proposed?this.parseExpInputDate(proposed):null,
      priorExpiration:current
    }];
    this._expPreviewOpen=true;
    this.expPreviewModal({_id:'cert-medical',_certMedicalPreview:true}, rows, this.pilot.name, {
      recalcRow:()=>{},
      parseDate:(str)=>this.parseExpInputDate(str),
      formatDate:(d)=>this.formatPilotExpDateStr(d),
      onClose:()=>{this._expPreviewOpen=false;}
    });
  }

  toastMedicalInferFailure(data){
    let msg='Could not read exam date/class from the medical scan — enter manually or retry.';
    if (data.reason==='no_medical_cert') msg='No CERT Medical file on disk for this employee #.';
    if (data.reason==='ocr_needs_poppler') msg='Server needs poppler-utils (pdftoppm) for scanned PDF medicals.';
    if (data.reason==='ocr_needs_tesseract') msg='Server needs tesseract-ocr for medical OCR.';
    if (data.reason==='ocr_skipped_too_large'||data.reason==='file_too_large') msg='Medical file too large for OCR — enter date/class manually.';
    if (data.reason==='parse_no_medical_fields') msg='OCR ran but could not find exam date or class — check scan quality.';
    this.toaster.warning('Medical scan',msg);
  }

  inferLegalNameFromScan(pilot, options){
    options=options||{};
    if (!pilot||!pilot._id||!pilot.name) {
      return Promise.resolve(null);
    }
    return this.http.post('/api/rot/inferLegalName',{
      pilotId:String(pilot._id),
      rosterName:pilot.name
    }).then(res=>{
      let data=res.data||{};
      if (data.legalName) {
        pilot.legalName=data.legalName;
        if (this.fullPilot&&this.fullPilot._id===pilot._id) {
          this.fullPilot.legalName=data.legalName;
        }
        if (options.persist) {
          return this.http.post('/api/rot/updateFirebase',{
            collection:'pilots',
            doc:{_id:pilot._id,legalName:data.legalName}
          }).then(()=>{
            let idx=this.pilots.map(e=>e._id).indexOf(pilot._id);
            if (idx>-1) this.pilots[idx].legalName=data.legalName;
            if (!options.silent) {
              let kind=data.documentKind==='medical'?'medical':'certificate';
              this.toaster.success('Legal name saved',data.legalName+' (from '+kind+' scan)');
            }
            return data;
          });
        }
        if (!options.silent) {
          let kind=data.documentKind==='medical'?'medical':'certificate';
          this.toaster.success('Legal name',data.legalName+' (from '+kind+' scan)');
        }
        return data;
      }
      if (!options.silent) {
        let msg='Could not read a legal name from CERT scans (last name must match roster).';
        if (data.reason==='no_cert_pdf') msg='No CERT Medical or Certificate file on file for this employee #.';
        if (data.reason==='ocr_needs_poppler') {
          msg='Scanned PDF needs OCR: install poppler-utils on the server (pdftoppm), then retry.';
        }
        if (data.reason==='ocr_needs_tesseract') {
          msg='OCR needs the system package tesseract-ocr on the server (`apt install tesseract-ocr`), then retry.';
        }
        if (data.reason==='ocr_skipped_too_large' || data.reason==='file_too_large') {
          msg='CERT file too large for OCR — trying pilot certificate next, or enter legal name manually.';
        }
        if (data.reason==='ocr_no_name_match') {
          msg='OCR ran but no matching legal name was found — check scan quality or enter manually.';
        }
        if (data.reason==='ocr_failed') {
          msg='OCR failed on the server — install tesseract-ocr and poppler-utils, redeploy, or check pm2 logs.';
        }
        this.toaster.warning('Legal name',msg);
      }
      return data;
    }).catch(err=>{
      console.error('inferLegalName',err);
      if (!options.silent) this.toaster.error('Error','Legal name inference failed');
      return null;
    });
  }

  showPilotTrainingDates(){
    if (!this.fullPilot||!this.fullPilot._id) return this.toaster.error('Error','Select a pilot first');
    if (!this.isApprover()) return this.toaster.error('Error','Only approvers can edit pilot training dates');
    let pilotCopy=JSON.parse(JSON.stringify(this.fullPilot));
    let modalOptions={
      inferLegalNameFromScan:()=>{
        return this.inferLegalNameFromScan(pilotCopy).then(data=>{
          if (data&&data.legalName) pilotCopy.legalName=data.legalName;
        });
      }
    };
    let open=()=>{this.pilotModal(pilotCopy,this.pilots,modalOptions);};
    if (pilotCopy.legalName) {
      open();
      return;
    }
    this.inferLegalNameFromScan(pilotCopy,{silent:true}).then(()=>{open();});
  }

  parseExpInputDate(dateStr){
    if (!dateStr) return null;
    const fromMonthYear=this.rotPilotExpDate.parsePilotExpDate(dateStr);
    if (fromMonthYear) return fromMonthYear;
    const parsed=this.parseShortExpDate(String(dateStr).trim());
    if (parsed) return parsed;
    const d=new Date(dateStr);
    return isNaN(d.getTime())?null:d;
  }

  formatPilotExpDateStr(raw){
    if (raw === null || raw === undefined || raw === '') return null;
    return this.rotPilotExpDate.formatPilotExpDate(raw);
  }

  priorExpForPreview(priorExpDates, expKey, expKeyAlt){
    if (priorExpDates) {
      if (priorExpDates[expKey]) return priorExpDates[expKey];
      if (expKeyAlt && priorExpDates[expKeyAlt]) return priorExpDates[expKeyAlt];
    }
    if (this.fullPilot) {
      if (this.fullPilot[expKey]) return this.fullPilot[expKey];
      if (expKeyAlt && this.fullPilot[expKeyAlt]) return this.fullPilot[expKeyAlt];
    }
    return null;
  }

  getCheckrideGraceState(expirationDateStr, checkrideDateStr){
    const exp=new Date(expirationDateStr);
    const check=new Date(checkrideDateStr);
    if (isNaN(exp.getTime())||isNaN(check.getTime())) return 'outside';
    const monthDiff=(check.getFullYear()-exp.getFullYear())*12+(check.getMonth()-exp.getMonth());
    if (monthDiff===0) return 'due';
    if (monthDiff===-1) return 'early';
    if (monthDiff===1) return 'late';
    return 'outside';
  }

  shouldAutoRebase(record, expKey, existingExpiration){
    if (expKey==='HazmatExp') return false;
    const existingRaw=existingExpiration !== undefined && existingExpiration !== null && existingExpiration !== ''
      ? existingExpiration
      : (this.fullPilot && this.fullPilot[expKey]);
    if (!existingRaw) return false;
    const grace=this.getCheckrideGraceState(existingRaw, record.date);
    return grace==='outside';
  }

  recalcExpPreviewRow(row, record){
    const {tab,seat}=this.typeToTab(row.type);
    const {expKey,timeframe}=this.setExp(tab,seat);
    if (!timeframe||!expKey) return;
    const existingForCalc=row.priorExpiration ||
      (row.current && row.current !== '—' ? row.current : null);
    const newDate=this.computeExpDate(record, expKey, timeframe, {
      preview: true,
      newBase: !!row.newBase,
      existingExpiration: existingForCalc
    });
    if (!newDate||isNaN(newDate.getTime())) return;
    row.newDate=newDate;
    row.proposed=this.formatPilotExpDateStr(newDate);
    row.action=row.newBase?'rebase':(row.current&&row.current!=='—'?'extend':'initial');
    const existingDate=existingForCalc ? this.parseExpInputDate(existingForCalc) : null;
    row.warnEarlier=existingDate&&!isNaN(existingDate.getTime())&&newDate<existingDate;
  }

  parseShortExpDate(expStr){
    if (!expStr) return null;
    let parts=expStr.split('/');
    if (parts.length!==3) return null;
    let year=parseInt(parts[2],10);
    if (year<100) year+=2000;
    return new Date(year,parseInt(parts[0],10)-1,parseInt(parts[1],10));
  }

  /** Last calendar day of anchor's month, then +N months (avoids Aug 31 + 6 → Mar 3). */
  expEndOfMonthAfterMonths(anchorDate, months){
    if (!anchorDate||isNaN(anchorDate.getTime())) return null;
    const n=parseInt(months,10);
    if (!n) return null;
    const y=anchorDate.getFullYear();
    const m=anchorDate.getMonth();
    const eom=new Date(y,m+1,0);
    const total=eom.getMonth()+n;
    const ty=eom.getFullYear()+Math.floor(total/12);
    const tm=((total%12)+12)%12;
    return new Date(ty,tm+1,0);
  }

  isNewBaseMonth(record){
    return record.newBaseMonth===true||record.newBaseMonth==='true';
  }

  computeExpDate(record, expKey, timeframe, options){
    options = options || {};
    let recordDate=new Date(record.date);
    let existingRaw=options.existingExpiration !== undefined && options.existingExpiration !== null &&
      options.existingExpiration !== ''
      ? options.existingExpiration
      : this.fullPilot[expKey];
    let existingDate=this.parseExpInputDate(existingRaw);
    if (!existingDate && existingRaw) existingDate=new Date(existingRaw);
    let hasExisting=existingDate&&!isNaN(existingDate.getTime());
    const useRebase=options.newBase!==undefined?!!options.newBase:this.isNewBaseMonth(record);
    const months=parseInt(timeframe,10)||12;

    if (useRebase) {
      if (hasExisting&&this.isWithinOneMonth(recordDate, existingDate)) {
        if (!options.preview && !confirm('Are you sure you want to create a new base month? It appears you are within the window.')) {
          return null;
        }
      }
      // #55 — 299 / 297g new base: end of check month + 12 (not prior base-month getExp).
      if (expKey==='far299Exp'||expKey==='far297gExp') {
        const fromCheck=this.expEndOfMonthAfterMonths(recordDate,months);
        if (fromCheck) return fromCheck;
      }
      // #60 — 293(b) checkrides: new base from check date (EOM + 12), not base-month skew table.
      if (this.isAircraftCheckrideExpKey(expKey)) {
        const fromCheck=this.expEndOfMonthAfterMonths(recordDate,months);
        if (fromCheck) return fromCheck;
      }
      if (expKey==='far297Exp'&&record.baseMonth) {
        let expFromBase=this.getExp(record.baseMonth,record.date,String(timeframe),1);
        let parsedBaseExp=this.parseShortExpDate(expFromBase);
        if (parsedBaseExp) return parsedBaseExp;
      }
      if (record.baseMonth&&expKey!=='far299Exp'&&expKey!=='far297gExp'&&expKey!=='far297Exp') {
        let expFromBase=this.getExp(record.baseMonth,record.date,String(timeframe),1);
        let parsedBaseExp=this.parseShortExpDate(expFromBase);
        if (parsedBaseExp) return parsedBaseExp;
      }
      const rebased=this.expEndOfMonthAfterMonths(recordDate,months);
      if (rebased) return rebased;
    }

    // Standard recurrent — extend from current expiration, do not rebase from training date.
    if (hasExisting) {
      const extended=this.expEndOfMonthAfterMonths(existingDate,months);
      if (extended) return extended;
    }
    const initial=this.expEndOfMonthAfterMonths(recordDate,months);
    if (initial) return initial;
    return null;
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

  /** Edit Pilot Training Dates — only fields on that modal. */
  pilotProfileWriteDoc(source){
    const doc={_id:source._id};
    const keys=[
      'name','legalName','pilotBase','dateOfHire','dateOfBirth',
      'cert','certType','medicalClass','medicalDate',
      'oas','passport','rus','far293a148',
      'highMinimumsC208','highMinimumsC408','highMinimumsC212','highMinimumsB190','highMinimumsBE20'
    ];
    (this.appConfig.trainingEvents||[]).forEach(event=>{
      keys.push(event.name+'Exp');
    });
    keys.forEach(key=>{
      if (source[key]!==undefined) doc[key]=source[key];
    });
    return doc;
  }

  /** Pilot Duty Assignment save — quals, removals, certificate checkboxes, medical. */
  pilotAssignmentWriteDoc(){
    const source=this.pilot||{};
    const doc={_id:source._id};
    [
      'atp','commercial','cfi','other','otherDescription','ratings',
      'highMinimumsC208','highMinimumsC408','highMinimumsC212','highMinimumsB190','highMinimumsBE20',
      'quals','removals','medicalDate','medicalClass','medicalInterval'
    ].forEach(key=>{
      if (source[key]!==undefined) doc[key]=source[key];
    });
    return doc;
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
  
  /** #59 — CERT Certificate / Annual resume / Drivers license: no document date UI; filename uses upload date. */
  subSkipsCertDocumentDate(sub) {
    return ['Certificate', 'Annual-Resume', 'Drivers-License', 'Medical'].indexOf(sub) > -1;
  }

  certUploadSkipsDocumentDate() {
    if (this.getAssociatedRecord && this.getAssociatedRecord()) return false;
    if (this.tab !== 'CERT') return false;
    return this.subSkipsCertDocumentDate(this.subtab);
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
    const subs=this.subtabs.slice();
    if (cat===this.unaffiliatedRotTab) subs.push(this.unaffiliatedRotSub);
    return subs;
  }

  isUnaffiliatedRotSub(sub){
    return sub===this.unaffiliatedRotSub;
  }

  sanitizeUnaffiliatedLabel(label){
    if (!label) return '';
    return String(label).trim().replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
  }
  
  isUploadCertChoice(){
    if (!this.associated) return false;
    if (this.associated._id===-1) return true;
    return typeof this.associated.index==='number'&&this.associated.index<0;
  }

  /** #42 — CERT/Medical picker must stay visible for “UPLOAD A CERT” (_id -1), not only when associated is empty. */
  showUploadTabPicker(){
    if (!this.associated||this.associated._id===undefined||this.associated._id===null) return true;
    if (this.isUploadCertChoice()) return true;
    return false;
  }

  selectTR(){
    if (this.isUploadCertChoice()){
      this.tab='CERT';
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
    const unaffiliatedUpload=!this.hasAssociatedRecord()&&this.isUnaffiliatedRotSub(this.subtab);
    if (unaffiliatedUpload) {
      if (approval) {
        return this.toaster.error('Error','Unaffiliated ROT uploads do not update expirations — use Upload File only');
      }
      if (this.tab!==this.unaffiliatedRotTab) {
        return this.toaster.error('Error','Unaffiliated ROTs use tab '+this.unaffiliatedRotTab);
      }
      if (!this.sanitizeUnaffiliatedLabel(this.unaffiliatedLabel)) {
        return this.toaster.error('Error','Enter a short training description (e.g. Special approach training)');
      }
    }
    const certOnlyApprove=approval&&!this.hasAssociatedRecord()&&this.tab==='CERT'&&this.isCertDocOnlyUploadSub(this.subtab);
    if (approval&&!this.hasAssociatedRecord()&&!certOnlyApprove) {
      return this.toaster.error('Error','Select the training record to associate with this upload before Upload and Approve');
    }
    if (certOnlyApprove&&!this.isApprover()) {
      return this.toaster.error('Error','Only approvers can upload and approve CERT documents');
    }
    if (certOnlyApprove&&this.subtab==='Passport'&&!this.date) {
      return this.toaster.error('Error','Enter passport expiration as Document Date before Upload and Approve');
    }
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
      const localAssociated=unaffiliatedUpload?null:this.getAssociatedRecord();
      const approveAfterUpload=!!(approval && localAssociated && localAssociated._id);
      const certApproveAfterUpload=!!(certOnlyApprove && approval);
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
          if (approveAfterUpload && !this._expPreviewOpen) {
            const recordIndex=this.records.findIndex(r=>r._id===localAssociated._id);
            this.approve(localAssociated, recordIndex);
          } else if (certApproveAfterUpload && !this._expPreviewOpen) {
            if (this.subtab==='Passport') {
              this.applyPassportFromCertUpload(this.dateString||this.date);
            } else if (this.subtab==='Medical') {
              this.finishCertMedicalUploadApprove();
            }
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
            if (certApproveAfterUpload&&this.subtab==='Medical') this._lastCertUploadFilename=filename;
            if (this.subtab==='Medical'&&!certApproveAfterUpload) {
              this.inferMedicalFromScan({
                filename:filename,
                fallbackDate:this.dateString,
                silent:false
              }).then(()=>{
                onUploadFinished();
              }).catch(()=>{onUploadFinished();});
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

  buildExpPreviewRows(record, priorExpDates){
    const rows=[];
    const seen={};
    if (record&&record.unaffiliatedRot) return rows;
    if (!record||!record.trainingTypeArray||record.trainingTypeArray.length===0) return rows;
    record.trainingTypeArray.forEach(type=>{
      const {tab,seat}=this.typeToTab(type);
      if (!tab) return;
      const {expKey,expKeyAlt,timeframe}=this.setExp(tab,seat);
      if (!timeframe||!expKey||seen[expKey]) return;
      seen[expKey]=true;
      const existingRaw=this.priorExpForPreview(priorExpDates, expKey, expKeyAlt);
      const existingDate=existingRaw ? this.parseExpInputDate(existingRaw) : null;
      const hasExisting=existingDate&&!isNaN(existingDate.getTime());
      const newBase=this.shouldAutoRebase(record, expKey, existingRaw);
      const newDate=this.computeExpDate(record, expKey, timeframe, {
        preview: true,
        newBase: newBase,
        existingExpiration: existingRaw
      });
      if (!newDate||isNaN(newDate.getTime())) return;
      rows.push({
        type:type,
        expKey:expKey,
        expKeyAlt:expKeyAlt,
        newDate:newDate,
        newBase:newBase,
        priorExpiration: existingRaw || null,
        current: existingRaw ? (this.formatPilotExpDateStr(existingRaw) || existingRaw) : '—',
        proposed: this.formatPilotExpDateStr(newDate),
        action:newBase?'rebase':(hasExisting?'extend':'initial'),
        warnEarlier:hasExisting&&newDate<existingDate
      });
    });
    return rows;
  }

  applyExpUpdates(record, rows){
    if (!rows||!rows.length) return;
    const doc={_id:this.pilot._id};
    rows.forEach(row=>{
      const expValue=this.formatPilotExpDateStr(row.newDate);
      doc[row.expKey]=expValue;
      if (row.expKeyAlt) doc[row.expKeyAlt]=expValue;
      this.logApprovalExpHistory(record, row.expKey, expValue, row.expKeyAlt, row.priorExpiration);
    });
    doc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:doc}).then(()=>{
      this.toaster.success('Success','Pilot Profile Updated');
      rows.forEach(row=>{
        const expValue=this.formatPilotExpDateStr(row.newDate);
        this.fullPilot[row.expKey]=expValue;
        if (row.expKeyAlt) this.fullPilot[row.expKeyAlt]=expValue;
      });
      const index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index], doc);
    }).catch(err=>{console.log(err)});
  }

  finalizeCertMedicalPreview(rows){
    const row=rows&&rows[0];
    const exp=row&&(row.proposed||this.formatPilotExpDateStr(row.newDate));
    let msg='Medical uploaded and profile updated';
    if (this.fullPilot.medicalDate) msg+=' · exam '+this.fullPilot.medicalDate;
    if (this.fullPilot.medicalClass) msg+=' · '+this.fullPilot.medicalClass;
    if (exp) msg+=' · exp '+exp;
    this.toaster.success('Medical approved',msg);
  }

  finalizeApproval(record, rows){
    if (!record||!record._id||record._certMedicalPreview) return;
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
    if (this._expPreviewOpen) return;
    if (!this.isApprover()) return this.toaster.error('Error','Only approvers can approve records');
    if (!record||!record._id) return this.toaster.error('Error','Save the record before approving');
    const localRecord=typeof index==='number'&&index>-1?this.records[index]:record;
    const priorSnapshot=this.snapshotPriorExpDates(localRecord);
    const previewRows=this.buildExpPreviewRows(localRecord, priorSnapshot);
    if (!previewRows.length) return this.toaster.error('Error','Select training types on this record before approving');
    this._expPreviewOpen=true;
    this.expPreviewModal(localRecord, previewRows, this.pilot.name, {
      recalcRow:(row, rec)=>this.recalcExpPreviewRow(row, rec),
      parseDate:(str)=>this.parseExpInputDate(str),
      formatDate:(d)=>this.formatPilotExpDateStr(d),
      onClose:()=>{this._expPreviewOpen=false;}
    });
  }
  
  trainingTypeToEventKey(type){
    if (!type) return null;
    if (this.appConfig.trainingEventKeys.indexOf(type)>-1) return type;
    if (type==='293a') return 'far293a';
    if (type==='299'||type==='297'||type==='297g') return 'far'+type;
    return type;
  }

  isAircraftCheckrideKey(key){
    return !!(key&&/(PIC|SIC)$/.test(key));
  }

  isAircraftCheckrideExpKey(expKey){
    return !!(expKey&&/^(C208|B190|BE20|C408|C212)(PIC|SIC)Exp$/.test(expKey));
  }

  isRouteOrIpcTrainingKey(key){
    if (!key) return false;
    const k=this.trainingTypeToEventKey(key);
    return k==='far299'||k==='far297'||k==='far297g';
  }

  isCertDocOnlyUploadSub(sub){
    return sub==='Passport'||sub==='Medical';
  }

  primaryCheckrideExpKeyForRecord(record){
    if (!record) return null;
    const order=['C208PIC','C408PIC','C212PIC','B190PIC','BE20PIC','C408SIC','C212SIC','B190SIC'];
    for (let i=0;i<order.length;i++){
      const key=order[i];
      if (record[key]==='true') return key+'Exp';
    }
    return null;
  }

  /** #61 — Flight Test PDF expirations match approval / pilot board (not legacy getExp only). */
  pdfExpirationDate(record, expKey, frequencyMonths){
    if (this.fullPilot&&expKey&&this.fullPilot[expKey]) {
      const fromProfile=this.formatPilotExpDateStr(this.fullPilot[expKey]);
      if (fromProfile) return fromProfile;
    }
    if (!record||!record.date||!expKey) return '';
    const existing=this.fullPilot?this.fullPilot[expKey]:null;
    const newBase=this.shouldAutoRebase(record, expKey, existing);
    const computed=this.computeExpDate(record, expKey, String(frequencyMonths||12), {
      preview: true,
      newBase: newBase,
      existingExpiration: existing
    });
    if (computed&&!isNaN(computed.getTime())) {
      const fmt=this.formatPilotExpDateStr(computed);
      if (fmt) return fmt;
    }
    if (record.baseMonth) {
      return this.getExp(record.baseMonth, record.date, String(frequencyMonths||12), 1);
    }
    return '';
  }

  /** #46 — Firebase aircraft fleet (acftType + N# _id); Postgres /api/airplanes is incomplete for Caravan. */
  loadRotAircraftFleet(){
    const applyGrab=(data)=>{
      const aircraft=(data&&data.aircraft)||[];
      this.rotAircraft=aircraft.filter(a=>{
        if (!a||!a._id) return false;
        if (String(a._id).charAt(0).toUpperCase()!=='N') return false;
        if (a.isInactive) return false;
        return true;
      });
      this.nNumbers=this._uniqueSortedRegs(this.rotAircraft.map(a=>a._id));
    };
    if (window.firebaseGrabData&&window.firebaseGrabData.aircraft&&window.firebaseGrabData.aircraft.length){
      applyGrab(window.firebaseGrabData);
      return;
    }
    this.http.post('/api/airplanes/firebaseGrab').then(res=>{
      window.firebaseGrabData=res.data;
      applyGrab(res.data);
    }).catch(()=>{
      this.http.get('/api/airplanes').then(r=>{
        const list=(r.data||[]).filter(a=>a.registration&&!a.isInactive&&a.active!==false);
        this.rotAircraft=list.map(a=>({
          _id:String(a.registration).trim(),
          acftType:a.airplaneType||a.aircraftType||''
        }));
        this.nNumbers=this._uniqueSortedRegs(this.rotAircraft.map(a=>a._id));
      }).catch(()=>{
        this.rotAircraft=[];
        this.nNumbers=[];
      });
    });
  }

  _uniqueSortedRegs(ids){
    const seen={};
    return ids.map(id=>String(id).trim()).filter(n=>{
      if (!n||seen[n]) return false;
      seen[n]=true;
      return true;
    }).sort();
  }

  normalizeRotAcftType(acftType){
    let t=(acftType||'').trim();
    if (t==='Sky Courier') t='Courier';
    return t;
  }

  rotAcftTypeForRecord(record){
    const ac=record&&record.aircraft;
    if (!ac||ac==='none') return null;
    const map={
      C208:'Caravan',
      BE20:'King Air',
      B190PIC:'Beech 1900',
      B190SIC:'Beech 1900',
      C408PIC:'Courier',
      C408SIC:'Courier',
      C212PIC:'Casa',
      C212SIC:'Casa'
    };
    return map[ac]||null;
  }

  nNumbersForRecord(record){
    const want=this.rotAcftTypeForRecord(record);
    let list=this.rotAircraft||[];
    if (want&&list.length){
      list=list.filter(a=>this.normalizeRotAcftType(a.acftType)===want);
    }
    if (!list.length) return this.nNumbers||[];
    return this._uniqueSortedRegs(list.map(a=>a._id));
  }

  onRecordAircraftChange(record){
    if (!record) return;
    const allowed=this.nNumbersForRecord(record);
    if (record.aircraftN&&allowed.indexOf(record.aircraftN)<0) record.aircraftN='';
  }

  /** #49 / #67 — aircraft type for checkrides; #67 adds 299/297/297g tail + time without check airman. */
  recordRequiresAircraft(record){
    if (!record) return false;
    if (record.trainingTypeArray&&record.trainingTypeArray.length){
      for (let i=0;i<record.trainingTypeArray.length;i++){
        const key=this.trainingTypeToEventKey(record.trainingTypeArray[i]);
        if (this.isAircraftCheckrideKey(key)) return true;
      }
    }
    if (!this.appConfig||!this.appConfig.trainingEventKeys) return false;
    for (let i=0;i<this.appConfig.trainingEventKeys.length;i++){
      const key=this.appConfig.trainingEventKeys[i];
      if (!this.isAircraftCheckrideKey(key)) continue;
      if (record[key]==='true') return true;
    }
    return false;
  }

  recordRequiresTailAndTime(record){
    if (this.recordRequiresAircraft(record)) return true;
    if (!record||!record.trainingTypeArray||!record.trainingTypeArray.length) return false;
    for (let i=0;i<record.trainingTypeArray.length;i++){
      if (this.isRouteOrIpcTrainingKey(record.trainingTypeArray[i])) return true;
    }
    return !!(record.far299==='true'||record.far297==='true'||record.far297g==='true');
  }

  syncTrainingBooleansFromArray(record){
    if (!record||!this.appConfig) return;
    const active={};
    (record.trainingTypeArray||[]).forEach(type=>{
      const key=this.trainingTypeToEventKey(type);
      if (key) active[key]=true;
    });
    this.appConfig.trainingEventKeys.forEach(key=>{
      record[key]=active[key]?'true':'false';
    });
  }

  rebuildTrainingTypeArrayFromBooleans(record){
    record.trainingTypeArray=[];
    this.appConfig.trainingEventKeys.forEach(key=>{
      if (record[key]&&record[key]==='true') {
        let typeKey=key;
        if (typeKey.slice(0,3)==='far'&&typeKey!=='far293a') typeKey=typeKey.substring(3);
        if (record.trainingTypeArray.indexOf(typeKey)<0) record.trainingTypeArray.push(typeKey);
      }
    });
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
      case 'far293a':
      case '293a':
        tab="293A";
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
    else if (obj.tab === 'CERT' && this.subSkipsCertDocumentDate(obj.sub)) {
      date=new Date().toLocaleDateString();
    }
    fn=this.pilot._id+'_'+this.formatDate(date)+'_'+obj.tab+'_';
    if (obj.sub) fn+=obj.sub+'_';
    if (obj.sub===this.unaffiliatedRotSub) {
      const tag=this.sanitizeUnaffiliatedLabel(this.unaffiliatedLabel);
      if (tag) fn+=tag+'_';
    }
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
      case 'HAZ':
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
        break;
      case '293A':
        expKey='far293a148';
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
        if (type===this.unaffiliatedRotSub&&arr[4]&&arr[4]!=='associated'&&arr[4]!=='PIC'&&arr[4]!=='SIC') {
          type=arr[4].replace(/-/g,' ');
        } else if (arr[4]==='PIC'||arr[4]==='SIC') type+=' '+arr[4];
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
    const pilotDoc=this.pilotAssignmentWriteDoc();
    this.logManualCertDocHistoryChanges(Object.assign({}, this.fullPilot, pilotDoc));
    pilotDoc.trainingExpHistory=this.fullPilot.trainingExpHistory;
    this.http.post('/api/rot/updateFirebase',{collection:'pilots',doc:pilotDoc}).then(res=>{
      let index=this.pilots.map(e=>e._id).indexOf(this.pilot._id);
      if (index>-1) Object.assign(this.pilots[index], pilotDoc);
      Object.assign(this.fullPilot, pilotDoc);
      this.pilot=this.cleanObject(this.fullPilot);
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

  ensureDraftRow(){
    const hasDraft=this.records.some(r=>!r._id);
    if (!hasDraft) this.records.unshift(this.createNewRecord());
  }

  checkDate(record){
    if (!record||record.baseMonthManual) return;
    const d=new Date(record.date);
    if (!isNaN(d.getTime())) {
      record.baseMonth=d.toLocaleString('default', { month: 'long' });
      record.dateObj=d;
    }
  }

  persistRecord(record,index,options){
    options=options||{};
    if (!record.trainingTypeArray||record.trainingTypeArray.length===0) {
      return Promise.reject('training');
    }
    if (this.recordRequiresAircraft(record)&&(!record.aircraft||record.aircraft==='none')) {
      return Promise.reject('aircraft');
    }
    record.dateObj=new Date(record.date);
    const hadId=!!record._id;
    const resolvedIndex=typeof index==='number'&&index>-1?index:this.records.indexOf(record);
    return this.http.post('/api/rot/updateFirebase',{collection:'records',doc:record}).then(res=>{
      if (!options.silent) this.toaster.success('Success','Record is Updated');
      if (resolvedIndex>-1) this.records[resolvedIndex]=res.data;
      else Object.assign(record, res.data);
      if (!hadId&&!options.skipNewRow) this.ensureDraftRow();
      this.enrichRecords();
      this.buildRecordsChoice();
      return res.data;
    });
  }

  persistRecordError(err){
    if (err==='training') this.toaster.error('Error','You Need to Select at least one training type before saving');
    else if (err==='aircraft') this.toaster.error('Error','Select an aircraft when this record includes a PIC/SIC checkride');
    else console.log(err);
  }
  
  update(record,index){
    this.persistRecord(record,index).catch(err=>this.persistRecordError(err));
  }
  
  createNewRecord(){
    let nr=JSON.parse(JSON.stringify(this.fullPilot));
    let newObj={name:this.fullPilot.name,pilotNumber:this.fullPilot._id,dateObj:new Date(),date:new Date().toLocaleDateString(),newBaseMonth:'false',baseMonthManual:false,trainingType:'recurrent',baseMonth:new Date().toLocaleString('default', { month: 'long' }),eventResult:{},flightTestItems:{},remarks:[],aircraftN:'',flightTime:'',result:'S',trainingTypeArray:[]};
    Object.assign(nr, newObj );
    if (this.appConfig&&this.appConfig.trainingEventKeys) {
      this.appConfig.trainingEventKeys.forEach(key=>{ delete nr[key]; });
    }
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
  
  recordIndexInList(record){
    if (!record||!this.records) return -1;
    if (record._id) return this.records.findIndex(r=>r._id===record._id);
    return this.records.findIndex(r=>r===record);
  }

  removeDraftRecord(record){
    const resolvedIndex=this.recordIndexInList(record);
    if (resolvedIndex>-1) this.records.splice(resolvedIndex, 1);
    this.ensureDraftRow();
    this.buildRecordsChoice();
  }

  delete(record,index){
    if (!record) return;
    if (!record._id) {
      this.removeDraftRecord(record);
      return;
    }
    const resolvedIndex=this.recordIndexInList(record);
    if (resolvedIndex<0) {
      return this.toaster.error('Error','Could not find this record in the list — refresh the page and try again');
    }
    let revertExp=false;
    if (record.approved&&record.priorExpDates&&Object.keys(record.priorExpDates).length) {
      revertExp=confirm('This record was approved and updated pilot expiration dates. Also revert those expiration dates to their values before this record was approved?');
    }
    const priorExpDates=revertExp?record.priorExpDates:null;
    this.http.post('/api/rot/deleteFirebase',{id:record._id}).then(()=>{
      this.toaster.warning('Warning','Record has been deleted');
      const idx=this.recordIndexInList(record);
      if (idx>-1) this.records.splice(idx, 1);
      else if (typeof index==='number'&&index>-1&&index<this.records.length) this.records.splice(index, 1);
      this.ensureDraftRow();
      this.buildRecordsChoice();
      if (priorExpDates) this.revertPriorExpDates(priorExpDates);
    })
    .catch(err=>{
      console.log(err);
      this.toaster.error('Error','Could not delete this record in Firebase — try again or refresh the page');
    });
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
        else if (r.result==='S') obj["Pass Fail"]="Satisfactory";
        else if (r.result==='U/S') obj["Pass Fail"]="Unsatisfactory";
        else if (r.result==='W') obj["Pass Fail"]="Waived";
        else obj["Pass Fail"]=r.result;
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
    if (!record._id) return "newDraftBackground";
    if (!record.approved) return "blueBackground";
    return "approvedBackground";
  }
  
  eventGradeForType(record, type){
    if (!record||!record.eventResult) return '';
    if (record.eventResult[type]) return record.eventResult[type];
    if (record.eventResult['far'+type]) return record.eventResult['far'+type];
    return '';
  }

  displayArray(record){
    if (!record) return "No Type Selected";
    let result="";
    if (record.trainingTypeArray&&record.trainingTypeArray.length>0) {
      record.trainingTypeArray.forEach((type,index)=>{
        if (index>0) result+=", ";
        const grade=this.eventGradeForType(record, type);
        result+=grade?type+' ('+grade+')':type;
      });
    }
    else return "No Type Selected";
    return result;
  }
  
  enrichRecords(){
    this.records.forEach(record=>{
      this.enrichRecordForForms(record);
    });
  }

  pilotLegalName(pilot){
    return this.RotPilotContext.pilotLegalName(pilot);
  }

  pilotRosterIndexByLabel(label){
    if (!label||!this.pilots) return -1;
    let target=String(label).trim().toLowerCase();
    if (!target) return -1;
    return this.pilots.findIndex(p=>{
      let names=[p.name,p.legalName,p.payrollName,p.displayName];
      return names.some(n=>n&&String(n).trim().toLowerCase()===target);
    });
  }

  /** Pilot profile + roster certs before ROT / Flight Test PDF fill (#40). */
  enrichRecordForForms(record){
    if (!record) return;
    if (this.fullPilot&&this.fullPilot._id){
      if (!record.dateOfBirth) record.dateOfBirth=this.fullPilot.dateOfBirth;
      if (!record.medicalDate) record.medicalDate=this.fullPilot.medicalDate;
      if (!record.medicalClass) record.medicalClass=this.fullPilot.medicalClass;
      if (!record.medicalInterval) record.medicalInterval=this.fullPilot.medicalInterval;
      if (!record.cert) record.cert=this.fullPilot.cert;
      if (!record.certType) record.certType=this.fullPilot.certType;
      let legal=this.pilotLegalName(this.fullPilot);
      if (legal) record.name=legal;
      else if (!record.name) record.name=this.fullPilot.name;
      if (record.trainingType&&record.flightOrGround) {
        record.trainingTypeCombo=record.trainingType + ' ' + record.flightOrGround;
      }
      if (!Array.isArray(record.trainingTypeArray)) record.trainingTypeArray=[];
      if (record.trainingTypeArray.length===0) this.rebuildTrainingTypeArrayFromBooleans(record);
      else this.syncTrainingBooleansFromArray(record);
    }
    let instructorIndex=this.pilotRosterIndexByLabel(record.instructor);
    if (instructorIndex>-1) {
      record.instructorCert=this.pilots[instructorIndex].cert;
      record.instructorCertType=this.pilots[instructorIndex].certType;
    } else if (!record.instructorCert) record.instructorCert="";
    let checkAirmanIndex=this.pilotRosterIndexByLabel(record.checkAirman);
    if (checkAirmanIndex>-1) {
      record.checkAirmanCert=this.pilots[checkAirmanIndex].cert;
      record.checkAirmanCertType=this.pilots[checkAirmanIndex].certType;
    } else if (!record.checkAirmanCert) record.checkAirmanCert="";
    if (!record.eventResult || typeof record.eventResult !== 'object') record.eventResult={};
    if (!record.flightTestItems || typeof record.flightTestItems !== 'object') record.flightTestItems={};
    if (!Array.isArray(record.remarks)) record.remarks=[];
    if (record.result==='Satisfactory') record.result='S';
    if (record.result==='Unsatisfactory') record.result='U/S';
    if (!record.aircraftN) record.aircraftN=record.nNumber||record.tailNumber||record.acftNumber||'';
    if (!record.flightTime) record.flightTime=record.hours||'';
  }

  pdfFormCertType(raw){
    if (!raw) return '';
    const u=String(raw).toUpperCase();
    if (u==='ATP'||u==='ATP/') return 'ATP/';
    return 'COMM/';
  }

  /** ROT curriculum / cert line: instructor, else check airman (checkrides often omit instructor). */
  rotPdfSigner(record){
    const name=record&&record.instructor;
    if (name&&name!=='none'&&name!=='not listed') return name;
    const check=record&&record.checkAirman;
    if (check&&check!=='none') return check;
    return '';
  }

  rotPdfSignerCert(record){
    const signer=this.rotPdfSigner(record);
    if (!signer) return '';
    if (signer===record.instructor) return record.instructorCert||'';
    if (signer===record.checkAirman) return record.checkAirmanCert||'';
    return '';
  }

  pdfFieldScalar(raw){
    if (raw===undefined||raw===null) return undefined;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }

  pdfSelectChoice(field, str){
    const opts=field.getOptions();
    if (opts.indexOf(str)>=0) {
      field.select(str);
      return;
    }
    const monthAbbr={
      JANUARY:'JAN', FEBRUARY:'FEB', MARCH:'MAR', APRIL:'APR', MAY:'MAY', JUNE:'JUN',
      JULY:'JUL', AUGUST:'AUG', SEPTEMBER:'SEP', OCTOBER:'OCT', NOVEMBER:'NOV', DECEMBER:'DEC'
    };
    const abbr=monthAbbr[String(str).toUpperCase()];
    if (!abbr) return;
    for (let i=0;i<opts.length;i++) {
      if (String(opts[i]).split('/').indexOf(abbr)>=0) {
        field.select(opts[i]);
        return;
      }
    }
  }

  /** Flight Test 297 Dropdown5: template pairs, base month first then +6 (March → MAR/SEP). */
  pdf297MonthPair(baseMonth){
    const abbrs=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const i=this.months.indexOf(baseMonth);
    if (i<0) return '';
    return abbrs[i]+'/'+abbrs[(i+6)%12];
  }

  fillAndFlattenPdf(buf, fields, keepEditable){
    const lib=(typeof window!=='undefined'&&window.PDFLib)?window.PDFLib:null;
    if (!lib||!lib.PDFDocument) {
      return Promise.reject(new Error('PDF flatten library not loaded'));
    }
    const PDFTextField=lib.PDFTextField;
    const PDFCheckBox=lib.PDFCheckBox;
    const PDFDropdown=lib.PDFDropdown;
    const PDFOptionList=lib.PDFOptionList;
    const PDFRadioGroup=lib.PDFRadioGroup;
    const PDFSignature=lib.PDFSignature;
    const keep={};
    (keepEditable||[]).forEach(name=>{ keep[name]=true; });
    return lib.PDFDocument.load(buf).then(pdfDoc=>{
      const form=pdfDoc.getForm();
      Object.keys(fields).forEach(name=>{
        const val=this.pdfFieldScalar(fields[name]);
        if (val===undefined||val===null) return;
        let field;
        try { field=form.getField(name); } catch (e) { return; }
        if (field instanceof PDFTextField) {
          field.setText(val===true?'X':String(val));
          return;
        }
        if (field instanceof PDFCheckBox) {
          const on=val===true||val==='X'||val==='Yes'||val==='true'||val==='On';
          if (on) field.check();
          else field.uncheck();
          return;
        }
        if (field instanceof PDFDropdown||field instanceof PDFOptionList) {
          const str=String(val);
          if (!str) return;
          this.pdfSelectChoice(field, str);
          return;
        }
        if (field instanceof PDFRadioGroup) {
          try { field.select(String(val)); } catch (e) {}
        }
      });
      form.getFields().slice().forEach(field=>{
        if (PDFSignature&&field instanceof PDFSignature) {
          try { form.removeField(field); } catch (e) {}
        }
      });
      Object.keys(keep).forEach(name=>{
        try {
          const field=form.getField(name);
          if (field instanceof PDFTextField && field.disableReadOnly) field.disableReadOnly();
        } catch (e) {}
      });
      form.updateFieldAppearances();
      const origGetFields=form.getFields.bind(form);
      form.getFields=function(){
        return origGetFields().filter(function(field){
          try { return !keep[field.getName()]; } catch (e) { return true; }
        });
      };
      form.flatten({updateFieldAppearances: false});
      form.getFields=origGetFields;
      return pdfDoc.save();
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
    this.ensureDraftRow();
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
      const index=this.records.indexOf(record);
      this.loading=true;
      this.persistRecord(record,index,{skipNewRow:true,silent:true}).then(saved=>{
        const rec=saved||record;
        if (PDFFileName==='FlightTest' && this.rotFlightTestItems.needsPopup(rec)) {
          this.loading=false;
          this.openFlightTestItemsModal(rec, PDFFileName);
          return;
        }
        this.generatePdf(rec,PDFFileName);
      }).catch(err=>{
        this.loading=false;
        this.persistRecordError(err);
      });
  }

  openFlightTestItemsModal(record, PDFFileName){
      this._pendingPdfName=PDFFileName||null;
      const existing=record.flightTestItems||{};
      const items=this.rotFlightTestItems.items.map(item=>{
        return Object.assign({}, item, {required: this.rotFlightTestItems.isItemRequired(item, record)});
      });
      const grades={};
      items.forEach(item=>{
        const cur=existing[String(item.n)]||existing[item.n];
        if (cur===undefined||cur===null||cur==='') grades[item.n]=item.required?'S':'-';
        else grades[item.n]=cur;
      });
      const remarks=(record.remarks||[]).join('; ');
      this.flightTestItemsModal(record, items, grades, remarks);
  }

  generatePdf(pilot,PDFFileName) {
      if (!pilot||!pilot.date) {
        this.loading=false;
        return this.toaster.error('Error','Check this records for completeness before loading a form from it');
      }
      this.enrichRecordForForms(pilot);
      const isRot=PDFFileName==="ROT";
      const signer=this.rotPdfSigner(pilot);
      const signerCert=this.rotPdfSignerCert(pilot);
      const certLine=signer?(signerCert?signer+'/'+signerCert:signer):'';
      const baseMonthUpper=pilot.baseMonth?String(pilot.baseMonth).toUpperCase():'';
      let certType = this.pdfFormCertType(pilot.certType)||'ATP/';
      let medClass="FIRST";
      if (pilot.medicalClass&&pilot.medicalClass.toUpperCase()!=="FIRST") medClass="SECOND";
      let trainingClass;
      if (pilot.trainingType) trainingClass=String(pilot.trainingType).toUpperCase();
      else if (pilot.trainingTypeCombo) {
        const first=pilot.trainingTypeCombo.split(' ')[0];
        if (first&&first.toLowerCase()!=='undefined') trainingClass=first.toUpperCase();
      }
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
      var fields={"Cert Type1":[certType],
                  "CertType":[certType],
                  "Pilots Name":[this.pilotLegalName(pilot)||pilot.name],
                  "Date of Birth":[pilot.dateOfBirth],
                  "Cert Number":[pilot.cert],
                  "Medical Class":[medClass],
                  "Medical EXP":[pilot.medicalDate],
                  "Date of Check":[dateObj],
                  "Check Airman":[pilot.checkAirman||''],
                  "Check Airman Cert #":[pilot.checkAirmanCert||''],
                  "Group44":["44"],
                  "44":"X",
                  "BaseMonth":[baseMonthUpper],
                  "NewBaseMonth":[nbm],
                  "Group24":["X"],
                  "Text1":[certLine]
      };
      if (!isRot && trainingClass) fields.Dropdown19=[trainingClass];
      if (!isRot && pilot.checkAirman) {
        fields['Cert Type2']=[this.pdfFormCertType(pilot.checkAirmanCertType)||''];
      }
      const tail=pilot.aircraftN||pilot.nNumber||pilot.tailNumber||pilot.acftNumber;
      const hours=pilot.flightTime||pilot.hours;
      if (tail) fields['Aircraft N']=[String(tail)];
      if (hours) fields['Flight Time']=[String(hours)];
      const hasC208Flight=pilot.C208PIC==="true";
      const hasC208Ground=pilot.C208Ground==="true";
      const hasBE20Flight=pilot.BE20PIC==="true";
      const hasBE20Ground=pilot.BE20Ground==="true";
      const hasB190Flight=pilot.B190PIC==="true"||pilot.B190SIC==="true";
      const hasB190Ground=pilot.B190Ground==="true";
      const hasC408Flight=pilot.C408PIC==="true"||pilot.C408SIC==="true";
      const hasC408Ground=pilot.C408Ground==="true";
      const hasC212Flight=pilot.C212PIC==="true"||pilot.C212SIC==="true";
      const hasC212Ground=pilot.C212Ground==="true";
      const hasAnyFlight=hasC208Flight||hasBE20Flight||hasB190Flight||hasC408Flight||hasC212Flight;
      const hasAnyGround=hasC208Ground||hasBE20Ground||hasB190Ground||hasC408Ground||hasC212Ground;
      const setRotFtAcType=function(type){
        if (!isRot) {
          fields['AC Type']=[type];
          fields.Dropdown25=[type];
          fields.Dropdown26=[type];
          return;
        }
        if (hasAnyGround) {
          fields.Dropdown25=[type];
          fields.Dropdown26=[type];
        }
        if (hasAnyFlight) fields.Dropdown17=[type];
      };
          let frequency,eventIndex;
          //switch (form.label) {
            if (pilot.BasicIndoc&&pilot.BasicIndoc==="true") {
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('BasicIndoc');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              if (!isRot) {
                fields["Check Box1"]=["X"];
                fields.Dropdown2=[baseMonthUpper];
                fields["BI TEST EXPIRATION"]=[this.pdfExpirationDate(pilot,'BasicIndocExp',frequency)];
              } else {
                fields["Instructor 1"]=[signer];
                fields.Dropdown1=["S"];
                fields["Date1_af_date"]=[dateObj];
                fields["Instructor 2"]=[signer];
                fields.Dropdown2=["S"];
                fields["Date2_af_date"]=[dateObj];
              }
            }
            if (pilot.far293a&&pilot.far293a==="true"&&!(pilot.BasicIndoc&&pilot.BasicIndoc==="true")) {
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far293a');
              frequency=eventIndex>-1?this.appConfig.trainingEvents[eventIndex].frequency:'12';
              if (!isRot) {
                fields["Check Box1"]=["X"];
                fields.Dropdown2=[baseMonthUpper];
                fields["BI TEST EXPIRATION"]=[this.pdfExpirationDate(pilot,'far293a148',frequency)];
              } else {
                fields["Instructor 1"]=[signer];
                fields.Dropdown1=["S"];
                fields["Date1_af_date"]=[dateObj];
                fields["Instructor 2"]=[signer];
                fields.Dropdown2=["S"];
                fields["Date2_af_date"]=[dateObj];
              }
            }
            if (hasAnyGround && isRot){
                fields["Instructor 8"]=[signer];
                fields.Dropdown8=["S"];
                fields["Date8_af_date"]=[dateObj];
                fields["Instructor 9"]=[signer];
                fields.Dropdown9=["S"];
                fields["Date9_af_date"]=[dateObj];
            }
            if (hasAnyFlight){
              frequency='12';
              if (!isRot) {
                const checkrideExp=this.primaryCheckrideExpKeyForRecord(pilot)||'C208PICExp';
                const ft293Exp=this.pdfExpirationDate(pilot,checkrideExp,frequency);
                fields["AC ORAL/WRITTEN EXP"]=[ft293Exp];
                fields.Dropdown3=[baseMonthUpper];
                fields["Check Box2"]=["X"];
                fields["293 EXP"]=[ft293Exp];
                fields.Dropdown4=[baseMonthUpper];
                fields["Check Box3"]=["X"];
              } else {
                fields["Instructor 10"]=[signer];
                fields.Dropdown10=["S"];
                fields["Date10_af_date"]=[dateObj];
              }
            }
            if (!isRot) {
              if (pilot.C208PIC==="true"||pilot.C408PIC==="true"||pilot.C212PIC==="true"||
                  pilot.B190PIC==="true"||pilot.BE20PIC==="true"){
                fields["Check Box7"]=["X"];
              }
              if (pilot.C408SIC==="true"||pilot.C212SIC==="true"||pilot.B190SIC==="true"){
                fields["Check Box8"]=["X"];
              }
            }
            if (hasC208Flight||hasC208Ground) setRotFtAcType("C208");
            if (hasBE20Flight||hasBE20Ground) setRotFtAcType("BE20");
            if (hasB190Flight||hasB190Ground) setRotFtAcType("B190");
            if (hasC408Flight||hasC408Ground) setRotFtAcType("C408");
            if (hasC212Flight||hasC212Ground) setRotFtAcType("C212");
            if (pilot['far299']&&pilot['far299']==="true"&&!isRot) {
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far299');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              fields["Check Box6"]=["X"];
              fields.Dropdown4=[baseMonthUpper];
              fields.Dropdown7=[baseMonthUpper];
              fields["299 Enroute Check EXP"]=[this.pdfExpirationDate(pilot,'far299Exp',frequency)];
            }
            if (pilot['far297g']&&pilot['far297g']==="true"&&!isRot) {
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far297g');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              fields["297(G) Autopilot EXP"]=[this.pdfExpirationDate(pilot,'far297gExp',frequency)];
              fields.Dropdown6=[baseMonthUpper];
              fields["Check Box5"]=["X"];
            }
            if (pilot['far297']&&pilot['far297']==="true"&&!isRot) {
              eventIndex = this.appConfig.trainingEvents.map(e => e.name).indexOf('far297');
              frequency=this.appConfig.trainingEvents[eventIndex].frequency;
              fields["Check Box4"]=["X"];
              const pair=this.pdf297MonthPair(pilot.baseMonth);
              if (pair) fields.Dropdown5=[pair];
              fields["297 EXP"]=[this.pdfExpirationDate(pilot,'far297Exp',frequency)];
            }
            if (pilot.Hazmat&&pilot.Hazmat==="true"&&isRot) {
                fields["Instructor 3"]=[signer];
                fields.Dropdown3=["S"];
                fields["Date3_af_date"]=[dateObj];
            }
            if (!isRot) {
              this.rotFlightTestItems.items.forEach(item=>{
                const raw=(pilot.flightTestItems&&(pilot.flightTestItems[String(item.n)]||pilot.flightTestItems[item.n]))||'';
                fields[item.pdfField]=[this.rotFlightTestItems.pdfGrade(raw)];
              });
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
          this.fillAndFlattenPdf(response.data, fields).then(filled_pdf=>{
  		    var blob = new Blob([filled_pdf], {type: 'application/pdf'});
  		    let pdfPilotName=(this.pilotLegalName(pilot)||pilot.name||'pilot').replace(/\s+/g,'_');
  		    var filename=PDFFileName + "_" + pdfPilotName + '_' + year + '_' + month + '_' + day + '.pdf';
  	      saveAs(blob, filename);
  	      this.loading=false;
          }).catch(err=>{
            alert(err);
            console.log(err);
            this.loading=false;
          });
        }).catch(err=>{
          alert(err);
          console.log(err);
          this.loading=false;
        });
    }
}

RecordsComponent.$inject = ['$scope','$timeout','$interval','$http','rotAppConfig','rotFlightTestItems','Modal','categoryFilterFilter','$state','Auth','RotPilotContext','RotAccess','rotPilotExpDate'];

angular.module('workspaceApp')
  .filter('monthYear', ['rotPilotExpDate', function(rotPilotExpDate) {
    return function(dateStr) {
      return rotPilotExpDate.formatPilotExpDate(dateStr) || '';
    };
  }])
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
