'use strict';

(function() {

  class MainController {

    constructor($http, $scope, socket,$mdDialog) {
      this.$http = $http;
      this.scope=$scope;
      this.socket = socket;
      this.mdDialog=$mdDialog;
      this.assessment={};
      this.airports=[];
      this.flights=[];
      this.pilots=[];
      var self=this;
      
      $scope.$watch('main.assessment.pilot',(newVal,oldVal)=>{
        if (!newVal) return;
        if (this.assessment.flight&&this.assessment.flight!=="Extra") {
          //Update this.assessment
        }
        
      });
      
      $scope.$on('$destroy', ()=> {
        socket.unsyncUpdates('flight');
      });
    }

    $onInit() {
      this.$http.get('/api/flights')
        .then(response => {
          this.flights = response.data;
          this.socket.syncUpdates('flight', this.flights);
        });
        
      this.$http.get('/api/pilots')
        .then(response => {
          this.pilots = response.data;
        });
    }

    addThing() {
      if (this.newThing) {
        this.$http.post('/api/things', {
          name: this.newThing
        });
        this.newThing = '';
      }
    }

    deleteThing(thing) {
      this.$http.delete('/api/things/' + thing._id);
    }
    
    changeFlight(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    // Modal dialogs should fully cover application
    // to prevent interaction outside of dialog
      if (this.assessment.flight==="Extra") {
        //unlisted flight number
        var self=this;
        var confirm = this.mdDialog.prompt()
            .parent(angular.element(document.body))
            .title('What is the new flight number?')
            .textContent('Enter a three or four digit flight number.')
            .placeholder('Flight Number')
            .ariaLabel('Flight Number')
            .initialValue('')
            .targetEvent(ev)
            .required(true)
            .ok('OK')
            .cancel('Cancel');
            
        this.mdDialog.show(confirm).then(function(result) {
          var newFlight={flightNum:result};
          var flightArr=self.flights.filter((flight)=>{
            return flight.flightNum===result.slice(-3);
          });
          if (flightArr.length>0) {
            newFlight=JSON.parse(JSON.stringify(flightArr[0]));
            newFlight.flightNum=result;
          }
          self.flights.push(newFlight);
          self.assessment.flight =  result;
          flightArr = self.flights.filter((flt)=>{
            return self.assessment.flight===flt.flightNum;
          });
          if (flightArr.length>0) self.airports=flightArr[0].airports;
          if (self.assessment.pilot) {
            //Update this.assessment
          }
        }, function() {
          self.assessment.flight = "";
        });
      }
      var flightArr = this.flights.filter((flt)=>{
        return this.assessment.flight===flt.flightNum;
      });
      if (flightArr.length>0) this.airports=flightArr[0].airports;
      console.log(this.flights)
      if (this.assessment.pilot) {
        //Update this.assessment
      }
      
    };
    
    
  }

  angular.module('workspaceApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController,
      controllerAs: 'main'
    });
})();
