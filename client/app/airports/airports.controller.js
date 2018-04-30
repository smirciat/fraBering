'use strict';

(function(){

class AirportsComponent {
  constructor($http) {
    var self=this;
    self.http=$http;
    self.newAirport={};
    self.init();
  }
  
  init(){
    var self=this;
    self.http.get('/api/airportRequirements').then(function(response){
      self.airports=response.data.sort(function(a,b){
        return a.name.localeCompare(b.name);
      });
    });
  }
  
  edit(airport,index){
    var self=this;
    self.index=index;
    self.newAirport=angular.copy(airport);
    self.refreshAirport();
  }
  
  refreshAirport(){
    var self=this;
    self.newAirport.ceilingRequirementString = JSON.stringify(self.newAirport.ceilingRequirement);
    self.newAirport.visibilityRequirementString = JSON.stringify(self.newAirport.visibilityRequirement);
    self.newAirport.windRequirementString = JSON.stringify(self.newAirport.windRequirement);
  }
  
  update(airport){
    var self=this;
    if (airport==="false") airport=false;
    if (airport.ceilingRequirementString) airport.ceilingRequirement = JSON.parse(airport.ceilingRequirementString);
    if (airport.visibilityRequirementString) airport.visibilityRequirement = JSON.parse(airport.visibilityRequirementString);
    if (airport.windRequirementString) airport.windRequirement = JSON.parse(airport.windRequirementString);
    if (airport.runways&&airport.runways!=="") {
      if (airport.runways.substring(0,1)!=='[') airport.runways = '['+airport.runways+']';
      airport.runways = JSON.parse(airport.runways);
    }
    if (airport._id){
      self.http.put('/api/airportRequirements/' + airport._id,airport).then(function(){
        self.airports[self.index]=angular.copy(airport);
        self.newAirport={};
      });
    }
    else {
      self.http.post('/api/airportRequirements',airport).then(function(response){
        self.airports[self.airports.length]=response.data;
        self.newAirport={};
      });
    }
  }
  
  cancel(){
    var self=this;
    self.newAirport={};
  }
}

angular.module('workspaceApp')
  .component('airports', {
    templateUrl: 'app/airports/airports.html',
    controller: AirportsComponent,
    controllerAs: 'airports'
  });

})();
