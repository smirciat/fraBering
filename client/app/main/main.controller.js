'use strict';

(function() {

  class MainController {

    constructor($http, $scope, socket,$mdDialog,$mdSidenav,$timeout,appConfig,$interval,moment) {
      this.$http = $http;
      this.interval=$interval;
      this.scope=$scope;
      this.socket = socket;
      this.mdDialog=$mdDialog;
      this.mdSidenav=$mdSidenav;
      this.timeout=$timeout;
      this.appConfig=appConfig;
      this.moment=moment;
      this.localAssessments=[];
      if (window.localStorage.getItem( 'assessments' )===null||window.localStorage.getItem( 'assessments' )==="undefined"){
        window.localStorage.setItem('assessments',JSON.stringify([]));
      }
      else this.localAssessments=JSON.parse(window.localStorage.getItem( 'assessments' ));
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
              index=self.localAssessments.indexOf(assessment);
              self.localAssessments.splice(index,1);
              window.localStorage.setItem( 'assessments', JSON.stringify(self.localAssessments) );
            },
            function(response){//fail
              
            });
        });
      }
    }
    
    initAssessment(){
      var airports,pilot,flight,equipment,color,night,times;
      if (this.assessment) {
        pilot=this.assessment.pilot||"";
        flight=this.assessment.flight||"";
        airports=this.assessment.airports||[];
        equipment=this.assessment.equipment||{id:1,name:"Caravan",wind:30,temp:-50};
        color=this.assessment.color||[];
        night=this.assessment.night||[];
        times=this.assessment.times||[];
      }
      else airports=[];
      this.assessment={metars:[],tafs:[],visibilities:[],ceilings:[],windGusts:[],night:night,times:times,
        windDirections:[],runwayConditions:[],freezingPrecipitations:[], airports:airports, pilot:pilot,flight:flight,equipment:equipment,color:color
      };
    }
    
    initNight(airport,index){
      var self=this;
      var year = self.moment().year();
      var month = self.moment().month()+1;
      var day = self.moment().date();
      var date = year + '-' + month + '-' + day;
      self.assessment.night[index]=false;
      var airportParams = self.getAirport(airport);
      self.$http.get('https://api.sunrise-sunset.org/json?lat=' + airportParams.latitude + '&lng=' + airportParams.longitude + '&date=' + date + '&formatted=0').then((response)=>{
        if (response.data.results.civil_twilight_begin==='1970-01-01T00:00:01+00:00') return;
        var twilightStart = self.moment(response.data.results.civil_twilight_begin);
        var twilightEnd = self.moment(response.data.results.civil_twilight_end);
        if (self.departTimes.length<=index||self.departTimes[index]==="") return;
        var timeArr=self.departTimes[index].split(':');
        if (timeArr.length<2) return;
        var departTime = self.moment(twilightStart).startOf('day').hour(timeArr[0]).minute(timeArr[1]);
        if (departTime.isBetween(twilightStart,twilightEnd)) self.assessment.night[index]=false;
        else self.assessment.night[index]=true;
      });  
    }
    
    initAirport(airport,index) {
      var self=this;
      self.assessment.color[index]="md-green";
      self.assessment.metars[index]="";
      self.assessment.tafs[index]="";
      //lookup if airport is at night
      self.initNight(airport,index);
      if (airport.length!==4) return;
      self.$http.get('https://avwx.rest/api/metar/' + airport).then(function(response){
        if (response.data.Error) return;
        
        if ((response.data.Temperature*9/5+32)<self.assessment.equipment.temp) {
            var alert = self.mdDialog.alert({
            title: 'Caution',
            textContent: 'Check the temperature, it may be too cold for this aircraft',
            ok: 'Close'
          });
    
          self.mdDialog
            .show( alert )
            .finally(function() {
              alert = undefined;
            }); 
        }
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
        self.$http.post('/api/assessments/lookup',{airport:airport}).then(function(res){
          if (res.data.length>0){
            var i = res.data[0].airports.indexOf(airport);
            if (i>-1) self.assessment.runwayConditions[index]=res.data[0].runwayConditions[i];
            else self.assessment.runwayConditions[index]=5;
          }
          else self.assessment.runwayConditions[index]=5;
        });
        self.assessment.freezingPrecipitations[index]=false;
        if (response.data['Other-List'].length>0) {
          response.data['Other-List'].forEach(item=>{
            var i=item.replace(/[^a-zA-Z]/g, "");
            if (i.substring(0,2)==="FR") self.assessment.freezingPrecipitations[index]=true;
          });
        }
      },function(response){
        if (response.status===500){
          self.timeout(function(){
            //self.initAirport(airport,index);
          },20000);
        }
        else self.assessment.metars[index]="";
      });
      if (airport=="PAOM"||airport=="PAOT"||airport=="PAUN"||airport=="PANC"||airport=="PAGA") {
        self.$http.get('https://avwx.rest/api/taf/' + airport).then(function(response){
          if (response.data.Error) { 
            //self.airports[index]=self.airportsCopy[index];
            return;
          }
          self.assessment.tafs[index]=response.data['Raw-Report'];
        },function(response){
            if (response.status===500){
            self.timeout(self.initAirport(airport,index),20000);
          }
          else self.assessment.metars[index]="";
        });
      }
    }
    
    $onInit() {
      this.init();
    }
    
    init(){
      this.$http.get('/api/flights')
        .then(response => {
          this.flights = response.data;
          window.localStorage.setItem('flights',JSON.stringify(this.flights));
        },response=>{
          this.flights=JSON.parse(window.localStorage.getItem('flights'));
        });
        
      this.$http.get('/api/pilots')
        .then(response => {
          this.pilots = response.data;
          window.localStorage.setItem('pilots',JSON.stringify(this.pilots));
        },response=>{
          this.pilots=JSON.parse(window.localStorage.getItem('pilots'));
        });
        
      this.$http.get('/api/airportRequirements')
        .then(response => {
          this.airports=response.data;
          window.localStorage.setItem('airports',JSON.stringify(this.airports));
        },response=>{
          this.airports=JSON.parse(window.localStorage.getItem('airports'));
        });
      //this.flights=this.appConfig.flights;
      //this.pilots=this.appConfig.pilots;
      this.initAssessment();
      //this.airports=this.appConfig.airportRequirements;
      this.equipment=this.appConfig.equipment;
    }
    
    changeFlight(ev) {
      var self=this;
      if (!self.assessment.flight||self.assessment.flight==="") return;
    // Appending dialog to document.body to cover sidenav in docs app
    // Modal dialogs should fully cover application
    // to prevent interaction outside of dialog
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
            self.departTimes=flightArr[0].departTimes;
          }
          self.flights.push(newFlight);
          self.assessment.flight =  result;
          flightArr = self.flights.filter((flt)=>{
            return self.assessment.flight===flt.flightNum;
          });
          if (flightArr.length>0) {
            self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
            self.departTimes=flightArr[0].departTimes;
          }
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
        if (flightArr.length>0) {
          self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
          self.departTimes=flightArr[0].departTimes;
        }
        self.initAssessment();
        self.assessment.airports.forEach((airport,index)=>{
          self.initAirport(airport,index);
        });
      }
      
    }
    
    changeAirport(ev,index){
      var self=this;
      var time=this.mdDialog.prompt({clickOutsideToClose: true,multiple:true})
        .parent(angular.element(document.body))
        .title('What is the new departure time for this airport?')
        .textContent('Enter a departure time in 24 hour time format')
        .placeholder('16:00')
        .ariaLabel('Time')
        .initialValue(self.departTimes[index])
        .targetEvent(ev)
        .required(true)
        .ok('Update Depart Time')
        .cancel('Change Airport or Cancel');
        
      var airport = this.mdDialog.prompt({clickOutsideToClose: true,multiple:true})
        .parent(angular.element(document.body))
        .title('What is the new airport?')
        .textContent('Enter a four letter airport code')
        .placeholder('Airport')
        .ariaLabel('Airport')
        .initialValue('')
        .targetEvent(ev)
        .required(true)
        .ok('Update Airport Code')
        .cancel('Cancel');
          
      this.mdDialog.show(time).then(function(result) {
        if (result!=="") {
          self.departTimes[index] = result;
          self.initNight(self.assessment.airports[index],index);
        }
      },function(){
        self.mdDialog.show(airport).then(function(result) {
          if (result.length===4){
            self.assessment.airports[index]=result;
            self.initAirport(result,index);
          }
        });
      });
    }
    
    changeParam(ev,index,param,title){
      var self=this;
      var confirm = this.mdDialog.prompt({clickOutsideToClose: true})
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
          self.assessment.color[index]="md=green";
          self.assessment[param][index]=result;
        }
      });
    }
    
    addAirport(ev){
      var self=this;
      var confirm = this.mdDialog.prompt({clickOutsideToClose: true})
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
          self.assessment.color.push('md-green');
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
    
    red(i){
      this.assessment.color[i]='md-red';
      return 'md-red';
    }
    
    yellow(i){
      if (this.assessment.color[i]!=='md-red') this.assessment.color[i]='md-yellow';
      return 'md-yellow';
    }
    
    orange(i){
      if (this.assessment.color[i]!=='md-red'&&this.assessment.color[i]!=='md-yellow') this.assessment.color[i]='md-orange';
      return 'md-orange';
    }
    
    green(i){
      if (this.assessment.color[i]!=='md-red'&&this.assessment.color[i]!=='md-yellow'&&this.assessment.color[i]!=='md-orange') 
         this.assessment.color[i]='md-green';
      return 'md-green';
    }
    
    visibilityClass(index){
      var airport = this.getAirport(this.assessment.airports[index]);
      if (airport.visibilityRequirement.red>this.assessment.visibilities[index]) return this.red(index);
      if (airport.visibilityRequirement.yellow>this.assessment.visibilities[index]) return this.yellow(index);
      if (this.assessment.night[index]) {
        if (airport.visibilityRequirement.night>this.assessment.visibilities[index]) return this.orange(index);
      }
      else {
        if (airport.visibilityRequirement.ifr>this.assessment.visibilities[index]) return this.orange(index);
      }
      
      return this.green(index);
    }
    
    ceilingClass(index){
      var airport = this.getAirport(this.assessment.airports[index]);
      if (airport.ceilingRequirement.red>this.assessment.ceilings[index]) return this.red(index);
      if (airport.ceilingRequirement.yellow>this.assessment.ceilings[index]) return this.yellow(index);
      if (this.assessment.night[index]) {
        if (airport.ceilingRequirement.night>this.assessment.ceilings[index]) return this.orange(index);
      }
      else {
        if (airport.ceilingRequirement.ifr>this.assessment.ceilings[index]) return this.orange(index);
      }
      
      return this.green(index);
    }
    
    runwayClass(index){
      if (this.assessment.runwayConditions[index]<2) return this.red(index);
      if (this.assessment.runwayConditions[index]<4) return this.yellow(index);
      return this.green(index);
    }
    
    windClass(index){
      if (this.assessment.windGusts[index]>this.assessment.equipment.wind) return this.red(index);
      return this.green(index);
    }
    
    freezingClass(index){
      if (this.assessment.freezingPrecipitations[index]) return this.red(index);
      return this.green(index);
    }
    
    tafClass(index){
      if (this.assessment.tafs[index]!=="") return this.green(index);
      return "md-blue";
    }
    
    nightClass(index){
      if (this.assessment.night[index]) return "night";
      else return "day";
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
    
    checkNotifications(ev){
      var self=this;
      self.$http.post('/api/notifications/pilot',{pilot:self.assessment.pilot}).then(function(response){
        console.log(response.data)
        var notifications=response.data;
        var length=notifications.length;
        var count=0;
        var confirm=[];
        notifications.forEach(function(notification,index){
          confirm[index] = self.mdDialog.confirm({clickOutsideToClose:true,multiple:true})
                .title('Notification from ' + self.moment(notifications[index].createdAt).format('ddd, MMM Do YYYY, h:mm:ss a') + ' created by ' + notifications[index].creator)
                .textContent(notifications[index].notification)
                .ariaLabel('Notification')
                .targetEvent(ev)
                .ok('I have read and understood this notification')
                .cancel('Remind me later');
        });
        
        var showAnother = function(){
          if (length>0) self.mdDialog.show(confirm[count]).then(function() {
            notifications[count].notified.push(self.assessment.pilot);
            self.$http.put('/api/notifications/'+notifications[count]._id, notifications[count]);
            count++;
            length--;
            showAnother();
          },function(){
            //do something if user declines to read notification
          });
        }
        
        showAnother();
        
      });
      
    }
    
    toggleMenu(){
      var self=this;
      self.mdSidenav('left').toggle();
    }
    
    pixelRatio(ratio){
      if (Math.floor(window.devicePixelRatio)===ratio) return true;
      if (window.devicePixelRatio>3&&ratio===3) return true;
      if (window.devicePixelRatio<1&&ratio===1) return true;
      return false;
    }
    
  }

  angular.module('workspaceApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController,
      controllerAs: 'main'
    });
})();
