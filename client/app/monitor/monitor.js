'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('monitor', {
        url: '/monitor',
        template: '<monitor></monitor>'
      });
  });
