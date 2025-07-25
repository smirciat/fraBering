'use strict';

class LoginController {
  constructor(Auth, $state,$mdSidenav) {
    this.user = {persistent:true};
    this.errors = {};
    this.submitted = false;
    this.mdSidenav=$mdSidenav;
    this.Auth = Auth;
    this.$state = $state;
  }

  login(form) {
    this.submitted = true;

    if (form.$valid) {
      this.Auth.login({
          email: this.user.email,
          password: this.user.password,
          persistent: this.user.persistent
        })
        .then(() => {
          // Logged in, redirect to home
          this.$state.go('status');
        })
        .catch(err => {
          this.errors.other = err.message;
        });
    }
  }
  
  toggleMenu(){
      var self=this;
      self.mdSidenav('left').toggle();
    }
    
  pixelRatio(ratio){
      if (Math.floor(window.devicePixelRatio)===ratio) return true;
      if (window.devicePixelRatio>3&&ratio===3) return true;
      if (window.devicePixelRatio<1&&ratio===1) return true;
      return false;
    }
}

angular.module('workspaceApp')
  .controller('LoginController', LoginController);
