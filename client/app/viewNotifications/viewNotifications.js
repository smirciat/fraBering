'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('viewNotifications', {
        url: '/viewNotifications',
        template: '<view-notifications flex layout="column"></view-notifications>'
      });
  });
