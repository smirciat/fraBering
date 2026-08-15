'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('rot.sicHours', {
        url: '/sic-hours',
        template: '<rot-sic-hours></rot-sic-hours>',
        authenticate: 'user'
      });
  });
