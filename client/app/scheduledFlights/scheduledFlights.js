'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('scheduledFlights', {
        url: '/scheduledFlights',
        template: '<scheduled-flights></scheduled-flights>'
      });
  });
