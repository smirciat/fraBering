'use strict';

(function(){

const HELI_TYPE_RE = /(astar|robinson|md500|huey|r44|r-44|helicopter|heli)/i;

function csvCell(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/,/g, '-');
}

function finiteNumber(val) {
  if (val === undefined || val === null || val === '') return null;
  let n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

function isHelicopterPfr(pfr) {
  if (!pfr) return false;
  if (pfr.isHelicopter) return true;
  return HELI_TYPE_RE.test(String(pfr.acftType || ''));
}

function legHasWeightBalance(leg) {
  if (!leg) return false;
  return finiteNumber(leg.mgtow) !== null || finiteNumber(leg.tow) !== null || finiteNumber(leg.cg) !== null;
}

/**
 * Certified max takeoff weight. Casa and Sky Courier are load-sheet mgtowLimit.
 * Caravan is the gross cap on the flight-release modal. King Air and Beech 1900
 * are the MGTOW Flight Report locks on every leg of that type.
 */
function structuralMgtow(acftType) {
  let t=String(acftType||'').toLowerCase();
  if (t.indexOf('courier')>=0||t.indexOf('c408')>=0) return 19000;
  if (t.indexOf('casa')>=0||t.indexOf('c212')>=0) return 16976;
  if (t.indexOf('caravan')>=0||t.indexOf('c208')>=0) return 9062;
  if (t.indexOf('king')>=0||t.indexOf('be20')>=0) return 12500;
  if (t.indexOf('1900')>=0||t.indexOf('b190')>=0) return 17120;
  return null;
}

/** Fore/aft takeoff CG on the Flight Report leg. They move with that leg's weight. Both zero means the record has no envelope. */
function legCgLimits(leg) {
  let fwd=finiteNumber(leg&&leg.cgFWDLimit);
  let aft=finiteNumber(leg&&leg.cgAFTLimit);
  if (fwd===null&&aft===null) return null;
  if ((fwd===null||fwd===0)&&(aft===null||aft===0)) return null;
  if (fwd===null) fwd=aft;
  if (aft===null) aft=fwd;
  return {fwd:Math.min(fwd, aft), aft:Math.max(fwd, aft)};
}

function legRoute(leg) {
  if (!leg) return '';
  if (leg.route) return String(leg.route);
  let from = leg.from || leg.dep || leg.origin || '';
  let to = leg.to || leg.arr || leg.destination || '';
  if (from || to) return String(from) + '-' + String(to);
  return '';
}

class AuditComponent {
  constructor($http,$state,$timeout,$scope,Auth,Util) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.Auth=Auth;
    this.Util=Util;
    this.startDate=new Date(new Date().setDate(new Date().getDate()-1));
    this.startDate.setHours(10);
    this.startDateStringFormatted=this.startDate.toLocaleDateString();
    this.endDate=new Date();
    this.endDate.setHours(14);
    this.endDateStringFormatted=this.endDate.toLocaleDateString();
    this.refreshPfr=true;
    this.firstLeg=true;
    this.pilots=[];
    this.pfrs=[];
    this.flights=[];
    this.selectedItems = { multipleSelect: [] };
    this.pfrQuery={collection:'flights',limit:3000,parameter:'date',operator:'>=',value:this.startDate,
        parameter2:'date',operator2:'<=',value2:this.endDate,timestampBoolean:true};
  }
  
  $onInit(){
    this.setPilots();
    this.setFlights();
    this.pilotEmpNumber = this.Util.pilotEmpNumber.bind(this.Util);
    this.scope.$watch('audit.selectedItems.multipleSelect', (newValues, oldValues)=> {
      if (newValues !== oldValues && oldValues) {
        this.flightKeys.forEach(obj=>{obj.selected=false});
        console.log(newValues)
        newValues.forEach(selected=>{
          let index=this.flightKeys.findIndex(e=>e.key===selected.key&&e.collection===selected.collection);
          if (index>-1) this.flightKeys[index].selected=true;
        });
        window.localStorage.setItem('flightKeys',JSON.stringify(this.flightKeys));
      }
    }, true);
  }
  
  setPilots(){
    this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.pilots=res.data.filter(p=>{return p.isActive&&p.displayName!=='App Checker'});
      this.pilots.sort((a,b)=>{
        return a.lastName.localeCompare(b.lastName)||a.firstName.localeCompare(b.firstName);
      });
      this.pilots.unshift({displayName:"None"});
    });
  }
  
  async setFlights(){
    this.flightKeys=[];
    let temp=window.localStorage.getItem('flightKeys');
    if (temp) this.flightKeys=JSON.parse(temp);
    let date=new Date(this.startDate).toLocaleDateString();
    let res=await this.http.post('/api/todaysFlights/dayFlights',{dateString:date});
    this.flights=res.data;
    for (let flight of this.flights){
      flight.origin='OME';
      flight.destination='WMO';
      for (let key in flight){
        let index=this.flightKeys.findIndex(e => e.key === key && e.collection === 'flights');
        let info=typeof flight[key];
        let combo=key + ' - from flights, example: ' + flight[key];
        let obj={key:key,
              info:info,collection:'flights',
              combo:combo};
        if (info==='string'||info==='number'||info==='boolean'||(info==='object'&&flight[key] instanceof Date)){
          if (info==='object') info='date';
          if (index===-1) this.flightKeys.push(obj);
          else {
            obj.selected=this.flightKeys[index].selected;
            this.flightKeys[index]=obj;
          }
        }
      }
      for (let key in flight.airportObjs[0]){
        let index=this.flightKeys.findIndex(e => e.key === key && e.collection === 'airportObjs');
        let info=typeof flight.airportObjs[0][key];
        let combo=key + ' - from flights, example: ' + flight.airportObjs[0][key];
        let obj={key:key,
              info:info,collection:'airportObjs',
              combo:combo};
        if (info==='string'||info==='number'||info==='boolean'||(info==='object'&&flight.airportObjs[0][key] instanceof Date)){
          if (info==='object') info='date';
          if (index===-1) this.flightKeys.push(obj);
          else {
            obj.selected=this.flightKeys[index].selected;
            this.flightKeys[index]=obj;
          }
        }
      }
      for (let key in flight.pfr){
        let index=this.flightKeys.findIndex(e => e.key === key && e.collection === 'pfrs');
        let info=typeof flight.pfr[key];
        let e=flight.pfr[key];
        if (key==='date') e=flight.pfr[key]._seconds;
        let combo=key + ' - from pfrs, example: ' + e;
        let obj={key:key,
              info:info,collection:'pfrs',
              combo:combo};
        if (info==='string'||info==='number'||info==='boolean'||(info==='object'&&(flight.pfr[key] instanceof Date||(flight.pfr[key]&&flight.pfr[key]._seconds)))){
          if (info==='object') obj.info='date';
          if (index===-1) this.flightKeys.push(obj);
          else {
            obj.selected=this.flightKeys[index].selected;
            this.flightKeys[index]=obj;
          }
        }
      }
      if (flight.pfr) {
        for (let key in flight.pfr.legArray[0]){
          let index=this.flightKeys.findIndex(e => e.key === key && e.collection === 'legArray');
          let info=typeof flight.pfr.legArray[0][key];
          let e=flight.pfr.legArray[0][key];
          if (flight.pfr.legArray[0][key]&&typeof flight.pfr.legArray[0][key]==="object"&&flight.pfr.legArray[0][key]._seconds) e=flight.pfr.legArray[0][key]._seconds;
          let combo=key + ' - from legArray (pfr), example: ' + e;
          let obj={key:key,
                info:info,collection:'legArray',
                combo:combo};
          if (info==='string'||info==='number'||info==='boolean'||(info==='object'&&(flight.pfr.legArray[0][key] instanceof Date||flight.pfr.legArray[0][key]._seconds))){
            if (info==='object') obj.info='date';
            if (index===-1) this.flightKeys.push(obj);
            else {
              obj.selected=this.flightKeys[index].selected;
              this.flightKeys[index]=obj;
            }
          }
        }
      }
    }
    console.log(this.flightKeys);
    window.localStorage.setItem('flightKeys',JSON.stringify(this.flightKeys));
    this.flightKeys.forEach(obj=>{
      if (obj.selected) this.selectedItems.multipleSelect.push(obj);
    });
    
  }
  
  setPfrs(){
    return this.http.post('/api/airplanes/firebaseQuery',this.pfrQuery).then(res=>{
      this.pfrs=res.data;
    });
  }
  
  upDate(param){
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.startDateStringFormatted=this.startDate.toLocaleDateString();
    this.startDate.setHours(10);
    this.endDateStringFormatted=this.endDate.toLocaleDateString();
    this.endDate.setHours(14);
    this.pfrQuery={collection:'flights',limit:3000,parameter:'date',operator:'>=',value:this.startDate,
        parameter2:'date',operator2:'<=',value2:this.endDate,timestampBoolean:true};
    if (this.pilot&&this.pilot.displayName==="None") this.pilot=undefined;
  }
  
  entry(element){
    if (element==="startDate") this.startDate=new Date(this.startDateStringFormatted);
    else this.endDate=new Date(this.endDateStringFormatted);
    this.upDate(element);
  }
  
  daysBetween(date1, date2) {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }

  /** Same data path as setFlights / custom audit — dayFlights per calendar day. */
  async fetchFlightsInRange(startDate, endDate) {
    let flights = [];
    let seen = {};
    let cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    let end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      let res = await this.http.post('/api/todaysFlights/dayFlights', {
        dateString: cursor.toLocaleDateString()
      });
      res.data.forEach(f => {
        let id = f._id != null ? f._id : (f.date + '|' + f.flightNum);
        if (!seen[id]) {
          seen[id] = true;
          flights.push(f);
        }
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return flights;
  }
  
  async createCSVCustom(){
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.spinner=true;
    this.csv="";
    let keys=[];
    this.flightKeys.forEach((obj,i)=>{
      if (obj.selected) {
        keys.push(obj);
        this.csv+=obj.key+',';
      }
      if (i===this.flightKeys.length-1) {
        this.csv=this.csv.slice(0, -1);
        this.csv+="\r\n";
      }
    });
    let startInt=new Date(this.startDate).getDate();
    let endInt=startInt+this.daysBetween(new Date(this.startDate),new Date(this.endDate))-1;
    for (let x=startInt;x<=endInt;x++) {
      let date=new Date(this.startDate);
      date.setDate(x);
      let d=new Date(date);
      let month = String(d.getMonth() + 1).padStart(2, '0');
      let day = String(d.getDate()).padStart(2, '0');
      let year = String(d.getFullYear()).slice(-2);
      let formattedDate=month+'/'+day+'/'+year;
      let pfrs=[];
      if (this.refreshPfr) {
        pfrs=await this.http.post('/api/airplanes/firebaseQuery',
            {collection:'flights',parameter:'dateString',value:formattedDate,limit:300});
        pfrs=pfrs.data;
      }
      let res=await this.http.post('/api/todaysFlights/dayFlights',{dateString:date.toLocaleDateString()});
      let flights=res.data;
      //if (this.pilot) flights=flights.filter(p=>{return p.pilot===this.pilot.displayName});
      if (this.allLegs){
        if (flights.length>0){
          let expandedFlights=[];
          flights.forEach(flight=>{
            //grab pfr from firebase if option selected, will take longer but improve accuracy
            let pfrIndex=pfrs.findIndex(e=>e.flightNumber===flight.flightNum);
            if (pfrIndex>-1) flight.pfr=pfrs[pfrIndex];
            for (let x=0;x<flight.airports.length-1;x++){
              let f=angular.copy(flight);
              f.flightNum=f.flightNum+'.'+x;
              f.origin=f.airports[x];
              f.destination=f.airports[x+1];
              f.airportObj=f.airportObjs[x];
              if (f.pfr) f.pfr.leg=f.pfr.legArray[x];
              expandedFlights.push(f);
            }
          });
          flights=expandedFlights;
        }
        else {
          let expandedPfrs=[];
          pfrs.forEach(pfr=>{
            for (let x=0;x<pfr.legArray.length;x++){
              let f=angular.copy(pfr);
              f.flightNumber=f.flightNumber+'.'+x;
              f.leg=f.legArray[x];
              expandedPfrs.push(f);
            }
          });
          pfrs=expandedPfrs;
        }
      }
      flights.sort((a,b)=>{
        return a.pilot.localeCompare(b.pilot);
      });
      for(const flight of flights){
        keys.forEach((obj,i)=>{
          if (obj.collection==='flights') {
            if (flight[obj.key]&&typeof flight[obj.key]==='string') flight[obj.key]=flight[obj.key].replaceAll(',','-');
            this.csv+=flight[obj.key]+',';
          }
          if (obj.collection==='airportObjs') {
            let airportObj=flight.airportObjs[0];
            if (flight.airportObj) airportObj=flight.airportObj;
            if (airportObj[obj.key]&&typeof airportObj[obj.key]==='string') airportObj[obj.key]=airportObj[obj.key].replaceAll(',','-');
            this.csv+=airportObj[obj.key]+',';
          }
          if (obj.collection==='pfrs'){
            if (flight.pfr) {
              if (flight.pfr[obj.key]&&typeof flight.pfr[obj.key]==='string') flight.pfr[obj.key]=flight.pfr[obj.key].replaceAll(',','-');
              if (obj.info==='date') {
                if (flight.pfr[obj.key]) this.csv+=flight.pfr[obj.key]._seconds+',';
                else this.csv+=',';
              }
              else this.csv+=flight.pfr[obj.key]+',';
            }
            else this.csv+=',';
          }
          if (obj.collection==='legArray'){
            if (flight.pfr&&(this.firstLeg||this.allLegs)) {
              let leg=flight.pfr.leg||flight.pfr.legArray[0];
              if (leg[obj.key]&&typeof leg[obj.key]==='string') leg[obj.key]=leg[obj.key].replaceAll(',','-');
              if (obj.info==='date') {
                if (leg[obj.key]) this.csv+=leg[obj.key]._seconds+',';
                else this.csv+=',';
              }
              else this.csv+=leg[obj.key]+',';
            }
            else this.csv+=',';
          }
          if (i===keys.length-1) {
            this.csv=this.csv.slice(0, -1);
            this.csv+="\r\n";
          }
        });
      }
      if (flights.length===0){
        for (let pfr of pfrs){
          keys.forEach((obj,i)=>{
            if (obj.collection==='flights'||obj.collection==='airportObjs') {
              this.csv+=',';
            }
            if (obj.collection==='pfrs'){
              if (pfr) {
                if (pfr[obj.key]&&typeof pfr[obj.key]==='string') pfr[obj.key]=pfr[obj.key].replaceAll(',','-');
                if (obj.info==='date') {
                  if (pfr[obj.key]) this.csv+=pfr[obj.key]._seconds+',';
                  else this.csv+=',';
                }
                else this.csv+=pfr[obj.key]+',';
              }
              else this.csv+=',';
            }
            if (obj.collection==='legArray'){
              if (this.firstLeg||this.allLegs) {
                let leg=pfr.leg||pfr.legArray[0];
                if (leg[obj.key]&&typeof leg[obj.key]==='string') leg[obj.key]=leg[obj.key].replaceAll(',','-');
                if (obj.info==='date') {
                  if (leg[obj.key]) this.csv+=leg[obj.key]._seconds+',';
                  else this.csv+=',';
                }
                else this.csv+=leg[obj.key]+',';
              }
              else this.csv+=',';
            }
            if (i===keys.length-1) {
              this.csv=this.csv.slice(0, -1);
              this.csv+="\r\n";
            }
          });
        }
      }
    }
    this.spinner=false;
    console.log(this.csv);
    this.complete3=true;
    let blob = new Blob([ this.csv ], { type : 'text/plain' });
    this.url = (window.URL || window.webkitURL).createObjectURL( blob );
  }
  
  createCSVReleases(){
    this.customAudit=false;
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.spinner=true;
    let date=new Date(this.startDate);
    let date1=new Date(this.endDate);
    return this.fetchFlightsInRange(date, date1).then(flights=>{
      this.csv="PILOT,EMP #,DATE,FLIGHTNUM,AIRCRAFT,FIKI,PILOT SIG,DISPATCH SIG,OC SIG,ROUTING,BASE WX,OTHER WX\r\n";
      console.log(flights);
      //if (this.pilot) flights=flights.filter(p=>{return p.pilot===this.pilot.displayName});
      flights.sort((a,b)=>{
        if (!a.pilot) return -1;
        if (!b.pilot) return 1;
        return a.pilot.localeCompare(b.pilot);
      });
      for(const flight of flights){
        let raw='';
        let knownIce=flight.knownIce||'false';
        let pilotAgree=flight.pilotAgree||'';
        let dispatchRelease=flight.dispatchRelease||'';
        let ocRelease=flight.ocRelease||'';
        let routing=flight.airports.toString().replaceAll(',','-')||'';
        let csvValue=function(val){
          if (val===undefined||val===null) return '';
          return String(val).replaceAll(',','-');
        };
        if (flight.airportObjs[0]&&flight.airportObjs[0]['Raw-Report']) raw=flight.airportObjs[0]['Raw-Report'];
        let other='';
        if (flight.airportObjs.length>1) {
          for (let x=1;x<flight.airportObjs.length;x++){
            other+=flight.airportObjs[x]['Raw-Report']+',';
          }
        }
        let empNum=this.pilotEmpNumber(flight.pilotObject);
        this.csv+=flight.pilot+','+csvValue(empNum)+','+flight.date+','+flight.flightNum+','+flight.aircraft+','+knownIce+','+pilotAgree+','+dispatchRelease+','+ocRelease+','+routing+','+raw+','+other+'\r\n';
      }
      this.spinner=false;
      console.log(this.csv);
      this.complete2=true;
      let blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );
    });
  }
  
  createCSV(){
    this.customAudit=true;
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.spinner=true;
    return this.http.post('/api/airplanes/firebaseQuery',this.pfrQuery).then(res=>{
      this.csv="PILOT,DATE,FLIGHTNUM,AIRCRAFT,AIRCRAFT TYPE,OWE,FUEL,LOAD AVAILABLE,MGTOW,CG,OW,TOW\r\n";
      this.pfrs=res.data;
      let pfrs=this.pfrs;
      if (this.pilot) pfrs=this.pfrs.filter(p=>{return p.pilot===this.pilot.displayName});
      pfrs.sort((a,b)=>{
        return a.pilot.localeCompare(b.pilot)||b.dateString.localeCompare(a.dateString)||b.legArray[0].offTimeString.localeCompare(a.legArray[0].offTimeString);
      });
      for(const pfr of pfrs){
        if (!pfr.legArray) continue;
        if (!pfr.legArray[0]) pfr.legArray[0]={fuel:'no fuel entered'};
        this.csv+=pfr.pilot+','+pfr.dateString+','+pfr.flightNumber+','+pfr.acftNumber+','+pfr.acftType+','+pfr.owe+','+pfr.legArray[0].fuel+','+(pfr.legArray[0].mgtow*1-pfr.legArray[0].fuel*1-pfr.owe)+','+pfr.legArray[0].mgtow+','+pfr.legArray[0].cg+','+pfr.legArray[0].operatingWeight+','+pfr.legArray[0].tow+'\r\n';
      }
      this.spinner=false;
      console.log(this.csv);
      this.complete=true;
      let blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );
    });
    
  }

  createCSVSecurity(){
    this.customAudit=false;
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.spinner=true;
    let date=new Date(this.startDate);
    let date1=new Date(this.endDate);
    return this.fetchFlightsInRange(date, date1).then(flights=>{
      this.csv="DATE,TAIL #,TYPE,DISPATCHER,OC,PILOT,EMP #,CREW ID,COCKPIT,CABIN,CARGO,WHEEL WELL\r\n";
      if (this.pilot) flights=flights.filter(p=>{return p.pilot===this.pilot.displayName});
      flights.sort((a,b)=>{
        if (!a.dateObject&&!a.date) return 1;
        if (!b.dateObject&&!b.date) return -1;
        return new Date(a.dateObject||a.date)-new Date(b.dateObject||b.date)||(a.aircraft||'').localeCompare(b.aircraft||'');
      });
      for(const flight of flights){
        if (!flight.pilotAgree) continue;
        let aircraftType='';
        if (flight.equipment&&flight.equipment.short) aircraftType=flight.equipment.short;
        else if (flight.pfr&&flight.pfr.acftType) aircraftType=flight.pfr.acftType;
        let csvValue=function(val){
          if (val===undefined||val===null) return '';
          return String(val).replaceAll(',','-');
        };
        this.csv+=csvValue(flight.date)+','+csvValue(flight.aircraft)+','+csvValue(aircraftType)+','+
          csvValue(flight.dispatchRelease)+','+csvValue(flight.ocRelease)+','+csvValue(flight.pilotAgree)+','+
          csvValue(this.pilotEmpNumber(flight.pilotObject))+','+
          csvValue(flight.crewId)+','+csvValue(flight.cockpitInspection)+','+csvValue(flight.cabinInspection)+','+
          csvValue(flight.cargoInspection)+','+csvValue(flight.wheelWellInspection)+'\r\n';
      }
      this.spinner=false;
      this.complete4=true;
      let blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );
    });
  }

  /** Last 30 days of fixed-wing Flight Report legs. TOW vs that leg's MGTOW. CG vs cgFWDLimit/cgAFTLimit. MGTOW vs the type structural cap. */
  createCSVWeightBalance(){
    this.customAudit=false;
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
    this.complete4=false;
    this.complete5=false;
    this.spinner=true;
    let end=new Date();
    end.setHours(14,0,0,0);
    let start=new Date();
    start.setDate(start.getDate()-30);
    start.setHours(10,0,0,0);
    let query={
      collection:'flights',
      limit:3000,
      parameter:'date',
      operator:'>=',
      value:start,
      parameter2:'date',
      operator2:'<=',
      value2:end,
      timestampBoolean:true
    };
    return this.http.post('/api/airplanes/firebaseQuery', query).then(res=>{
      let pfrs=res.data||[];
      let capped=pfrs.length>=3000;
      if (this.pilot&&this.pilot.displayName&&this.pilot.displayName!=='None') {
        pfrs=pfrs.filter(p=>p.pilot===this.pilot.displayName);
      }
      let rows=[];
      let over=0;
      let outside=0;
      let missing=0;
      let overStructural=0;
      pfrs.forEach(pfr=>{
        if (isHelicopterPfr(pfr)||!pfr.legArray) return;
        pfr.legArray.forEach((leg, idx)=>{
          if (!legHasWeightBalance(leg)) return;
          let mgtow=finiteNumber(leg.mgtow);
          let tow=finiteNumber(leg.tow);
          let cg=finiteNumber(leg.cg);
          let status=[];
          if (mgtow===null||mgtow<=0||tow===null) {
            status.push('missing MGTOW or TOW');
            missing+=1;
          } else if (tow>mgtow) {
            status.push('over MGTOW');
            over+=1;
          } else {
            status.push('within MGTOW');
          }
          let limits=legCgLimits(leg);
          let fwd='';
          let aft='';
          if (!limits) {
            status.push('CG limits not on this record');
          } else if (cg===null||cg===0) {
            fwd=limits.fwd;
            aft=limits.aft;
            status.push('missing CG');
          } else if (cg<limits.fwd||cg>limits.aft) {
            fwd=limits.fwd;
            aft=limits.aft;
            status.push('outside CG');
            outside+=1;
          } else {
            fwd=limits.fwd;
            aft=limits.aft;
            status.push('within CG');
          }
          let structural=structuralMgtow(pfr.acftType);
          if (structural!==null&&mgtow!==null&&mgtow>structural) {
            status.push('MGTOW above structural');
            overStructural+=1;
          }
          rows.push({
            date:pfr.dateString||'',
            flight:pfr.flightNumber||'',
            tail:pfr.acftNumber||'',
            type:pfr.acftType||'',
            pilot:pfr.pilot||'',
            leg:idx+1,
            route:legRoute(leg),
            mgtow:mgtow===null?'':mgtow,
            tow:tow===null?'':tow,
            structural:structural===null?'':structural,
            cg:cg===null?'':cg,
            fwd:fwd,
            aft:aft,
            status:status.join('; ')
          });
        });
      });
      rows.sort((a,b)=>{
        return String(a.date).localeCompare(String(b.date))||
          String(a.flight).localeCompare(String(b.flight))||
          a.leg-b.leg;
      });
      let lines=[];
      lines.push('LEGS CHECKED,OVER MGTOW,OUTSIDE CG,MISSING MGTOW OR TOW,MGTOW ABOVE STRUCTURAL');
      lines.push(rows.length+','+over+','+outside+','+missing+','+overStructural);
      lines.push('NOTE,CG limits are cgFWDLimit and cgAFTLimit on that leg. A CG of 0 counts as missing. Structural MGTOW is Caravan 9062, King Air 12500, Beech 1900 17120, Casa 16976, Sky Courier 19000.,,');
      if (capped) {
        lines.push('NOTE,Flight Report query returned 3000 flights. Older days in this window may be missing.,,');
      }
      lines.push('DATE,FLIGHT,TAIL,TYPE,PILOT,LEG,ROUTE,MGTOW,TOW,STRUCTURAL MGTOW,CG,FWD CG LIMIT,AFT CG LIMIT,STATUS');
      rows.forEach(row=>{
        lines.push([
          csvCell(row.date),
          csvCell(row.flight),
          csvCell(row.tail),
          csvCell(row.type),
          csvCell(row.pilot),
          csvCell(row.leg),
          csvCell(row.route),
          csvCell(row.mgtow),
          csvCell(row.tow),
          csvCell(row.structural),
          csvCell(row.cg),
          csvCell(row.fwd),
          csvCell(row.aft),
          csvCell(row.status)
        ].join(','));
      });
      this.csv=lines.join('\r\n')+'\r\n';
      this.spinner=false;
      this.complete5=true;
      let blob=new Blob([this.csv], {type:'text/plain'});
      this.url=(window.URL||window.webkitURL).createObjectURL(blob);
    }, ()=>{
      this.spinner=false;
    });
  }
}

angular.module('workspaceApp')
  .component('audit', {
    templateUrl: 'app/audit/audit.html',
    controller: AuditComponent,
    controllerAs: 'audit'
  });

})();

