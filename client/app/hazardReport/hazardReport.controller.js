'use strict';

(function(){

class HazardReportComponent {
  constructor($http,$mdDialog) {
    this.mdDialog=$mdDialog;
    this.http=$http;
    this.report={name:"",base:"",location:"",report:""};
    this.bases=['Nome','Kotzebue','Unalakleet'];
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
      });
    }
  }
}

angular.module('workspaceApp')
  .component('hazardReport', {
    templateUrl: 'app/hazardReport/hazardReport.html',
    controller: HazardReportComponent,
    controllerAs: 'hazard'
  });

})();
