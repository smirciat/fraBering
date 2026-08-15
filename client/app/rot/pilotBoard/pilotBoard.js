'use strict';

angular.module('workspaceApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('rot.ome', {
        url: '/ome',
        template: '<rot-pilot-board base-code="OME" board-title="NOME" grid-height="85vh" split-pages="true"></rot-pilot-board>',
        authenticate: 'user'
      })
      .state('rot.otz', {
        url: '/otz',
        template: '<rot-pilot-board base-code="OTZ" board-title="KOTZEBUE" grid-height="40vh" split-pages="false"></rot-pilot-board>',
        authenticate: 'user'
      });
  });
