'use strict';

(function(){

class ViewAssessmentsComponent {
  constructor($http,moment) {
    this.pilots=[{name:'Me'},{name:'him'}];
    this.myDate=new Date();
    this.moment=moment;
    this.pilotFilter="";
    this.dateFilter=null;
    this.colorFilter="";
    $http.get('/api/assessments').then(response=>{
      this.assessments=response.data;
      this.assessments.forEach(assessment=>{
        assessment.expand=false;
      });
      this.assessmentsDisplay=angular.copy(this.assessments);
    });
    $http.get('/api/pilots').then(response=>{
      this.pilots=response.data;
      this.pilots.unshift({name:''});
      this.pilots.unshift({name:'Show All Pilots'});
    });
    this.colorList=[{color:'Red',class:'md-red'},
                    {color:'Yellow',class:'md-yellow'},
                    {color:'Orange',class:'md-orange'},
                    {color:'Green',class:'md-green'}];
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
    if (pilotName==="Show All Pilots") this.pilotFilter="";
    else this.pilotFilter=pilotName;
    this.filter();
  }
  
  setDate(choice){
    if (choice==="All") this.dateFilter=null;
    else this.dateFilter=this.myDate;
    this.filter();
  }
}

angular.module('workspaceApp')
  .component('viewAssessments', {
    templateUrl: 'app/viewAssessments/viewAssessments.html',
    controller: ViewAssessmentsComponent,
    controllerAs: 'viewAssessments'
  });

})();
