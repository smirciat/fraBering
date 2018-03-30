'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('airports', {
        url: '/airports',
        template: '<airports></airports>'
      });
  });
