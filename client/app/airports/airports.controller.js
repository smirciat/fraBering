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
      self.airports=response.data.sort(function(a,b){
        return a.name.localeCompare(b.name);
      });
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
    if (airport.ceilingRequirementString) airport.ceilingRequirement = JSON.parse(airport.ceilingRequirementString);
    if (airport.visibilityRequirementString) airport.visibilityRequirement = JSON.parse(airport.visibilityRequirementString);
    if (airport.windRequirementString) airport.windRequirement = JSON.parse(airport.windRequirementString);
    if (airport._id){
      this.http.put('/api/airportRequirements/' + airport._id,airport).then(()=>{
        this.airports[this.index]=angular.copy(airport);
        this.newAirport={};
      });
    }
    else {
      this.http.post('/api/airportRequirements',airport).then((response)=>{
        this.airports[this.airports.length]=response.data;
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
