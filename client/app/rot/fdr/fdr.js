'use strict';

angular.module('workspaceApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('rot.fdr', {
        url: '/flight-duty',
        template: '<rot-fdr></rot-fdr>',
        authenticate: 'user'
      });
  });
