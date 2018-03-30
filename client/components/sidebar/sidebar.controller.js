'use strict';

class SidebarController {

  constructor(Auth,$state) {
    this.state=$state;
    this.Auth=Auth;
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
  
  viewNotifications() {
    this.state.go('viewNotifications');
  }
  
  airports(){
    this.state.go('airports');
  }
  
  viewHazards(){
    this.state.go('viewHazards');
  }

  isAdmin(){
    return this.Auth.isAdmin();
  }

}

angular.module('workspaceApp')
  .controller('SidebarController', SidebarController);
