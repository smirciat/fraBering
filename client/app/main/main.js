'use strict';

angular.module('workspaceApp')
  .config(function($stateProvider) {
    $stateProvider.state('main', {
      url: '/main',
      template: '<main flex layout="column"></main>'
    });
  });
