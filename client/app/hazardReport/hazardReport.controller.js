'use strict';

(function(){

class HazardReportComponent {
  constructor() {
    this.message = 'Hello';
  }
}

angular.module('workspaceApp')
  .component('hazardReport', {
    templateUrl: 'app/hazardReport/hazardReport.html',
    controller: HazardReportComponent,
    controllerAs: 'hazardReportCtrl'
  });

})();
