'use strict';

angular.module('workspaceApp')
  .config(function($stateProvider) {
    $stateProvider.state('rot.fileserver', {
      url: '/files',
      template: '<rot-fileserver></rot-fileserver>',
      authenticate: 'user'
    });
  });
