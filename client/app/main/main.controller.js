'use strict';

(function() {

  class MainController {

    constructor($http, $scope, socket,$mdDialog,$timeout,appConfig,$interval) {
      this.$http = $http;
      this.interval=$interval;
      this.scope=$scope;
      this.socket = socket;
      this.mdDialog=$mdDialog;
      this.timeout=$timeout;
      this.appConfig=appConfig;
      this.localAssessments=[];
      if (window.localStorage.getItem( 'assessments' )===null||window.localStorage.getItem( 'assessments' )==="undefined"){
        window.localStorage.setItem('assessments',JSON.stringify([]));
      }
      else this.localAssessments=JSON.parse(window.localStorage.getItem( 'assessments' ));
      
      console.log(this.localAssessments)
      var vis,ceil,wind,runway,freeze;
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
      
      self.scrapeStorage();
      $interval(function(){
        self.scrapeStorage();
      },1800000);//each 30 minutes
    }
    
    scrapeStorage(){
      var self=this;
      window.localStorage.setItem( 'assessments', JSON.stringify(self.localAssessments) );
      if (Array.isArray(self.localAssessments)) {
        self.localAssessments.forEach(function(assessment,index){
          self.$http.post('/api/assessments', assessment)
            .then(function(response){//success
              self.localAssessments.splice(index,1);
              window.localStorage.setItem( 'assessments', JSON.stringify(self.localAssessments) );
            },
            function(response){//fail
              
            });
        });
      }
    }
    
    initAssessment(){
      var airports,pilot,flight,equipment;
      if (this.assessment) {
        pilot=this.assessment.pilot||"";
        flight=this.assessment.flight||"";
        airports=this.assessment.airports||[];
        equipment=this.assessment.equipment||{};
      }
      else airports=[];
      this.assessment={metars:[],tafs:[],visibilities:[],ceilings:[],windGusts:[],
        windDirections:[],runwayConditions:[],freezingPrecipitations:[], airports:airports, pilot:pilot,flight:flight,equipment:equipment
      };
    }
    
    initAirport(airport,index) {
      var self=this;
      self.assessment.metars[index]="";
      self.assessment.tafs[index]="";
      self.$http.get('https://avwx.rest/api/metar/' + airport).then(function(response){
        if (response.data.Error) return;
        self.assessment.metars[index]=response.data['Raw-Report'];
        var len = response.data['Cloud-List'].length;
        if (len===0) self.assessment.ceilings[index]='10000';
        else if (len>-1&&(response.data['Cloud-List'][0][0]==='BKN'||response.data['Cloud-List'][0][0]==='OVC'||response.data['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=response.data['Cloud-List'][0][1]+'00';
        else if (len>=2&&(response.data['Cloud-List'][1][0]==='BKN'||response.data['Cloud-List'][1][0]==='OVC'||response.data['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=response.data['Cloud-List'][1][1]+'00';
        else if (len>=3&&(response.data['Cloud-List'][2][0]==='BKN'||response.data['Cloud-List'][2][0]==='OVC'||response.data['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=response.data['Cloud-List'][2][1]+'00';
        else if (len>=4&&(response.data['Cloud-List'][3][0]==='BKN'||response.data['Cloud-List'][3][0]==='OVC'||response.data['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=response.data['Cloud-List'][3][1]+'00';
        else self.assessment.ceilings[index]='10000';
        self.assessment.ceilings[index] = self.assessment.ceilings[index].replace(/^0+/, '');
        if (response.data['Wind-Gust']==="") self.assessment.windGusts[index]=response.data['Wind-Speed'];
        else self.assessment.windGusts[index]=response.data['Wind-Gust'];
        self.assessment.visibilities[index]=response.data.Visibility;
        if (self.assessment.visibilities[index].includes('/')) {
          var bits = self.assessment.visibilities[index].split("/");
          self.assessment.visibilities[index] = parseInt(bits[0],10)/parseInt(bits[1],10);
        }
        self.assessment.visibilities[index]=parseFloat(self.assessment.visibilities[index]);
        self.assessment.runwayConditions[index]=5;
        self.assessment.freezingPrecipitations[index]=false;
        if (response.data['Other-List'].length>0) {
          response.data['Other-List'].forEach(item=>{
            var i=item.replace(/[^a-zA-Z]/g, "");
            console.log(i)
            if (i.substring(0,2)==="FR") self.assessment.freezingPrecipitations[index]=true;
          });
        }
        //self.airports[index].visibilityColor=self.weatherClass(self.airports[index].visibility,'visibility');
        //self.airports[index].ceilingColor=self.weatherClass(self.airports[index].ceiling,'ceiling');
        //self.airports[index].windColor=self.windClass(self.airports[index].wind);
        //Is a notification required?
        //if (self.notifications==="YES") {
        //  if (self.airports[index].ceilingColor!==self.airportsCopy[index].ceilingColor
        //    ||self.airports[index].windColor!==self.airportsCopy[index].windColor
        //    ||self.airports[index].visibilityColor!==self.airportsCopy[index].visibilityColor){
              //send a notification
              
        //  }
        //}
      });
      self.$http.get('https://avwx.rest/api/taf/' + airport).then(function(response){
        if (response.data.Error) { 
          //self.airports[index]=self.airportsCopy[index];
          return;
        }
        self.assessment.tafs[index]=response.data['Raw-Report'];
      },function(response){self.assessment.tafs[index]=""});
    }
    
    $onInit() {
      this.init();
      //this.$http.get('/api/flights')
      //  .then(response => {
      //    console.log(response.data)
      //    this.flights = response.data;
          //this.socket.syncUpdates('flight', this.flights);
          
      //  });
        
      //this.$http.get('/api/pilots')
      //  .then(response => {
      //    console.log(response.data)
      //    this.pilots = response.data;
      //  });
        
      //this.$http.get('/api/airportRequirements')
      //  .then(response => {
      //    console.log(response.data)
      //    this.airports=response.data;
      //  });
    }
    
    init(){
      this.flights=this.appConfig.flights;
      this.pilots=this.appConfig.pilots;
      this.initAssessment();
      this.airports=this.appConfig.airportRequirements;
      this.equipment=this.appConfig.equipment;
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
      var self=this;
      if (this.assessment.flight==="Extra") {
        //unlisted flight number
        
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
          if (flightArr.length>0) self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
          self.initAssessment();
          self.assessment.airports.forEach((airport,index)=>{
            self.initAirport(airport,index);
          });
        }, function() {
          self.assessment.flight = "";
        });
      }
      else {
        var flightArr = self.flights.filter((flt)=>{
          return self.assessment.flight===flt.flightNum;
        });
        if (flightArr.length>0) self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
        self.initAssessment();
        self.assessment.airports.forEach((airport,index)=>{
          self.initAirport(airport,index);
        });
      }
      
    }
    
    changeAirport(ev,index){
      var self=this;
      var confirm = this.mdDialog.prompt()
        .parent(angular.element(document.body))
        .title('What is the new airport?')
        .textContent('Enter a four letter airport code')
        .placeholder('Airport')
        .ariaLabel('Airport')
        .initialValue('')
        .targetEvent(ev)
        .required(true)
        .ok('OK')
        .cancel('Cancel');
          
      this.mdDialog.show(confirm).then(function(result) {
        if (result.length===4){
          self.assessment.airports[index]=result;
          self.initAirport(result,index);
        }
      });
    }
    
    changeParam(ev,index,param,title){
      var self=this;
      var confirm = this.mdDialog.prompt()
        .parent(angular.element(document.body))
        .title('What is the ' + title + ' for ' + self.assessment.airports[index]  + '?')
        .textContent('Enter ' + title)
        .placeholder(title)
        .ariaLabel(title)
        .initialValue('')
        .targetEvent(ev)
        .required(true)
        .ok('OK')
        .cancel('Cancel');
          
      this.mdDialog.show(confirm).then(function(result) {
        if (result.length!==""){
          self.assessment[param][index]=result;
        }
      });
    }
    
    addAirport(ev){
      var self=this;
      var confirm = this.mdDialog.prompt()
        .parent(angular.element(document.body))
        .title('What is the new airport?')
        .textContent('Enter a four letter airport code')
        .placeholder('Airport')
        .ariaLabel('Airport')
        .initialValue('')
        .targetEvent(ev)
        .required(true)
        .ok('OK')
        .cancel('Cancel');
          
      this.mdDialog.show(confirm).then(function(result) {
        if (result.length===4){
          self.assessment.airports.push(result);
          self.initAirport(result,self.assessment.airports.length-1);
        }
      });
    }
    
    openChangeMenu(mdMenu,ev){
      this.timeout(()=>{mdMenu.open(ev)},300);
    }
    
    getAirport(icao){
      var airportsArr = this.airports.filter(airport=>{
        return airport.icao.toLowerCase()===icao.toLowerCase();
      });
      if (airportsArr.length>0) return airportsArr[0];
      else return {icao:icao,visibilityRequirement:{"yellow":3,"red":0.5,"ifr":2,"night":5},ceilingRequirement:{"yellow":1000,"red":280,"ifr":1000,"night":3000}};
    }
    
    airportClass(index){
      if (this.assessment.metars[index]==="") return "md-blue";
      return "md-green";
    }
    
    visibilityClass(index){
      var airport = this.getAirport(this.assessment.airports[index]);
      if (airport.visibilityRequirement.red>this.assessment.visibilities[index]) return "md-red";
      if (airport.visibilityRequirement.ifr>this.assessment.visibilities[index]) return "md-orange";
      if (airport.visibilityRequirement.yellow>this.assessment.visibilities[index]) return "md-yellow";
      return "md-green";
    }
    
    ceilingClass(index){
      var airport = this.getAirport(this.assessment.airports[index]);
      if (airport.ceilingRequirement.red>this.assessment.ceilings[index]) return "md-red";
      if (airport.ceilingRequirement.ifr>this.assessment.ceilings[index]) return "md-orange";
      if (airport.ceilingRequirement.yellow>this.assessment.ceilings[index]) return "md-yellow";
      return "md-green";
    }
    
    runwayClass(index){
      if (this.assessment.runwayConditions[index]<1) return "md-red";
      return "md-green";
    }
    
    windClass(index){
      if (this.assessment.windGusts[index]>34) return "md-red";
      return "md-green";
    }
    
    freezingClass(index){
      if (this.assessment.freezingPrecipitations[index]) return "md-red";
      return "md-green";
    }
    
    tafClass(index){
      if (this.assessment.tafs[index]!=="") return "md-green";
      return "md-blue";
    }
    
    submit(ev){
      var self=this;
      self.assessment.equipment=self.assessment.equipment.name;
      if (this.assessment.pilot===""||this.assessment.flight==="") {
        var alert = this.mdDialog.alert({
          title: 'Attention',
          textContent: 'You need to enter a pilot and a flight number at the top of the page.',
          ok: 'Close'
        });
            
        this.mdDialog.show(alert).then(function() {
          
        });
      }
      else {
        var matchPilots = this.pilots.filter(pilot=>{
          return pilot.name===this.assessment.pilot;
        });
        if (matchPilots.length>0) {
          this.assessment.level=matchPilots[0].level;
        }
        else this.assessment.level="level1";
        this.assessment.date=new Date();
        this.$http.post('/api/assessments', this.assessment)
          .then(function(response){
            self.assessment={};
            self.init();
            self.initAssessment();
          },
          function(response){
            self.localAssessments.push(self.assessment);
            window.localStorage.setItem( 'assessments', JSON.stringify(self.localAssessments) );
            self.assessment={};
            self.init();
            self.initAssessment();
          }
        );
        
      }
    }
    
  }

  angular.module('workspaceApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController,
      controllerAs: 'main'
    });
})();
