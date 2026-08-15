'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider.state('rot', {
      abstract: true,
      url: '/rot',
      template: '<navbar></navbar><rot-nav></rot-nav><div ui-view></div>'
    });
  });
