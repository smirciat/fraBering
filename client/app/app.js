'use strict';

angular.module('workspaceApp', ['workspaceApp.auth', 'workspaceApp.admin', 'workspaceApp.constants',
    'ngCookies', 'ngResource', 'ngSanitize', 'btford.socket-io', 'ngMaterial', 'ui.router','ui.select', 'ui.bootstrap',
    'validation.match','angularMoment','AngularPrint'
  ])
  .config(function($urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise('/');

    $locationProvider.html5Mode(true);
  });
