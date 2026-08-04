'use strict';

(function() {

  function authInterceptor($rootScope, $q, $cookies, $injector, Util, $window, $timeout) {
    var state;
    return {
      // Add authorization token to headers
      request(config) {
        config.headers = config.headers || {};
        const token = $cookies.get('token') || window.localStorage.getItem('token');
        if (token && Util.isSameOrigin(config.url)) {
          config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
      },

      // Intercept 401s and redirect you to login
      responseError(response) {
        if (response.config && response.config.url.includes('Flight and Load Planner_files')) {
          return $q.reject(response);
        }
        if (response.status === 401 || (response.status === 403 && response.config.url === '/api/calendar')) {
          const cookieToken = $cookies.get('token');
          const storageToken = window.localStorage.getItem('token');

          // Sync token between cookie and localStorage when one side is missing
          if (!cookieToken && storageToken) {
            $cookies.put('token', storageToken);
          } else if (cookieToken && !storageToken) {
            window.localStorage.setItem('token', cookieToken);
          } else if (cookieToken && storageToken && cookieToken !== storageToken) {
            window.localStorage.setItem('token', cookieToken);
          }

          if (!cookieToken && !storageToken) {
            (state || (state = $injector.get('$state'))).go('login');
          }
          return $q.reject(response);
        }
        return $q.reject(response);
      }
    };
  }

  angular.module('workspaceApp.auth')
    .factory('authInterceptor', authInterceptor);
})();
