'use strict';

(function(){

class NotificationsComponent {
  constructor($http,$mdDialog) {
    var self=this;
    this.http=$http;
    this.mdDialog=$mdDialog;
    this.newNotification={creator:"",title:"",notification:""};
  }
  
  submit(ev){
    var self=this;
    if (this.newNotification.creator===""||this.newNotification.title===""||this.newNotification.notification==="") {
      this.mdDialog.show(
        this.mdDialog.alert()
          .parent(angular.element(document.body))
          .clickOutsideToClose(true)
          .title('Incomplete Submission')
          .textContent('Please fill out all of the fields before pressing submit.')
          .ariaLabel('Alert Dialog Demo')
          .ok('OK')
          .targetEvent(ev)
      );
    }
    else {
      this.newNotification.createdAt=new Date();
      this.newNotification.notified=[];
      this.http.post('/api/notifications',this.newNotification).then(function(response){
        self.newNotification={creator:"",title:"",notification:""};
      });
    }
  }
}

angular.module('workspaceApp')
  .component('notifications', {
    templateUrl: 'app/notifications/notifications.html',
    controller: NotificationsComponent,
    controllerAs: 'notifications'
  });

})();
