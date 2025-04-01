'use strict';

angular.module('workspaceApp', ['workspaceApp.auth', 'workspaceApp.admin', 'workspaceApp.constants',
    'ngCookies', 'ngResource', 'ngSanitize', 'btford.socket-io', 'ngMaterial', 'ui.router','ui.select', 'ui.bootstrap',
    'validation.match','angularMoment','AngularPrint','ui.grid','ui.grid.edit', 'ui.grid.cellNav','ui.grid.selection','ui.grid.exporter'
  ])
  .config(function($urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise('/');

    $locationProvider.html5Mode(true);
  });
