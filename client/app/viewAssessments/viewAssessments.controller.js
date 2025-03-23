'use strict';

(function(){

class ViewAssessmentsComponent {
  constructor($http,moment) {
    this.pilots=[{name:'Me'},{name:'him'}];
    this.myDate=new Date();
    this.moment=moment;
    this.http=$http;
    this.pilotFilter="";
    this.dateFilter=null;
    this.colorFilter="";
    //$http.get('/api/assessments').then(response=>{
      //this.assessments=response.data;
      //this.assessments.forEach(assessment=>{
        //assessment.expand=false;
      //);
      //this.assessmentsDisplay=angular.copy(this.assessments);
    //});
    //$http.get('/api/pilots').then(response=>{
     // this.pilots=response.data;
      //this.pilots.unshift({name:''});
      //this.pilots.unshift({name:'--Show All Pilots'});
    //});
    this.colorList=[{color:'Red',class:'md-red'},
                    {color:'Yellow',class:'md-yellow'},
                    {color:'Orange',class:'md-orange'},
                    {color:'Green',class:'md-green'}];
  }
  
  $onInit(){
    this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.pilots=res.data.filter(pilot=>{
        return pilot.pilotBase;
      });
      this.pilots.unshift({displayName:''});
      this.pilots.unshift({displayName:'--Show All Pilots'});
    });
    this.http.get('/api/assessments').then(response=>{
      this.assessments=response.data;
      this.assessments.forEach(assessment=>{
        console.log(assessment);
        assessment.expand=false;
        assessment.colors=[];
        assessment.airports=[];
        assessment.metars=[];
        assessment.tafs=[];
        assessment.visibilities=[];
        assessment.ceilings=[];
        assessment.windGusts=[];
        assessment.runwayConditions=[];
        assessment.freezingPrecipitations=[];
        if (assessment.airportObjs){
         assessment.airportObjs.forEach(metarObj=>{
          if (!metarObj.airport) metarObj.airport={};
          let color=metarObj.color||'airport-green';
          if (metarObj.night) color+=' night';
          assessment.colors.push(color);
          assessment.airports.push(metarObj.airport.name);
          assessment.metars.push(metarObj['Raw-Report']);
          assessment.tafs.push(metarObj.taf);
          assessment.visibilities.push(metarObj.Visibility);
          assessment.ceilings.push(metarObj.Ceiling);
          assessment.windGusts.push(metarObj['Wind-Gust']);
          assessment.runwayConditions.push(metarObj.airport.runwayScore);
          assessment.freezingPrecipitations.push('');
        });
        }
      });
      this.assessmentsDisplay=angular.copy(this.assessments);
    });
  }
  
  expand(index){
    this.assessmentsDisplay[index].expand = !this.assessmentsDisplay[index].expand;
  }
  
  filter(){
    this.assessmentsDisplay=angular.copy(this.assessments);
    if (this.pilotFilter!=="") {
      this.assessmentsDisplay=this.assessmentsDisplay.filter(assessment=>{
        return this.pilotFilter===assessment.pilot;
      });
    }
    if (this.dateFilter) this.assessmentsDisplay=this.assessmentsDisplay.filter(assessment=>{
      return this.moment(this.myDate).isSame(this.moment(assessment.date),'day');
    });
  }
  
  setPilot(pilotName){
    if (pilotName==="--Show All Pilots") this.pilotFilter="";
    else this.pilotFilter=pilotName;
    this.filter();
  }
  
  setDate(choice){
    if (choice==="All") {
      this.dateFilter=null;
      this.myDate=new Date();
    }
    else this.dateFilter=this.myDate;
    this.filter();
  }
}

angular.module('workspaceApp')
  .component('viewAssessments', {
    templateUrl: 'app/viewAssessments/viewAssessments.html',
    controller: ViewAssessmentsComponent,
    controllerAs: 'viewAssessments',
    authenticate:'superadmin'
  });

})();
