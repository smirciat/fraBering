'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('viewHazards', {
        url: '/viewHazards',
        template: '<view-hazards flex layout="column"></view-hazards>'
      });
  });
