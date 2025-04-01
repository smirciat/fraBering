'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('roster', {
        url: '/roster',
        template: '<roster></roster>'
      });
  });
