'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('viewAssessments', {
        url: '/viewAssessments',
        template: '<view-assessments></view-assessments>'
      });
  });
