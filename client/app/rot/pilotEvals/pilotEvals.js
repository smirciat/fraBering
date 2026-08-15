'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('rot.pilotEvals', {
        url: '/rot/evals',
        template: '<rot-pilot-evals></rot-pilot-evals>',
        authenticate: 'user'
      });
  });
