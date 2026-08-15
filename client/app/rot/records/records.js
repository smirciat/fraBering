'use strict';

angular.module('workspaceApp')
  .config(function ($stateProvider) {
    $stateProvider.state('rot.records', {
      url: '/records',
      template: '<rot-records></rot-records>',
      authenticate: 'user'
    });
  })
  .filter('trusted', ['$sce', function($sce) {
    return function(url) {
      return $sce.trustAsResourceUrl(url);
    };
  }]);
