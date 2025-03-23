'use strict';

(function(){

class ViewHazardsComponent {
  constructor($http) {
    var self=this;
    $http.get('/api/hazardReports').then(function(response){
      self.hazardReports=response.data;
    });
  }
  
  
}

angular.module('workspaceApp')
  .component('viewHazards', {
    templateUrl: 'app/viewHazards/viewHazards.html',
    controller: ViewHazardsComponent,
    controllerAs: 'viewHazards',
    authenticate:'superadmin'
  });

})();
