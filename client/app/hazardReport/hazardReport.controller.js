'use strict';

(function(){

class HazardReportComponent {
  constructor($http,$mdDialog,$mdSidenav,$interval) {
    this.mdDialog=$mdDialog;
    this.mdSidenav=$mdSidenav;
    this.http=$http;
    this.report={name:"",base:"",location:"",report:""};
    this.bases=['Nome','Kotzebue','Unalakleet'];
    var self=this;
    if (window.localStorage.getItem('hazardReports')===null||window.localStorage.getItem('hazardReports')==="undefined") this.hazardReports =[];
    else this.hazardReports = JSON.parse(window.localStorage.getItem('hazardReports'));
    
    self.scrapeStorage();
    $interval(function(){
      self.scrapeStorage();
    },1800000);//each 30 minutes
  }
  
  submit(ev){
    var self=this;
    if (this.report.name===""||this.report.base===""||this.report.location===""||this.report.report==="") {
      this.mdDialog.show(
        this.mdDialog.alert()
          .parent(angular.element(document.body))
          .clickOutsideToClose(true)
          .title('Incomplete Submission')
          .textContent('Please fill out all of the fields before pressing submit.')
          .ariaLabel('Alert Dialog Demo')
          .ok('OK')
          .targetEvent(ev)
      );
    }
    else {
      this.report.date=new Date();
      this.http.post('/api/hazardReports',this.report).then(function(response){
        self.report={name:"",base:"",location:"",report:""};
      },function(response){
        self.hazardReports.push(self.report);
        window.localStorage.setItem('hazardReports',JSON.stringify(self.hazardReports));
        self.report={name:"",base:"",location:"",report:""};
      });
    }
  }
  
  scrapeStorage(){
      var self=this;
      window.localStorage.setItem( 'hazardReports', JSON.stringify(self.hazardReports) );
      if (Array.isArray(self.hazardReports)) {
        self.hazardReports.forEach(function(hazard,index){
          self.$http.post('/api/hazardReports', hazard)
            .then(function(response){//success
              index=self.hazardReports.indexOf(hazard);
              self.hazardReports.splice(index,1);
              window.localStorage.setItem( 'hazardReports', JSON.stringify(self.hazardReports) );
            },
            function(response){//fail
              
            });
        });
      }
    }
    
    toggleMenu(){
      var self=this;
      self.mdSidenav('left').toggle();
    }
}

angular.module('workspaceApp')
  .component('hazardReport', {
    templateUrl: 'app/hazardReport/hazardReport.html',
    controller: HazardReportComponent,
    controllerAs: 'hazard'
  });

})();
