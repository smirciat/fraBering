'use strict';

angular.module('workspaceApp', ['workspaceApp.auth', 'workspaceApp.admin', 'workspaceApp.constants',
    'ngCookies', 'ngResource', 'ngSanitize', 'btford.socket-io', 'ngMaterial', 'ui.router','ui.select', 'ui.bootstrap',
    'validation.match','angularMoment','AngularPrint','ui.grid','ui.grid.edit', 'ui.grid.cellNav','ui.grid.selection','ui.grid.exporter'
  ])
  .config(function($urlRouterProvider, $locationProvider, $compileProvider) {
    $urlRouterProvider.otherwise('/login');

    $locationProvider.html5Mode(true);
    
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
  })
  .run(function($document) {
    $document.on('contextmenu', function(event) {
      var el = event.target;
      if (!el) {
        event.preventDefault();
        return;
      }
      if (angular.element(el).closest('issues-paste-area, textarea, input').length) {
        return;
      }
      event.preventDefault();
    });
  });
