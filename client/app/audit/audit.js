'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('audit', {
        url: '/audit',
        template: '<audit></audit>'
      });
  });
