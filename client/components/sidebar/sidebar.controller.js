'use strict';

class SidebarController {

  constructor(Auth,$state) {
    this.state=$state;
  }
  
  main() {
    this.state.go('main');
  }
  
  hazard() {
    this.state.go('hazardReport');
  }
  
  notification() {
    this.state.go('notifications');
  }

}

angular.module('workspaceApp')
  .controller('SidebarController', SidebarController);
