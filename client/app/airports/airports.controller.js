'use strict';

(function(){

class AirportsComponent {
  constructor($http) {
    var self=this;
    this.http=$http;
    this.newAirport={};
    this.init();
  }
  
  init(){
    var self=this;
    this.http.get('/api/airportRequirements').then(function(response){
      self.airports=response.data;
    });
  }
  
  edit(airport,index){
    this.index=index;
    this.newAirport=angular.copy(airport);
    this.refreshAirport();
  }
  
  refreshAirport(){
    this.newAirport.ceilingRequirementString = JSON.stringify(this.newAirport.ceilingRequirement);
    this.newAirport.visibilityRequirementString = JSON.stringify(this.newAirport.visibilityRequirement);
    this.newAirport.windRequirementString = JSON.stringify(this.newAirport.windRequirement);
  }
  
  update(airport){
    if (airport==="false") airport=false;
    airport.ceilingRequirement = JSON.parse(airport.ceilingRequirementString);
    airport.visibilityRequirement = JSON.parse(airport.visibilityRequirementString);
    airport.windRequirement = JSON.parse(airport.windRequirementString);
    if (airport._id){
      this.http.put('/api/airportRequirements/' + airport._id,airport).then(()=>{
        this.airports[this.index]=angular.copy(airport);
        this.newAirport={};
      });
    }
    else {
      this.http.post('/api/airportRequirements',airport).then(()=>{
        this.airports[this.index]=angular.copy(airport);
        this.newAirport={};
      });
    }
  }
  
  cancel(){
    this.newAirport={};
  }
}

angular.module('workspaceApp')
  .component('airports', {
    templateUrl: 'app/airports/airports.html',
    controller: AirportsComponent,
    controllerAs: 'airports'
  });

})();
