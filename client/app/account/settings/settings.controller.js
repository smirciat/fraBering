'use strict';

class SettingsController {
  errors = {};
  submitted = false;

  constructor(Auth) {
    this.Auth = Auth;
  }

  changePassword(form) {
    this.submitted = true;
    var self=this;
    if (form.$valid) {
      this.Auth.changePassword(this.user.oldPassword, this.user.newPassword)
        .then(function() {
          self.message = 'Password successfully changed.';
        })
        .catch(function() {
          form.password.$setValidity('mongoose', false);
          self.errors.other = 'Incorrect password';
          self.message = '';
        });
    }
  }
}

angular.module('workspaceApp')
  .controller('SettingsController', SettingsController);
