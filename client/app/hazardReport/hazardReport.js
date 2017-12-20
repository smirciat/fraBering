'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('hazardReport', {
        url: '/hazardReport',
        template: '<hazard-report flex layout="column"></hazard-report>'
      });
  });
