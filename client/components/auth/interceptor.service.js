'use strict';

(function() {

  function authInterceptor($rootScope, $q, $cookies, $injector, Util, $window, $timeout) {
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
        console.log(response);
        if (response.config&&response.config.url.includes('Flight and Load Planner_files')) {
          return $q.reject(response);
        }
        console.log('AUTH FAIL:', response.status, response.config.url);
        //return //$q.reject(response);
        if (response.status === 401||(response.status === 403&&response.config.url==="/api/calendar")) {
          const cookieToken = $cookies.get('token');
          const storageToken = window.localStorage.getItem('token');
          
          // 1. If neither exists → login
          if (!cookieToken && !storageToken) {
            (state || (state = $injector.get('$state')))
              .go('login');
            return;
          }
          
          // 2. If cookie missing but storage exists → restore cookie
          if (!cookieToken && storageToken) {
            $cookies.put('token', storageToken);
            return;
          }
          
          // 3. If storage missing but cookie exists → restore storage
          if (cookieToken && !storageToken) {
            window.localStorage.setItem('token', cookieToken);
            return;
          }
          
          // 4. If mismatch → pick a rule (usually storage wins)
          if (cookieToken !== storageToken) {
            window.localStorage.setItem('token', cookieToken);
            return;
          }
          //let token=$cookies.get('token');
          //let storage=window.localStorage.getItem('token');
          //if (storage===token||!storage||token) {
          //  (state || (state = $injector.get('$state')))
          //  .go('login');
          //  // remove any stale tokens
          //  $cookies.remove('token');
          //  return $q.reject(response);
          //}
          //else {
            //alert('storage: ' + storage + ' token: ' + token);
          //  $timeout(()=>{
          //    $window.location.reload();
          //    return $q.reject(response);
          //  },200);
            
          //}
        }
        else return $q.reject(response);
      }
    };
  }

  angular.module('workspaceApp.auth')
    .factory('authInterceptor', authInterceptor);
})();
