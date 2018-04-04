'use strict';

(function(){

class TimeclockComponent {
  constructor(Auth,User,moment,$http,$timeout,$window,Modal,appConfig) {
    var self=this;
    self.http=$http;
    self.timeout=$timeout;
    self.window=$window;
    self.Modal=Modal;
    self.Auth=Auth;
    self.User=User;
    self.appConfig=appConfig;
    self.moment=moment;
    self.timesheets=[];
    self.employees=[];
    self.whosClockedIn=[];
    self.hours=0;
    self.in=false;
    self.uid=0;
    self.user = Auth.getCurrentUser;
    self.newRecord = {};
    self.users = User.query();
    self.now = moment();
    self.referenceStartDate=moment('2018-03-03');
    
    self.setApi();
    self.getCurrent();
    self.setPayrollPeriod();
    self.getRecords(self.uid);
  }
  
  quickMessage() { 
    var self=this;
    self.Modal.confirm.quickMessage();
  }
    
    setApi() {
      var self=this;
      if (self.Auth.hasRole('admin')){
        self.api='/api/timesheets/all';
      }
      else {
        self.api='/api/timesheets/user';
      }
    }
    
    getCurrent() {
      var self=this;
      if (self.user()&&self.user()._id){
        self.setApi();
        self.http.post('/api/timesheets/current',{uid:self.user()._id}).then(function(response){
          
          if (response.data.length===0){
            self.in=false;
            self.hours=0;
          }
          else{
            self.current = response.data[0];
            self.in=true;
            var end = self.moment();
            self.hours = self.moment.duration(end.diff(self.moment(self.current.timeIn))).asHours();
          }
        },function(err){console.log(err)});
      }
      else {
        self.timeout(function(){
          self.getCurrent();
          self.getRecords(self.uid);
        },100);
      }
    };
    
    setPayrollPeriod() {
      var self=this;
      while (self.moment(self.now)>=self.moment(self.referenceStartDate).add(14,'days')) {
        self.referenceStartDate=self.moment(self.referenceStartDate).add(14,'days');
      }
      
      while (self.moment(self.now)<self.moment(self.referenceStartDate).subtract(14,'days')) {
        self.referenceStartDate=self.moment(self.referenceStartDate).subtract(14,'days');
      }
      
      self.startDate=self.moment(self.referenceStartDate);
      self.endDate=self.moment(self.referenceStartDate).add(14,'days');
      self.lastDate=self.moment(self.referenceStartDate).add(13,'days');
    };
    
    plus() {
      var self=this;
      self.now.add(14,'days');
      self.setPayrollPeriod();
      self.getRecords(self.uid);
    };
    
    minus() {
      var self=this;
      //if (self.moment(self.now).month()===2&&self.moment(self.now).date()<4) self.now.subtract(10,'days');
      self.now.subtract(14,'days');
      self.setPayrollPeriod();
      self.getRecords(self.uid);
    };
    
    getRecords(uid) {
      var self=this;
      self.http.post('/api/timesheets/all',{uid:self.user()._id,date:self.startDate.toDate(),endDate:self.endDate.toDate()}).then(function(response){
        self.timesheets=response.data;
        if (uid>0) self.timesheets = self.timesheets.filter(function(ts){
          return ts.uid===uid;
        });
        var employeeIndex,weekIndex;
        if (self.Auth.hasRole('admin')){
           self.employees=[];
           self.timesheets.forEach(function(timesheet){
             employeeIndex=-1;
             weekIndex=-1;
             for (var i=0;i<self.employees.length;i++) {
               for (var j=0;j<self.employees[i].weeks.length;j++) {
                 for (var k=0;k<self.employees[i].weeks[j].timesheets.length;k++) {
                   if (self.employees[i].weeks[j].timesheets[k].uid===timesheet.uid) {
                     employeeIndex=i;
                     if (self.moment(self.employees[i].weeks[j].timesheets[k].timeIn).week()===self.moment(timesheet.timeIn).week()) weekIndex=j;
                   }
                   
                 }  
               }
             }
            if (employeeIndex<0) {
              self.employees.push({employee:timesheet.name,uid:timesheet.uid,totalRegular:0,totalOT:0,weeks:[{week:self.moment(timesheet.timeIn).week(),weekEnd:self.moment(timesheet.timeIn).endOf('week').startOf('day').toDate(),totalRegular:0,totalOT:0,timesheets:[timesheet]}]});
            }
            else {
              if (weekIndex<0) self.employees[employeeIndex].weeks.push({week:self.moment(timesheet.timeIn).week(),weekEnd:self.moment(timesheet.timeIn).endOf('week').startOf('day').toDate(),totalRegular:0,totalOT:0,timesheets:[timesheet]});
              else {
                self.employees[employeeIndex].weeks[weekIndex].timesheets.push(timesheet);
              }
            }
           });
           self.whosClockedIn=[];
           self.employees.forEach(function(employee){
             employee.weeks.forEach(function(week){
               week.timesheets.forEach(function(ts){
                 if (!ts.timeOut) self.whosClockedIn.push(ts);
                 employee.totalRegular+=ts.regularHours;
                 employee.totalOT+=ts.otHours;
                 week.totalRegular+=ts.regularHours;
                 week.totalOT+=ts.otHours;
               });
               week.timesheets.reverse();
             });
             employee.weeks.reverse();
           });
           if (self.user().role!=="admin") {
             self.timesheets = self.timesheets.filter(function(ts){
               return ts.uid===self.user()._id;
             });
           }
           self.payrollList = self.employees.slice(0);
           self.payrollList.splice(0,0,{employee:"All",uid:0});
        }
      });
    };
    
    clockIn() {
      var self=this;
      self.http.get('/api/timesheets/ip').then(function(response){
        if (response.data) {
          self.http.post('/api/timesheets/',{name:self.user().name,timeIn:self.moment().toDate(),uid:self.user()._id}).then(function(response){
            self.getCurrent();
            self.getRecords(self.uid);
          });
        }
        else self.quickMessage('You must be at Smokey Bay to clock in or out.');
      });
      
      
    };
    
    clockOut() {
      var self=this;
      self.http.get('/api/timesheets/ip').then(function(response){
        if (response.data) {
          if (self.current){
            self.current.timeOut = self.moment();
            self.current = self.update(self.current);
          }  
          else self.in=false;
        }
        else self.quickMessage('You must be at Smokey Bay to clock in or out.');
      });
    };
    
    update(timesheet) {//decide how much of this timesheet record is regular and overtime
      var self=this;
      var timeOut;
      var dayLength = 10;
      //if (self.appConfig.eightHourEmployees.indexOf(timesheet.uid) > -1) dayLength=8;
      if (timesheet.timeOut) {
        timeOut = self.moment(timesheet.timeOut);
        timesheet.regularHours =  self.moment.duration(timeOut.diff(self.moment(timesheet.timeIn))).asHours();
        timesheet.otHours = 0;
        if (timesheet.regularHours>dayLength){
          timesheet.otHours = timesheet.regularHours-dayLength;
          timesheet.regularHours = dayLength;
        }
        timesheet.timeOut = timeOut.toDate();
        var timeIn = self.moment(timesheet.timeIn);
        var startDate = self.moment(timeIn).startOf('week').startOf('day');
        var endDate = self.moment(timeIn).endOf('week').endOf('day');
        self.http.post('/api/timesheets/user',{uid:timesheet.uid,date:startDate.toDate(),endDate:endDate.toDate()}).then(function(response){
          var timesheets = response.data.reverse();
          var index=-1;
          var todaysHours = 0;
          var totalHours = 0;
          if (timesheet._id) index = timesheets.findIndex(function(element){
                      return element._id===timesheet._id;
                    });
          if (index>-1) timesheets.splice(index,1);
          timesheets.forEach(function(ts){
            totalHours += ts.regularHours;
            if (self.moment(ts.timeIn).day()===self.moment(timesheet.timeIn).day()){
              todaysHours += ts.regularHours;
            }
          });
          if ((todaysHours + timesheet.regularHours)>dayLength){
            timesheet.otHours = todaysHours + timesheet.regularHours - dayLength;
            timesheet.regularHours = dayLength - todaysHours;
          }
          var over = totalHours + timesheet.regularHours-40;
          if (over>0) {
            if (totalHours>40) {
              timesheet.otHours += timesheet.regularHours;
              timesheet.regularHours = 0 ;
            }
            else{
              timesheet.otHours += over;
              timesheet.regularHours -= over;
            }
          }
          self.commit(timesheet);
        });
      }
      else self.commit(timesheet);
    };
    
    commit(timesheet) {
      var self=this;
      if (timesheet.otHours+timesheet.regularHours<0) {
        return self.quickMessage('Error in Times, total hours cannot be negative');
      }
      if (timesheet.regularHours+timesheet.otHours>18) {
        self.quickMessage('Possible failure to clock out, please double check times!');
      }
      if (timesheet._id){
        self.http.put('/api/timesheets/' + timesheet._id,timesheet).then(function(){
          self.getCurrent();
          self.getRecords(self.uid);
          self.newRecord={};
        });
      }
      else {
        self.http.post('/api/timesheets',timesheet).then(function(){
          self.getCurrent();
          self.getRecords(self.uid);
          self.newRecord={};
        });
      }
    };
    
    cancel() {
      var self=this;
      self.newRecord={};
    };
    
    edit(timesheet) {
      var self=this;
      if (timesheet.timeIn) timesheet.timeIn = self.moment(timesheet.timeIn).format('MMM DD, YYYY, h:mm:ss A');
      if (timesheet.timeOut) timesheet.timeOut = self.moment(timesheet.timeOut).format('MMM DD, YYYY, h:mm:ss A');
      self.newRecord = timesheet;
    };
    
    delete(timesheet) {
      var self=this;
      self.http.delete('/api/timesheets/' + timesheet._id).then(function(){
        self.getCurrent();
        self.getRecords(self.uid);
      });
    };
    
    nameLookup(uid) {
      var self=this;
      self.newRecord.name = "";
      var index = self.users.findIndex(function(element){
        return element._id===uid;
      });
      if (index>-1&&(self.users[index].role==='admin'||self.users[index].role==='admin')){
        self.newRecord.name = self.users[index].name;
      }
    };
    
    print() {
      var self=this;
      self.$timeout(self.$window.print,500);
    };
    
    setEmployee (employee){
      var self=this;
      self.uid=employee.uid;
      self.getRecords(self.uid);
    };
    
    
  
}

angular.module('workspaceApp')
  .component('timeclock', {
    templateUrl: 'app/timeclock/timeclock.html',
    controller: TimeclockComponent,
    controllerAs: 'timeclock'
  });

})();
