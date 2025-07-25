'use strict';

(function() {

  function authInterceptor($rootScope, $q, $cookies, $injector, Util, $window) {
    var state;
    return {
      // Add authorization token to headers
      request(config) {
        config.headers = config.headers || {};
        if ($cookies.get('token') && Util.isSameOrigin(config.url)) {
          config.headers.Authorization = 'Bearer ' + $cookies.get('token');
        }
        return config;
      },

      // Intercept 401s and redirect you to login
      responseError(response) {
        if (response.status === 401||(response.status === 403&&response.config.url==="/api/calendar")) {
          let token=$cookies.get('token');
          let storage=window.localStorage.getItem('token');
          if (storage===token||!storage||token) {
            (state || (state = $injector.get('$state')))
            .go('login');
            // remove any stale tokens
            $cookies.remove('token');
          }
          else {
            //alert('storage: ' + storage + ' token: ' + token);
            $window.location.reload();
          }
        }
        return $q.reject(response);
      }
    };
  }

  angular.module('workspaceApp.auth')
    .factory('authInterceptor', authInterceptor);
})();
