'use strict';

(function(){

class AuditComponent {
  constructor($http,$state,$timeout,$scope,Auth) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.Auth=Auth;
    this.startDate=new Date();
    this.startDate.setHours(10);
    this.startDateStringFormatted=this.startDate.toLocaleDateString();
    this.endDate=new Date();
    this.endDate.setHours(14);
    this.endDateStringFormatted=this.endDate.toLocaleDateString();
    this.pilots=[];
    this.pfrs=[];
    this.pfrQuery={collection:'flights',limit:3000,parameter:'date',operator:'>=',value:this.startDate,
        parameter2:'date',operator2:'<=',value2:this.endDate,timestampBoolean:true};
  }
  
  $onInit(){
    this.setPilots();
    
    
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
  
  createCSVReleases(){
    this.complete=false;
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
      this.complete=true;
      let blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );
    });
  }
  
  createCSV(){
    this.complete=false;
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
