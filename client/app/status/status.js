'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('status', {
        url: '/',
        template: '<status></status>'
      })
      .state('new.status', {
        url: '/status',
        template: '<status></status>'
      });
  });
