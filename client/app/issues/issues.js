'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('issues', {
        url: '/issues?issueId',
        template: '<issues flex layout="column"></issues>',
        authenticate: 'user'
      });
  });
