'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider.state('rot', {
      abstract: true,
      url: '/rot',
      template: '<div ui-view></div>'
    });
  });
