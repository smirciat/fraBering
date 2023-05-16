'use strict';

(function(){

class MonitorComponent {
  constructor($http,Auth,$timeout,metar) {
    var self=this;
    if (window.localStorage.getItem('pilot')!==null&&window.localStorage.getItem('pilot')!=='undefined') self.tempPilot=JSON.parse(window.localStorage.getItem('pilot'));
    self.isAdmin=Auth.isAdmin;
    self.metar=metar;
    self.metarObj={};
    self.http=$http;
    self.timeout=$timeout;
    self.newMonitor={active:true,pilot:self.tempPilot.name,phone:self.tempPilot.phone};
    self.params=['Wind','Ceiling','Visibility','Icing'];
    self.class="";
    self.init();
  }
  
  init(){
    var self=this;
    //self.http.post('/api/monitors/monitor',{}).then(res=>{
    //  console.log('monitor started');
    //});
    self.http.get('/api/monitors').then(function(response){
      self.monitors=response.data.sort(function(a,b){
        return b._id-a._id;//a.name.localeCompare(b.name);
      });
    });
    
  }
  
  edit(monitor,index){
    var self=this;
    console.log(monitor)
    console.log(index)
    self.index=index;
    self.newMonitor=angular.copy(monitor);
    self.getMetar(self.newMonitor.airport);
    self.refreshMonitor();
  }
  
  deleteMonitor(id,index){
    this.http.delete('/api/monitors/'+id).then(res=>{
      this.monitors.splice(index,1);
    });
  }
  
  refreshMonitor(){
    var self=this;
    //self.newMonitor.ceilingRequirementString = JSON.stringify(self.newMonitor.ceilingRequirement);
    //self.newMonitor.visibilityRequirementString = JSON.stringify(self.newMonitor.visibilityRequirement);
    //self.newMonitor.windRequirementString = JSON.stringify(self.newMonitor.windRequirement);
  }
  
  update(monitor){
    var self=this;
    monitor.password="";
    if (window.localStorage.getItem('api')) monitor.password=window.localStorage.getItem('api');
    if (monitor==="false") monitor=false;
    //if (monitor.ceilingRequirementString) monitor.ceilingRequirement = JSON.parse(monitor.ceilingRequirementString);
    //if (monitor.visibilityRequirementString) monitor.visibilityRequirement = JSON.parse(monitor.visibilityRequirementString);
    //if (monitor.windRequirementString) monitor.windRequirement = JSON.parse(monitor.windRequirementString);
    //if (monitor.runways&&monitor.runways!=="") {
    //  if (!Array.isArray(monitor.runways)) {
    //    if (monitor.runways.substring(0,1)!=='[') monitor.runways = '['+monitor.runways+']';
    //    monitor.runways = JSON.parse(monitor.runways);
    //  }
    //}
    if (monitor._id){//updated existing monitor
      self.http.put('/api/monitors/' + monitor._id,monitor).then(()=>{
        self.monitors[self.index]=angular.copy(monitor);
        self.newMonitor={active:true};
        self.metarObj={};
        if (monitor.active) {
          //self.metar.startMonitor(angular.copy(monitor));
          self.http.post('/api/airportRequirements/autoCheck',{monitor:angular.copy(monitor)}).then(res=>{
            console.log(res);  
          });
          monitor.active=false;
        }
      });
    }
    else {//newly created monitor
      self.http.post('/api/monitors',monitor).then((response)=>{
        self.monitors.push(response.data);
        self.newMonitor={active:true};
        self.metarObj={};
        if (response.data.active) {
          //self.metar.startMonitor(response.data);
          self.http.post('/api/airportRequirements/autoCheck',{monitor:angular.copy(monitor)}).then(res=>{
            console.log(res);  
          });
          //monitor.active=false;
        }
        if (self.tempPilot&&self.tempPilot._id){//add phone number to pilot if it doesn't already exist
          self.http.get('/api/pilots/'+self.tempPilot._id).then(res=>{
            
            res.data.phone=response.data.phone.toString();
            self.http.put('/api/pilots/'+self.tempPilot._id,res.data).then((response)=>{
              
            });
          });  
        }
      });
    }
  }
  
  cancel(){
    var self=this;
    self.newMonitor={active:true,pilot:self.tempPilot.name,phone:self.tempPilot.phone};
    self.metarObj={};
  }
  
  toggle(index){
    var self=this;
    self.timeout(function(){
      self.monitors[index].active=!self.monitors[index].active;
    },0);
  }
  
  clearParam(){
    var self=this;
    self.newMonitor.watchedParameter="";
  }
  
  checkIcing(){
    var self=this;
    self.timeout(function(){
      if (self.newMonitor.watchedParameter==="Icing") self.newMonitor.watchedThreshold="false";
      if (self.newMonitor.watchedParameter==="Ceiling") self.newMonitor.watchedThreshold="500";
      if (self.newMonitor.watchedParameter==="Visibility") self.newMonitor.watchedThreshold="1";
      if (self.newMonitor.watchedParameter==="Wind") self.newMonitor.watchedThreshold="35";
    },0);
  }
  
  getMetar(airport){
    var self=this;
    self.class="";
    if (airport&&airport!==""&&airport.length>2) {
      this.http.post('/api/airportRequirements/adds',{airport:airport}).then(function(response){
        if (!response.data.metar||response.data.metar==="missing") return;
        var metar=response.data.metar;
        self.metarObj=self.metar.parseADDS(metar);
        console.log(self.metarObj)
      });
    }
  }
  
  classAirport(){
    if (this.class==="danger") return "btn-danger";
    if (this.class==="warning")  return "btn-warning";
    return "btn-success";
  }
  classVisibility(){
    var num=this.metarObj.Visibility;
    if (num<1) {
      this.class="danger"
      return "btn-danger";
    }
    if (num<3) {
      if (this.class!=="danger") this.class="warning";
      return "btn-warning";
    }
    return "btn-success";
  }
  classCeiling(){
    var num=this.metarObj.Ceiling*1;
    if (num<500) {
      this.class="danger";
      return "btn-danger";
    }
    if (num<1000) {
      if (this.class!=="danger") this.class="warning";
      return "btn-warning";
    }
    return "btn-success";
  }
  classWind(){
    var num=this.metarObj['Wind-Gust']*1;
    if (num>35) {
      this.class="danger";
      return "btn-danger";
    }
    if (num>25) {
      if (this.class!=="danger") this.class="warning";
      return "btn-warning";
    }
    return "btn-success";
  }
  classIcing(){
    if (this.metarObj.Freezing===true) {
      this.class="danger";
      return "btn-danger";
    }
    return "btn-success";
  }
}

angular.module('workspaceApp')
  .component('monitor', {
    templateUrl: 'app/monitor/monitor.html',
    controller: MonitorComponent,
    controllerAs: 'monitor'
  });

})();
