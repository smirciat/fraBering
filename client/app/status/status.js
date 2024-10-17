'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('status', {
        url: '/status',
        template: '<status></status>'
      });
  });
