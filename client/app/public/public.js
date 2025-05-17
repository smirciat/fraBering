'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('public', {
        url: '/public',
        template: '<public></public>'
      });
  });
