'use strict';

(function() {

  angular.module('workspaceApp.auth')
    .run(function($rootScope, $state, Auth) {
      let authBootstrapped = false;

      $rootScope.$on('$stateChangeStart', function(event, next) {
        if (!authBootstrapped) {
          authBootstrapped = true;
          return;
        }

        if (!next.authenticate) {
          return;
        }

        if (!Auth.initialized) {
          Auth.getCurrentUser();
        }

        // Logged-in users with sufficient role: let ui-router proceed (no preventDefault).
        if (Auth.isLoggedIn()) {
          if (typeof next.authenticate !== 'string' || Auth.hasRole(next.authenticate)) {
            return;
          }
        }

        // No token — send to login. Do not preventDefault when a token exists but the
        // profile has not resolved yet; blocking here caused URL flicker and stuck routing.
        if (!Auth.getToken()) {
          event.preventDefault();
          $state.go('login');
        }
      });
    });
})();
