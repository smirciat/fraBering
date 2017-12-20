'use strict';

(function(){

class NotificationsComponent {
  constructor() {
    this.message = 'Hello';
  }
}

angular.module('workspaceApp')
  .component('notifications', {
    templateUrl: 'app/notifications/notifications.html',
    controller: NotificationsComponent,
    controllerAs: 'notificationsCtrl'
  });

})();
