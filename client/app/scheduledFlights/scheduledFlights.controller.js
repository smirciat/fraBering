'use strict';

(function(){

class ScheduledFlightsComponent {
  constructor($http,Auth) {
    var self=this;
    self.isAdmin=Auth.isAdmin;
    self.http=$http;
    self.newFlight={};
    self.init();
  }
  
  init(){
    var self=this;
    self.http.get('/api/flights').then(function(response){
      self.flights=response.data.sort(function(a,b){
        return a.flightNum.localeCompare(b.flightNum);
      });
    });
  }
  
  edit(flight,index){
    var self=this;
    self.index=index;
    self.newFlight=angular.copy(flight);
    self.refreshFlight();
  }
  
  refreshFlight(){
    var self=this;
    self.newFlight.airportsString = JSON.stringify(self.newFlight.airports);
    self.newFlight.daysOfWeekString = JSON.stringify(self.newFlight.daysOfWeek);
    self.newFlight.departTimesString = JSON.stringify(self.newFlight.departTimes);
  }
  
  update(flight){
    var self=this;
    //if (flight==="false") flight=false;
    if (flight.airportsString) flight.airports = JSON.parse(flight.airportsString);
    if (flight.daysOfWeekString) flight.daysOfWeek = JSON.parse(flight.daysOfWeekString);
    if (flight.departTimesString) flight.departTimes = JSON.parse(flight.departTimesString);
    flight.departTimes=flight.departTimes.filter(Boolean);
    flight.daysOfWeek=flight.daysOfWeek.filter(Boolean);
    flight.airports=flight.airports.filter(Boolean);
    if (flight._id){
      self.http.put('/api/flights/' + flight._id,flight).then(function(){
        self.flights[self.index]=angular.copy(flight);
        self.newFlight={};
      });
    }
    else {
      self.http.post('/api/flights',flight).then(function(response){
        self.flights[self.flights.length]=response.data;
        self.newFlight={};
      });
    }
  }
  
  cancel(){
    var self=this;
    self.newFlight={};
  }
  
  addAirport(){
    var self=this;
    self.newFlight.airports.push(self.newAirport);
    self.refreshFlight();
    self.newAirport="";
  }
  
  addDepartTime(){
    var self=this;
    self.newFlight.departTimes.push(self.newDepartTime);
    self.refreshFlight();
    self.newDepartTime="";
  }
  
  newFlightInit(){
    var self=this;
    if (!self.newFlight.daysOfWeek) self.newFlight.daysOfWeek=[];
    if (!self.newFlight.departTimes) self.newFlight.departTimes=[];
    if (!self.newFlight.airports) {
      self.newFlight.airports=[];
      self.refreshFlight();
    }
  }
}

angular.module('workspaceApp')
  .component('scheduledFlights', {
    templateUrl: 'app/scheduledFlights/scheduledFlights.html',
    controller: ScheduledFlightsComponent,
    controllerAs: 'scheduled',
    authenticate:'superadmin'
  });

})();
