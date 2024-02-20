'use strict';

(function(){

class NotificationsComponent {
  constructor($http,$mdDialog,$interval) {
    var self=this;
    self.http=$http;
    self.mdDialog=$mdDialog;
    self.newNotification={creator:"",title:"",notification:""};
    if (window.localStorage.getItem('notifications')===null||window.localStorage.getItem('notifications')==="undefined") self.notifications =[];
    else self.notifications = JSON.parse(window.localStorage.getItem('notifications'));
    
    self.scrapeStorage();
    $interval(function(){
      self.scrapeStorage();
    },1800000);//each 30 minutes
  }
  
  submit(ev){
    var self=this;
    if (self.newNotification.creator===""||self.newNotification.title===""||self.newNotification.notification==="") {
      self.mdDialog.show(
        self.mdDialog.alert()
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
      self.newNotification.createdAt=new Date();
      self.newNotification.notified=[self.newNotification.creator];
      self.http.post('/api/notifications',self.newNotification).then(function(response){
        self.newNotification={creator:"",title:"",notification:""};
      });
    }
  }
  
  scrapeStorage(){
      var self=this;
      window.localStorage.setItem( 'notifications', JSON.stringify(self.notifications) );
      if (Array.isArray(self.notifications)) {
        self.notifications.forEach(function(notification,index){
          self.$http.post('/api/notifications', notification)
            .then(function(response){//success
              index=self.notifications.indexOf(notification);
              self.notifications.splice(index,1);
              window.localStorage.setItem( 'notifications', JSON.stringify(self.notifications) );
            },
            function(response){//fail
              
            });
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
