'use strict';

(function(){

class HazardReportComponent {
  constructor($http,$mdDialog,$mdSidenav,$interval) {
    var self=this;
    self.mdDialog=$mdDialog;
    self.mdSidenav=$mdSidenav;
    self.http=$http;
    self.report={name:"",base:"",location:"",report:""};
    self.bases=['Nome','Kotzebue','Unalakleet'];
    self.apiPassword="";
      
    self.promptForPassword=function(){
      var confirm = self.mdDialog.prompt()
          .parent(angular.element(document.body))
          .title('What is the passwordr?')
          .textContent('You only need to enter this once per device.  The device will remember until the password is changed.')
          .placeholder('password')
          .ariaLabel('password')
          .initialValue('')
          .required(true)
          .ok('Store')
          .cancel('Cancel');
          
      self.mdDialog.show(confirm).then(function(result) {
        window.localStorage.setItem('api',result);
        self.apiPassword=result;
      });
    };
    
    if (window.localStorage.getItem( 'api' )===null||window.localStorage.getItem( 'api' )==="undefined"){
      self.promptForPassword();
    }
    else self.apiPassword=window.localStorage.getItem( 'api' );
    if (window.localStorage.getItem('hazardReports')===null||window.localStorage.getItem('hazardReports')==="undefined") self.hazardReports =[];
    else self.hazardReports = JSON.parse(window.localStorage.getItem('hazardReports'));
    
    self.scrapeStorage();
    $interval(function(){
      self.scrapeStorage();
    },1800000);//each 30 minutes
  }
  
  submit(ev){
    var self=this;
    if (self.report.name===""||self.report.base===""||self.report.location===""||self.report.report==="") {
      self.mdDialog.show(
        self.mdDialog.alert()
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
      self.report.date=new Date();
      self.report.password=self.apiPassword;
      self.http.post('/api/hazardReports',self.report).then(function(response){
        self.report={name:"",base:"",location:"",report:""};
      },function(response){
        if (response.status===501) self.promptForPassword();
        else {
          self.hazardReports.push(self.report);
          window.localStorage.setItem('hazardReports',JSON.stringify(self.hazardReports));
          self.report={name:"",base:"",location:"",report:""};
        }
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
