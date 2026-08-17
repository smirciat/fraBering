'use strict';

angular.module('workspaceApp')
  .component('rotNav', {
    templateUrl: 'app/rot/rotNav/rotNav.html',
    controller: function(Auth, RotAccess) {
      this.canAccessRecords = function() {
        return RotAccess.canAccessRecords(Auth.getCurrentUser());
      };
    },
    controllerAs: 'rotNav'
  });
