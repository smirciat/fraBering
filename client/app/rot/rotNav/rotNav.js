'use strict';

angular.module('workspaceApp')
  .component('rotNav', {
    templateUrl: 'app/rot/rotNav/rotNav.html',
    controller: function(Auth, RotAccess, $state, $rootScope) {
      this.canAccessRecords = function() {
        return RotAccess.canAccessRecords(Auth.getCurrentUser());
      };
      this.canAccessFdr = function() {
        return RotAccess.canAccessFdr(Auth.getCurrentUser());
      };
      this.goPilotBoard = function(baseCode, $event) {
        if ($event) {
          $event.preventDefault();
          if ($event.stopPropagation) $event.stopPropagation();
        }
        $rootScope.$broadcast('frat:setBase', baseCode);
        $state.go(baseCode === 'OTZ' ? 'rot.otz' : 'rot.ome');
      };
    },
    controllerAs: 'rotNav'
  });
