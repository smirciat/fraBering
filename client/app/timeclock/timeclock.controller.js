'use strict';

(function(){

class TimeclockComponent {
  constructor(Auth,User,moment,$http,$timeout,$window,Modal,appConfig) {
    this.http=$http;
    this.timeout=$timeout;
    this.window=$window;
    this.Modal=Modal;
    this.Auth=Auth;
    this.User=User;
    this.appConfig=appConfig;
    this.moment=moment;
    this.timesheets=[];
    this.employees=[];
    this.whosClockedIn=[];
    this.hours=0;
    this.in=false;
    this.uid=0;
    this.user = Auth.getCurrentUser;
    this.newRecord = {};
    this.users = User.query();
    this.now = moment();
    this.referenceStartDate=moment('2018-03-03');
    
    this.setApi();
    this.getCurrent();
    this.setPayrollPeriod();
    this.getRecords(this.uid);
  }
  
  quickMessage() { 
    this.Modal.confirm.quickMessage();
  }
    
    setApi() {
      if (this.Auth.hasRole('admin')){
        this.api='/api/timesheets/all';
      }
      else {
        this.api='/api/timesheets/user';
      }
    }
    
    getCurrent() {
      if (this.user()&&this.user()._id){
        this.setApi();
        this.http.post('/api/timesheets/current',{uid:this.user()._id}).then((response)=>{
          
          if (response.data.length===0){
            this.in=false;
            this.hours=0;
          }
          else{
            this.current = response.data[0];
            this.in=true;
            var end = this.moment();
            this.hours = this.moment.duration(end.diff(this.moment(this.current.timeIn))).asHours();
          }
        },(err)=>{console.log(err)});
      }
      else {
        this.timeout(()=>{
          this.getCurrent();
          this.getRecords(this.uid);
        },100);
      }
    };
    
    setPayrollPeriod() {
      while (this.moment(this.now)>=this.moment(this.referenceStartDate).add(14,'days')) {
        this.referenceStartDate=this.moment(this.referenceStartDate).add(14,'days');
      }
      
      while (this.moment(this.now)<this.moment(this.referenceStartDate).subtract(14,'days')) {
        this.referenceStartDate=this.moment(this.referenceStartDate).subtract(14,'days');
      }
      
      this.startDate=this.moment(this.referenceStartDate);
      this.endDate=this.moment(this.referenceStartDate).add(13,'days');
      this.lastDate=this.moment(this.referenceStartDate).add(13,'days');
    };
    
    plus() {
      this.now.add(14,'days');
      this.setPayrollPeriod();
      this.getRecords(this.uid);
    };
    
    minus() {
      //if (this.moment(this.now).month()===2&&this.moment(this.now).date()<4) this.now.subtract(10,'days');
      this.now.subtract(14,'days');
      this.setPayrollPeriod();
      this.getRecords(this.uid);
    };
    
    getRecords(uid) {
      this.http.post('/api/timesheets/all',{uid:this.user()._id,date:this.startDate.toDate(),endDate:this.endDate.toDate()}).then(response=>{
        this.timesheets=response.data;
        if (uid>0) this.timesheets = this.timesheets.filter((ts)=>{
          return ts.uid===uid;
        });
        var employeeIndex,weekIndex;
        if (this.Auth.hasRole('admin')){
           this.employees=[];
           this.timesheets.forEach((timesheet)=>{
             employeeIndex=-1;
             weekIndex=-1;
             for (var i=0;i<this.employees.length;i++) {
               for (var j=0;j<this.employees[i].weeks.length;j++) {
                 for (var k=0;k<this.employees[i].weeks[j].timesheets.length;k++) {
                   if (this.employees[i].weeks[j].timesheets[k].uid===timesheet.uid) {
                     employeeIndex=i;
                     if (this.moment(this.employees[i].weeks[j].timesheets[k].timeIn).week()===this.moment(timesheet.timeIn).week()) weekIndex=j;
                   }
                   
                 }  
               }
             }
            if (employeeIndex<0) {
              this.employees.push({employee:timesheet.name,uid:timesheet.uid,totalRegular:0,totalOT:0,weeks:[{week:this.moment(timesheet.timeIn).week(),weekEnd:this.moment(timesheet.timeIn).endOf('week').startOf('day').toDate(),totalRegular:0,totalOT:0,timesheets:[timesheet]}]});
            }
            else {
              if (weekIndex<0) this.employees[employeeIndex].weeks.push({week:this.moment(timesheet.timeIn).week(),weekEnd:this.moment(timesheet.timeIn).endOf('week').startOf('day').toDate(),totalRegular:0,totalOT:0,timesheets:[timesheet]});
              else {
                this.employees[employeeIndex].weeks[weekIndex].timesheets.push(timesheet);
              }
            }
           });
           this.whosClockedIn=[];
           this.employees.forEach((employee)=>{
             employee.weeks.forEach((week)=>{
               week.timesheets.forEach((ts)=>{
                 if (!ts.timeOut) this.whosClockedIn.push(ts);
                 employee.totalRegular+=ts.regularHours;
                 employee.totalOT+=ts.otHours;
                 week.totalRegular+=ts.regularHours;
                 week.totalOT+=ts.otHours;
               });
               week.timesheets.reverse();
             });
             employee.weeks.reverse();
           });
           if (this.user().role!=="admin") {
             this.timesheets = this.timesheets.filter((ts)=>{
               return ts.uid===this.user()._id;
             });
           }
           this.payrollList = this.employees.slice(0);
           this.payrollList.splice(0,0,{employee:"All",uid:0});
        }
      });
    };
    
    clockIn() {
      this.http.get('/api/timesheets/ip').then((response)=>{
        if (response.data) {
          this.http.post('/api/timesheets/',{name:this.user().name,timeIn:this.moment().toDate(),uid:this.user()._id}).then((response)=>{
            this.getCurrent();
            this.getRecords(this.uid);
          });
        }
        else this.quickMessage('You must be at Smokey Bay to clock in or out.');
      });
      
      
    };
    
    clockOut() {
      this.http.get('/api/timesheets/ip').then((response)=>{
        if (response.data) {
          if (this.current){
            this.current.timeOut = this.moment();
            this.current = this.update(this.current);
          }  
          else this.in=false;
        }
        else this.quickMessage('You must be at Smokey Bay to clock in or out.');
      });
    };
    
    update(timesheet) {//decide how much of this timesheet record is regular and overtime
      var timeOut;
      var dayLength = 10;
      //if (this.appConfig.eightHourEmployees.indexOf(timesheet.uid) > -1) dayLength=8;
      if (timesheet.timeOut) {
        timeOut = this.moment(timesheet.timeOut);
        timesheet.regularHours =  this.moment.duration(timeOut.diff(this.moment(timesheet.timeIn))).asHours();
        timesheet.otHours = 0;
        if (timesheet.regularHours>dayLength){
          timesheet.otHours = timesheet.regularHours-dayLength;
          timesheet.regularHours = dayLength;
        }
        timesheet.timeOut = timeOut.toDate();
        var timeIn = this.moment(timesheet.timeIn);
        var startDate = this.moment(timeIn).startOf('week').startOf('day');
        var endDate = this.moment(timeIn).endOf('week').endOf('day');
        this.http.post('/api/timesheets/user',{uid:timesheet.uid,date:startDate.toDate(),endDate:endDate.toDate()}).then(response=>{
          var timesheets = response.data.reverse();
          var index=-1;
          var todaysHours = 0;
          var totalHours = 0;
          if (timesheet._id) index = timesheets.findIndex(function(element){
                      return element._id===timesheet._id;
                    });
          if (index>-1) timesheets.splice(index,1);
          timesheets.forEach(ts=>{
            totalHours += ts.regularHours;
            if (this.moment(ts.timeIn).day()===this.moment(timesheet.timeIn).day()){
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
          this.commit(timesheet);
        });
      }
      else this.commit(timesheet);
    };
    
    commit(timesheet) {
      if (timesheet.otHours+timesheet.regularHours<0) {
        return this.quickMessage('Error in Times, total hours cannot be negative');
      }
      if (timesheet.regularHours+timesheet.otHours>18) {
        this.quickMessage('Possible failure to clock out, please double check times!');
      }
      if (timesheet._id){
        this.http.put('/api/timesheets/' + timesheet._id,timesheet).then(()=>{
          this.getCurrent();
          this.getRecords(this.uid);
          this.newRecord={};
        });
      }
      else {
        this.http.post('/api/timesheets',timesheet).then(()=>{
          this.getCurrent();
          this.getRecords(this.uid);
          this.newRecord={};
        });
      }
    };
    
    cancel() {
      this.newRecord={};
    };
    
    edit(timesheet) {
      if (timesheet.timeIn) timesheet.timeIn = this.moment(timesheet.timeIn).format('MMM DD, YYYY, h:mm:ss A');
      if (timesheet.timeOut) timesheet.timeOut = this.moment(timesheet.timeOut).format('MMM DD, YYYY, h:mm:ss A');
      this.newRecord = timesheet;
    };
    
    delete(timesheet) {
      this.http.delete('/api/timesheets/' + timesheet._id).then(()=>{
        this.getCurrent();
        this.getRecords(this.uid);
      });
    };
    
    nameLookup(uid) {
      this.newRecord.name = "";
      var index = this.users.findIndex((element)=>{
        return element._id===uid;
      });
      if (index>-1&&(this.users[index].role==='admin'||this.users[index].role==='admin')){
        this.newRecord.name = this.users[index].name;
      }
    };
    
    print() {
      this.$timeout(this.$window.print,500);
    };
    
    setEmployee (employee){
      this.uid=employee.uid;
      this.getRecords(this.uid);
    };
    
    
  
}

angular.module('workspaceApp')
  .component('timeclock', {
    templateUrl: 'app/timeclock/timeclock.html',
    controller: TimeclockComponent,
    controllerAs: 'timeclock'
  });

})();
