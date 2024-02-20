'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('timeclock', {
        url: '/timeclock',
        template: '<timeclock></timeclock>'
      });
  });
