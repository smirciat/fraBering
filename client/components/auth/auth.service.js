'use strict';

(function() {

  function AuthService($location, $http, $cookies, $q, appConfig, Util, User) {
    var safeCb = Util.safeCb;
    var currentUser = {};
    var userRoles = appConfig.userRoles || [];

    if (($cookies.get('token')||window.localStorage.getItem('token')) && $location.path() !== '/logout') {
      currentUser = User.get();
    }

    var Auth = {

      /**
       * Authenticate user and save token
       *
       * @param  {Object}   user     - login info
       * @param  {Function} callback - optional, function(error, user)
       * @return {Promise}
       */
      login({
        email,
        password,
        persistent
      }, callback) {
        return $http.post('/auth/local', {
            email: email,
            password: password,
            persistent: persistent
          })
          .then(res => {
            $cookies.put('token', res.data.token);
            if (persistent) window.localStorage.setItem('token',res.data.token);
            currentUser = User.get();
            return currentUser.$promise;
          })
          .then(user => {
            safeCb(callback)(null, user);
            return user;
          })
          .catch(err => {
            Auth.logout();
            safeCb(callback)(err.data);
            return $q.reject(err.data);
          });
      },

      /**
       * Delete access token and user info
       */
      logout() {
        $cookies.remove('token');
        window.localStorage.setItem('token','');
        currentUser = {};
      },

      /**
       * Create a new user
       *
       * @param  {Object}   user     - user info
       * @param  {Function} callback - optional, function(error, user)
       * @return {Promise}
       */
      createUser(user, callback) {
        //console.log(user)
        return User.save(user, function(data) {
            $cookies.put('token', data.token);
            currentUser = User.get();
            return safeCb(callback)(null, user);
          }, function(err) {
            console.log(err)
            Auth.logout();
            return safeCb(callback)(err);
          })
          .$promise;
      },

      /**
       * Change password
       *
       * @param  {String}   oldPassword
       * @param  {String}   newPassword
       * @param  {Function} callback    - optional, function(error, user)
       * @return {Promise}
       */
      changePassword(oldPassword, newPassword, callback) {
        return User.changePassword({
            id: currentUser._id
          }, {
            oldPassword: oldPassword,
            newPassword: newPassword
          }, function() {
            return safeCb(callback)(null);
          }, function(err) {
            return safeCb(callback)(err);
          })
          .$promise;
      },

      /**
       * Gets all available info on a user
       *   (synchronous|asynchronous)
       *
       * @param  {Function|*} callback - optional, funciton(user)
       * @return {Object|Promise}
       */
      adminChangeRole(userId,role,callback) {
        return User.adminChangeRole({ id: currentUser._id }, {user: userId,role:role}, function() {
          return safeCb(callback)(null);
        }, function(err) {
          return safeCb(callback)(err);
        }).$promise;
      },
      getCurrentUser(callback) {
        if (arguments.length === 0) {
          return currentUser;
        }

        var value = currentUser.hasOwnProperty('$promise') ? currentUser.$promise : currentUser;
        return $q.when(value)
          .then(user => {
            safeCb(callback)(user);
            return user;
          }, () => {
            safeCb(callback)({});
            return {};
          });
      },

      /**
       * Check if a user is logged in
       *   (synchronous|asynchronous)
       *
       * @param  {Function|*} callback - optional, function(is)
       * @return {Bool|Promise}
       */
      isLoggedIn(callback) {
        if (arguments.length === 0) {
          return currentUser.hasOwnProperty('role');
        }

        return Auth.getCurrentUser(null)
          .then(user => {
            var is = user.hasOwnProperty('role');
            safeCb(callback)(is);
            return is;
          });
      },

      /**
       * Check if a user has a specified role or higher
       *   (synchronous|asynchronous)
       *
       * @param  {String}     role     - the role to check against
       * @param  {Function|*} callback - optional, function(has)
       * @return {Bool|Promise}
       */
      hasRole(role, callback) {
        let storage=window.localStorage.getItem('token');
        let token=$cookies.get('token');
        if (!token&&storage) {
          $cookies.put('token', storage);
          currentUser = User.get();
        }
        var hasRole = function(r, h) {
          return userRoles.indexOf(r) >= userRoles.indexOf(h);
        };

        if (arguments.length < 2) {
          return hasRole(currentUser.role, role);
        }

        return Auth.getCurrentUser(null)
          .then(user => {
            var has = user.hasOwnProperty('role') ? hasRole(user.role, role) : false;
            safeCb(callback)(has);
            return has;
          });
      },

      /**
       * Check if a user is an admin
       *   (synchronous|asynchronous)
       *
       * @param  {Function|*} callback - optional, function(is)
       * @return {Bool|Promise}
       */
       isUser() {
        return Auth.hasRole.apply(Auth, [].concat.apply(['user'], arguments));
      },
      isAdmin() {
        return Auth.hasRole.apply(Auth, [].concat.apply(['admin'], arguments));
      },
      isSuperAdmin() {
        return Auth.hasRole.apply(Auth, [].concat.apply(['superadmin'], arguments));
      },

      /**
       * Get auth token
       *
       * @return {String} - a token string used for authenticating
       */
      getToken() {
        let storage=window.localStorage.getItem('token');
        let token=$cookies.get('token');
        if (!token) token=storage;
        return token;
      }
    };

    return Auth;
  }

  angular.module('workspaceApp.auth')
    .factory('Auth', AuthService);
})();
