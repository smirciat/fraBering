'use strict';

(function(){

class ViewNotificationsComponent {
  constructor($http) {
    var self=this;
    $http.get('/api/notifications').then(function(response){
      self.notifications=response.data;
      self.notifications.forEach(function(notification){
        if (notification.notified) {
          notification.notifiedString = notification.notified.toString();
          console.log(notification.notified)
        }
      });
    });
  }
}

angular.module('workspaceApp')
  .component('viewNotifications', {
    templateUrl: 'app/viewNotifications/viewNotifications.html',
    controller: ViewNotificationsComponent,
    controllerAs: 'viewNotifications'
  });

})();
