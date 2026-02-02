'use strict';

(function(){

class AuditComponent {
  constructor($http,$state,$timeout,$scope,Auth) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.Auth=Auth;
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
  
  async createCSVCustom(){
    this.complete=false;
    this.complete2=false;
    this.complete3=false;
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
    this.spinner=true;
    let date=new Date(this.startDate).toLocaleDateString();
    return this.http.post('/api/todaysFlights/dayFlights',{dateString:date}).then(res=>{
      this.csv="PILOT,DATE,FLIGHTNUM,AIRCRAFT,FIKI,PILOT SIG,DISPATCH SIG,OC SIG,ROUTING,BASE WX,OTHER WX\r\n";
      console.log(res.data);
      let flights=res.data;
      //if (this.pilot) flights=flights.filter(p=>{return p.pilot===this.pilot.displayName});
      flights.sort((a,b)=>{
        return a.pilot.localeCompare(b.pilot);
      });
      for(const flight of flights){
        let raw='';
        let knownIce=flight.knownIce||'false';
        let pilotAgree=flight.pilotAgree||'';
        let dispatchRelease=flight.dispatchRelease||'';
        let ocRelease=flight.ocRelease||'';
        let routing=flight.airports.toString().replaceAll(',','-')||'';
        if (flight.airportObjs[0]&&flight.airportObjs[0]['Raw-Report']) raw=flight.airportObjs[0]['Raw-Report'];
        let other='';
        if (flight.airportObjs.length>1) {
          for (let x=1;x<flight.airportObjs.length;x++){
            other+=flight.airportObjs[x]['Raw-Report']+',';
          }
        }
        this.csv+=flight.pilot+','+flight.date+','+flight.flightNum+','+flight.aircraft+','+knownIce+','+pilotAgree+','+dispatchRelease+','+ocRelease+','+routing+','+raw+','+other+'\r\n';
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
}

angular.module('workspaceApp')
  .component('audit', {
    templateUrl: 'app/audit/audit.html',
    controller: AuditComponent,
    controllerAs: 'audit'
  });

})();
