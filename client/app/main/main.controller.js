'use strict';

(function() {

  class MainController {

    constructor($http, $scope,$mdDialog,$mdSidenav,$timeout,appConfig,$interval,moment,metar) {
      var self=this;
      let pilotNames="Adam Baker,Andy Smircich,Brandon McIntosh,Brett Dunkley,Brian Weckwerth,Chad Antill,Charlton Heckman,Chris Shannon,Cole Thomas,Dan Roberts,David Olson,David Swenson,Dawson Evans,Drake Broussard,Fen Kinneen,Frank Parker,Jacob Larson,Jade Greene,Jay Barton,Jeff Higginbotham,Joe Small,Joel Karinen,Jonathan Hanson,Josh Krebiehl,Junyor Erikson,Justin Laws,Korey Rohlack,Kyle Lefebvre,Lance Bickford,Larry Eggart,Logan Bagley,Luke Murkowski,Matt Freckleton,Mike K. Evans,Mike R. Evans,Nathaniel Olson,Neill Toelle,Nick Hajdukovich,Patrik Toerdal,Phuongkonth Bunyi,Russell Rowe,Ryan Hanson,Ryan Woehler,Rylan Rickett,Sam Kendall,Savanna Paulsen,Scott Gordon,Seth Thomas,Sophia Hobbs,Tim Hopley,Tim Kunkel,Tim Smith,Tru Tripple";
      let pilotArr=pilotNames.split(',');
      this.pilotNames=[];
      pilotArr.forEach(pilot=>{
        this.pilotNames.push(pilot);
      });
      self.tempPilot={name:""};
      if (window.localStorage.getItem('pilot')!==null&&window.localStorage.getItem('pilot')!=='undefined') self.tempPilot=JSON.parse(window.localStorage.getItem('pilot'));
      self.$http = $http;
      self.interval=$interval;
      self.scope=$scope;
      self.mdDialog=$mdDialog;
      self.mdSidenav=$mdSidenav;
      self.timeout=$timeout;
      self.appConfig=appConfig;
      self.moment=moment;
      self.metar=metar;
      moment.tz.setDefault("America/Anchorage");
      self.localAssessments=[];
      self.dialogAirports=[];
      self.apiPassword="";
      this.submitDisabled=false;
      self.fourteenHours=$interval(function(){
        self.init();
      },50400000);//each 14 hours
      self.scrape=$interval(function(){
        self.scrapeStorage();
      },1800000);//each 30 minutes
      
      $scope.$on(
          "$destroy",
          function( event ) {
              $timeout.cancel( self.timer );
              $interval.cancel(self.fourteenHours);
              $interval.cancel(self.scrape);
          }
      );
      
      self.promptForPassword=function(){
        var confirm = self.mdDialog.prompt()
            .parent(angular.element(document.body))
            .title('What is the password?')
            .textContent('You only need to enter this once per device.  The device will remember until the password is changed.')
            .placeholder('password')
            .ariaLabel('password')
            .initialValue('')
            .required(true)
            .ok('Store')
            .cancel('Cancel');
            
        self.mdDialog.show(confirm).then(function(result) {
          window.localStorage.setItem('api',result);
          self.apiPassword=result;
        });
      };
      
      if (window.localStorage.getItem( 'api' )===null||window.localStorage.getItem( 'api' )==="undefined"){
        self.promptForPassword();
      }
      else self.apiPassword=window.localStorage.getItem( 'api' );
      if (window.localStorage.getItem( 'assessments' )===null||window.localStorage.getItem( 'assessments' )==="undefined"){
        window.localStorage.setItem('assessments',JSON.stringify([]));
      }
      else self.localAssessments=JSON.parse(window.localStorage.getItem( 'assessments' ));
      
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
              console.log(response);
            });
        });
      }
    }
    
    initAssessment(){
      
      var self=this;
      self.timeout.cancel(self.timer);
      var airports,pilot,flight,equipment,colors,night,times;
      self.isSubmitted=false;
      if (self.assessment) {
        pilot=self.assessment.pilotObj||"";
        flight=self.assessment.flight||"";
        airports=self.assessment.airports||[];
        equipment=self.assessment.equipmentObj||{id:5,name:"1900",wind:40,xwind:35,temp:-50};
        colors=self.assessment.colors||[];
        night=self.assessment.night||[];
        times=self.assessment.times||[];
      }
      else {
        airports=[];
      }
      self.assessment={metars:[],tafs:[],visibilities:[],ceilings:[],windGusts:[],night:night,times:times,crossWinds:[],runwayConditionComments:[],
        windDirections:[],runwayConditions:[],freezingPrecipitations:[], airports:airports, pilotObj:pilot,flight:flight,equipmentObj:equipment,
        colors:colors,forecastFreezingPrecipitations:[],forecastVisibilities:[],dawn:[],dusk:[],altimeters:[]
      };
      if (self.assessment.pilotObj===""||self.assessment.pilotObj===undefined||self.assessment.pilotObj.name==='z') self.initPilots();
  
    }
    
    initPilots(){
      var self=this;
      self.$http.get('/api/pilots')
        .then(function(response){
          self.pilots = response.data;
          self.timeout(function(){
            if (self.assessment.pilotObj===""||self.assessment.pilotObj===undefined) self.assessment.pilotObj=angular.copy(self.tempPilot);
          },1000);
          window.localStorage.setItem('pilots',JSON.stringify(self.pilots));
        },function(response){
          self.pilots=JSON.parse(window.localStorage.getItem('pilots'));
          self.timeout(function(){
            if (self.assessment.pilotObj===""||self.assessment.pilotObj===undefined) self.assessment.pilotObj=angular.copy(self.tempPilot);
          },1000);
        });
    }

    initNight(airport,index){
      var self=this;
      self.assessment.night[index]=false;
      var airportParams = self.getAirport(airport);
      let times=SunCalc.getTimes(new Date(),airportParams.latitude,airportParams.longitude);
      if (times.dawn instanceof Date && !isNaN(times.dawn)&&times.dusk instanceof Date && !isNaN(times.dusk)) {
        var twilightStart = self.moment(times.dawn);
        var twilightEnd = self.moment(times.dusk);
        if (self.assessment.times.length<=index||self.assessment.times[index]==="") return;
        var timeArr=self.assessment.times[index].split(':');
        if (timeArr.length<2) return;
        var departTime = self.moment(twilightStart).startOf('day').hour(timeArr[0]).minute(timeArr[1]);
        if (departTime.isBetween(twilightStart,twilightEnd)) self.assessment.night[index]=false;
        else self.assessment.night[index]=true;
      }
      else self.assessment.night[index]=false;
    }
    
    initAirport(airport,index,count) {
      count++;
      var self=this;
      self.assessment.colors[index]="md-green";
      self.assessment.metars[index]="";
      self.assessment.tafs[index]="";
      //lookup if airport is at night
      self.initNight(airport,index);
      if (airport.length<3) return;
      self.$http.post('/api/airportRequirements/adds',{airport:airport}).then(function(response){
        
        var metar=response.data.metar;
        var longitude=response.data.longitude;
        var latitude=response.data.latitude;
        let metarDate=self.moment(response.data.date);
        let now=self.moment();
        let metarAge = self.moment.duration(now.diff(metarDate));
        let minutes = metarAge.asMinutes();
        let times=SunCalc.getTimes(new Date(),latitude,longitude);
        self.assessment.dusk[index]=self.moment(times.dusk).format("hh:mm A");
        self.assessment.dawn[index]=self.moment(times.dawn).format("hh:mm A");
        if (metar==="missing") {
          console.log('Metar missing');
          if (count<6) {
            self.timer=self.timeout(function(){self.initAirport(airport,index,count)},20000);
            self.timer;
          }
          return;
        }
        if (metar&&metar!==""&&minutes<=120) {
          var metarObj=self.metar.parseADDS(metar);
          if ((metarObj.Temperature*9/5+32)<self.assessment.equipmentObj.temp) {
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
          self.assessment.metars[index]=metarObj['Raw-Report'];
          var len = metarObj['Cloud-List'].length;
          if (len===0) self.assessment.ceilings[index]='9999';
          else if (len>-1&&(metarObj['Cloud-List'][0][0]==='BKN'||metarObj['Cloud-List'][0][0]==='OVC'||metarObj['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=metarObj['Cloud-List'][0][1]+'00';
          else if (len>=2&&(metarObj['Cloud-List'][1][0]==='BKN'||metarObj['Cloud-List'][1][0]==='OVC'||metarObj['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=metarObj['Cloud-List'][1][1]+'00';
          else if (len>=3&&(metarObj['Cloud-List'][2][0]==='BKN'||metarObj['Cloud-List'][2][0]==='OVC'||metarObj['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=metarObj['Cloud-List'][2][1]+'00';
          else if (len>=4&&(metarObj['Cloud-List'][3][0]==='BKN'||metarObj['Cloud-List'][3][0]==='OVC'||metarObj['Cloud-List'][0][0]==='VV')) self.assessment.ceilings[index]=metarObj['Cloud-List'][3][1]+'00';
          else self.assessment.ceilings[index]='10000';
          self.assessment.ceilings[index] = self.assessment.ceilings[index].replace(/^0+/, '');
          if (metarObj['Wind-Gust']==="") self.assessment.windGusts[index]=metarObj['Wind-Speed'];
          else self.assessment.windGusts[index]=metarObj['Wind-Gust'];
          self.assessment.windGusts[index]=parseInt(self.assessment.windGusts[index],10);
          self.assessment.windDirections[index]=metarObj['Wind-Direction'];
          //crosswind limit
          var ap = self.getAirport(self.assessment.airports[index]);
          if (latitude&&!ap.latitude) {
            ap.latitude=latitude;
            ap.longitude=longitude;
            self.$http.put('/api/airportRequirements/'+ap._id,ap).then(function(res){
              console.log(res);
            });
          }
          var xwindAngle=0;
          var direction=0;
          if (ap.runways) {
            xwindAngle=90;
            direction=parseInt(self.assessment.windDirections[index],10);
            ap.runways.forEach(function(runway){
              if (Math.abs(direction-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-runway*10);
              if (Math.abs(direction+360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction+360-runway*10);
              if (Math.abs(direction-360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-360-runway*10);
            });
          }
          self.assessment.crossWinds[index] = Math.round(self.assessment.windGusts[index]*Math.sin(xwindAngle*(Math.PI/180)));
          self.assessment.altimeters[index]=metarObj.altimeter;
          self.assessment.visibilities[index]=metarObj.Visibility;
          if (self.assessment.visibilities[index].includes('/')) {
            var bits = self.assessment.visibilities[index].split("/");
            self.assessment.visibilities[index] = parseInt(bits[0],10)/parseInt(bits[1],10);
          }
          self.assessment.visibilities[index]=parseFloat(self.assessment.visibilities[index]);
          
          self.$http.post('/api/assessments/lookup',{airport:airport}).then(function(res){
            if (res.data.length>0){
              var i = res.data[0].airports.indexOf(airport);
              if (i>-1) {
                if (res.data[0].runwayConditions[i]) {
                  self.assessment.runwayConditions[index]=res.data[0].runwayConditions[i];
                  if (res.data[0].runwayConditionComments&&res.data[0].runwayConditionComments.length>=i+1) 
                      self.assessment.runwayConditionComments[index]=res.data[0].runwayConditionComments[i];
                  else self.assessment.runwayConditionComments[index]="";
                }
                else {
                  self.assessment.runwayConditions[index]=5;
                  self.assessment.runwayConditionComments[index]="";
                }
              }
              else {
                  self.assessment.runwayConditions[index]=5;
                  self.assessment.runwayConditionComments[index]="";
                }
            }
            else {
                  self.assessment.runwayConditions[index]=5;
                  self.assessment.runwayConditionComments[index]="";
                }
          });
          self.assessment.freezingPrecipitations[index]=false;
          if (metarObj['Other-List'].length>0) {
            metarObj['Other-List'].forEach(function(item){
              var i=item.replace(/[^a-zA-Z]/g, "");
              if (i.substring(0,2)==="FZ") self.assessment.freezingPrecipitations[index]=true;
            });
          }
          if (!self.assessment.altimeters||!self.assessment.altimeters[index]) {
            self.assessment.colors[index]="md-purple";
          }
        }
      },function(response){console.log(response)});
      if (true){//airport.toUpperCase()=="PAOM"||airport.toUpperCase()=="PAOT"||airport.toUpperCase()=="PAFA"||
          //airport.toUpperCase()=="PAUN"||airport.toUpperCase()=="PANC"||airport.toUpperCase()=="PAGA") {
        self.$http.get('https://avwx.rest/api/taf/' + airport.toUpperCase() + '?token=' + self.appConfig.token).then(function(response){
          //console.log(response.data);
          if (response.data.Error) { 
            //self.airports[index]=self.airportsCopy[index];
            return;
          }
          self.assessment.tafs[index]=response.data['raw'];
          var year=self.moment().tz('UTC').year();
          var month=self.moment().tz('UTC').month()+1;
          var forecastMonth,monthStr,dayStr,hourStr,initialForecastTime;
          var scheduledTime=self.assessment.times[index];
          if (index===0) scheduledTime=self.assessment.times[self.assessment.times.length-1];
          var scheduledTimeArr=scheduledTime.split(':');
          var forecastTime;
          if (response.data.forecast) response.data.forecast.forEach(function(forecast,i){
            //forecast['Start-Time'], ['Other-List'], ['Visibility']
            //start time is in ddhh format
            dayStr=forecast['start_time'].dt.substring(0,2);
            hourStr=forecast['start_time'].dt.substring(2,4);
            forecastMonth=month;
            if (forecastMonth<10) monthStr='0'+forecastMonth;
            else monthStr=forecastMonth.toString();
            forecastTime=self.moment(year.toString()+monthStr+dayStr+'T'+hourStr+'0000Z');
            if (i===0) initialForecastTime=angular.copy(forecastTime);
            scheduledTime = self.moment(initialForecastTime).startOf('day').hour(scheduledTimeArr[0]).minute(scheduledTimeArr[1]);
            if (scheduledTime.isAfter(forecastTime)) {
              self.assessment.forecastFreezingPrecipitations[index]=null;
              forecast['other'].forEach(function(item){
                var i=item.replace(/[^a-zA-Z]/g, "");
                if (i.substring(0,2)==="FZ") self.assessment.forecastFreezingPrecipitations[index]=true;
              });
              if (forecast.visibility) self.assessment.forecastVisibilities[index]=forecast.visibility.repr;
              else self.assessment.forecastVisibilities[index]="6";
              if (self.assessment.forecastVisibilities[index].includes('/')) {
                var bits = self.assessment.forecastVisibilities[index].split("/");
                self.assessment.forecastVisibilities[index] = parseInt(bits[0],10)/parseInt(bits[1],10);
              }
            }
          });
        },function(response){
            if (response.status===500){
            //if (count<6) self.timeout(self.initAirport(airport,index),20000);
          }
          else self.assessment.tafs[index]="";
        });
      }
    }
    
    $onInit() {
      var self=this;
      self.init();
      self.fourteenHours;
      self.scrapeStorage();
      self.scrape;
    }
    
    init(){
      var self=this;
      //console.log(this.appConfig);
      //this.appConfig.pilots.forEach(pilot=>{
      //  self.$http.post('/api/pilots',pilot).then(function(response){
      //    console.log(pilot);
      //  });
      //});  
      self.$http.get('/api/flights')
        .then(function(response) {
          self.flights = response.data;
          window.localStorage.setItem('flights',JSON.stringify(self.flights));
        },function(response){
          self.flights=JSON.parse(window.localStorage.getItem('flights'));
        });
        
      self.initPilots();
        
      self.$http.get('/api/airportRequirements')
        .then(function(response) {
          self.airports=response.data;
          window.localStorage.setItem('airports',JSON.stringify(self.airports));
        },function(response){
          self.airports=JSON.parse(window.localStorage.getItem('airports'));
        });
      //self.flights=self.appConfig.flights;
      //self.pilots=self.appConfig.pilots;
      self.initAssessment();
      //self.airports=self.appConfig.airportRequirements;
      self.equipment=self.appConfig.equipment;
    }
    
    changeFlight(ev) {
      var self=this;
      self.timeout.cancel(self.timer);
      if (!self.assessment.flight||self.assessment.flight==="") return;
      if ((self.assessment.flight.substring(0,2)==="85"||self.assessment.flight.substring(1,3)==="85")
            &&self.assessment.flight!=="685"&&self.assessment.flight!=="885"&&self.assessment.equipmentObj.name==="Caravan") {
        self.assessment={};
        self.initAssessment();
        self.caravanAlert();
        return;
      }
    // Appending dialog to document.body to cover sidenav in docs app
    // Modal dialogs should fully cover application
    // to prevent interaction outside of dialog
      if (self.assessment.flight==="Extra") {
        //unlisted flight number
        
        var confirm = self.mdDialog.prompt()
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
            
        self.mdDialog.show(confirm).then(function(result) {
          if (result.substring(1,3)==="85"&&self.assessment.equipmentObj.name==="Caravan") {
            self.assessment={};
            self.initAssessment();
            self.caravanAlert();
            return;
          }
          var newFlight={flightNum:result};
          var flightArr=self.flights.filter(function(flight){
            return flight.flightNum===result.slice(-3);
          });
          if (flightArr.length>0) {
            newFlight=JSON.parse(JSON.stringify(flightArr[0]));
            newFlight.flightNum=result;
            self.assessment.times=flightArr[0].departTimes;
          }
          else {
            newFlight={};
            newFlight.flightNum=result;
            if (result.substring(0,1)==='5') newFlight.airports=['PAOT'];
            else if (result.substring(0,1)==='7') newFlight.airports=['PAOM'];
                else newFlight.airports=[];
            newFlight.departTimes=[self.moment().format('HH:mm').toString()];
          }
          self.flights.push(newFlight);
          self.assessment.flight =  result;
          flightArr = self.flights.filter(function(flt){
            return self.assessment.flight===flt.flightNum;
          });
          if (flightArr.length>0) {
            self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
            self.assessment.times=flightArr[0].departTimes;
          }
          self.initAssessment();
          self.assessment.airports.forEach(function(airport,index){
            self.initAirport(airport,index,0);
          });
        }, function() {
          self.assessment.flight = "";
        });
      }
      else {
        var flightArr = self.flights.filter(function(flt){
          return self.assessment.flight===flt.flightNum;
        });
        if (flightArr.length>0) {
          self.assessment.airports=JSON.parse(JSON.stringify(flightArr[0].airports));
          self.assessment.times=flightArr[0].departTimes;
        }
        self.initAssessment();
        self.assessment.airports.forEach(function(airport,index){
          self.initAirport(airport,index,0);
        });
      }
      
    }
    
    changeAirport(ev,index){
      var self=this;
      self.timeout.cancel(self.timer);
      var time=self.mdDialog.prompt({clickOutsideToClose: true,multiple:true})
        .parent(angular.element(document.body))
        .title('What is the new departure time for self airport?')
        .textContent('Enter a departure time in 24 hour time format')
        .placeholder('16:00')
        .ariaLabel('Time')
        .initialValue(self.assessment.times[index])
        .targetEvent(ev)
        .required(true)
        .ok('Update Depart Time')
        .cancel('Change Airport or Cancel');
        
      var airport = self.mdDialog.prompt({clickOutsideToClose: true,multiple:true})
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
          
      self.mdDialog.show(time).then(function(result) {io
        if (result!=="") {
          self.assessment.times[index] = result;
          self.initNight(self.assessment.airports[index],index);
        }
      },function(){
        self.mdDialog.show(airport).then(function(result) {
          if (result&&result.length>2){
            if ((result.toUpperCase()==="PASA"||result.toUpperCase()==="PAGM")&&self.assessment.equipmentObj.name==="Caravan") {
                self.caravanAlert();
            }
            else {
              self.assessment.airports[index]=result;
              self.initAirport(result,index,0);
            }
          }
        });
      });
    }
    
    changeParam(ev,index,param,title){
      var self=this;
      var cancel="Cancel";
      var extra="";
      if (param==="runwayConditions") {
        cancel="View Runway Report";
        extra=" 1 for closed, 5 for good runway";
      }
      var confirm = self.mdDialog.prompt({clickOutsideToClose: true})
        .parent(angular.element(document.body))
        .textContent('What is the ' + title + ' for ' + self.assessment.airports[index]  + '?' + extra)
        .title('Enter ' + title)
        .placeholder(title)
        .ariaLabel(title)
        .initialValue('')
        .targetEvent(ev)
        .required(true)
        .ok('OK')
        .cancel(cancel);
          
      self.mdDialog.show(confirm).then(function(result) {
        if (result!==""){
          self.assessment.colors[index]="md-green";
          self.assessment[param][index]=result;
          if (param==="runwayConditions"&&parseInt(result,10)<5){
            self.enterRunwayReport(ev,index);
          }
        }
      },function(){
        if (param==="runwayConditions"&&parseInt(self.assessment.runwayConditions[index],10)<5){
          self.enterRunwayReport(ev,index);
        }
      });
    }
    
    enterRunwayReport(ev,index){
      var self=this;
      var confirm = self.mdDialog.prompt({clickOutsideToClose: true})
        .parent(angular.element(document.body))
        .title('Enter Runway Report')
        .textContent('What is the condition of the runway at ' + self.assessment.airports[index])
        .placeholder('RunwayReport')
        .ariaLabel('RunwayReport')
        .initialValue(self.assessment.runwayConditionComments[index])
        .targetEvent(ev)
        .required(true)
        .ok('Record')
        .cancel('Cancel');
          
      self.mdDialog.show(confirm).then(function(result) {
        if (result!=="") self.assessment.runwayConditionComments[index]=result;
      });
    }
    
    addComment(ev){
      var self=this;
      var confirm = self.mdDialog.prompt({clickOutsideToClose: true})
        .parent(angular.element(document.body))
        .title('Add Assessment Comment')
        .textContent('Enter a comment to go with this assessment.')
        .placeholder('comment')
        .ariaLabel('comment')
        .initialValue(self.assessment.comment)
        .targetEvent(ev)
        .required(true)
        .ok('OK')
        .cancel('Cancel');
          
      self.mdDialog.show(confirm).then(function(result) {
        if (result!==""){
          self.assessment.comment=result;
          var alert = self.mdDialog.alert({
            title: 'Success!',
            textContent: 'You successfully added a comment to this assessment.',
            ok: 'OK'
          });
              
          self.mdDialog.show(alert).then(function() {
            
          });
        }
      });
    }
    
    changeFreezing(ev,index){
      var self=this;
      var confirm = self.mdDialog.confirm({clickOutsideToClose: true})
            .parent(angular.element(document.body))
            .title('Is there Freezing Precipitation for ' + self.assessment.airports[index]  + '?')
            .textContent('Tap "Yes" or "None"')
            .ariaLabel('Freezing Precipitation')
            .targetEvent(ev)
            .ok('Yes')
            .cancel('None');
              
      self.mdDialog.show(confirm).then(function() {
          self.assessment.colors[index]="md-red";
          self.assessment.freezingPrecipitations[index]=true;
      },function(){
          self.assessment.colors[index]="md-green";
          self.assessment.freezingPrecipitations[index]=false;
      });
    }
    
    addAirportOld(ev){
     var self=this;
     var confirm = self.mdDialog.prompt({clickOutsideToClose: true})
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
         
     self.mdDialog.show(confirm).then(function(result) {
       if (result&&result.length>2){
         if ((result.toUpperCase()==="PASA"||result.toUpperCase()==="PAGM")&&self.assessment.equipmentObj.name==="Caravan") {
           self.caravanAlert();
         }
         else {
           var index=-1;
           self.flights.forEach(function(flight,i){
             if (flight.flightNum===self.assessment.flight) index=i;
           });
           if (index>-1) self.flights[index].airports.push(result);
           self.assessment.airports.push(result);
           self.assessment.colors.push('md-green');
           self.assessment.times.push(self.moment().format('HH:mm').toString());
           self.initAirport(result,self.assessment.airports.length-1,0);
         }
       }
     });
    }
    
    addAirport(ev){
      var self=this;
      self.mdDialog.show({
        controller: 'DialogController',
        templateUrl: 'app/main/addAirport.html',
        parent: angular.element(document.body),
        scope: self.scope,
        preserveScope: true,
        targetEvent: ev,
        clickOutsideToClose:true,
        fullscreen: true
      })
      .then(function(addedAirports) {
        if (typeof addedAirports==='string') {
          self.addAirportOld(ev);
          return;
        }
        addedAirports.forEach(function(airport){
          if ((airport.toUpperCase()==="PASA"||airport.toUpperCase()==="PAGM")&&self.assessment.equipmentObj.name==="Caravan") {
            self.caravanAlert();
          }
          else {
            var index=-1;
            self.flights.forEach(function(flight,i){
              if (flight.flightNum===self.assessment.flight) index=i;
            });
            if (index>-1) self.flights[index].airports.push(airport);
            self.assessment.airports.push(airport);
            self.assessment.colors.push('md-green');
            self.assessment.times.push(self.moment().format('HH:mm').toString());
            self.initAirport(airport,self.assessment.airports.length-1,0);
          }
        });
      });
    }
    
    openChangeMenu(mdMenu,ev){
      var self=this;
      self.timeout(function(){mdMenu.open(ev)},300);
    }
    
    getAirport(icao){
      var self=this;
      var airportsArr = self.airports.filter(function(airport){
        return airport.icao.toLowerCase()===icao.toLowerCase();
      });
      if (airportsArr.length>0) return airportsArr[0];
      else return {icao:icao,name:icao,visibilityRequirement:{"yellow":3,"red":0.5,"ifr":2,"night":5},ceilingRequirement:{"yellow":1000,"red":280,"ifr":1000,"night":3000}};
    }
    
    airportClass(index){
      var self=this;
      if (self.assessment.metars[index]==="") return "md-blue";
      return "md-green";
    }
    
    red(i){
      var self=this;
      self.assessment.colors[i]='md-red';
      return 'md-red';
    }
    
    yellow(i){
      var self=this;
      if (self.assessment.colors[i]!=='md-red'&&self.assessment.colors[i]!=='md-purple') self.assessment.colors[i]='md-yellow';
      return 'md-yellow';
    }
    
    orange(i){
      var self=this;
      if (self.assessment.colors[i]!=='md-red'&&self.assessment.colors[i]!=='md-yellow'&&self.assessment.colors[i]!=='md-purple') 
        self.assessment.colors[i]='md-orange';
      return 'md-orange';
    }
    
    green(i){
      var self=this;
      if (self.assessment.colors[i]!=='md-red'&&self.assessment.colors[i]!=='md-yellow'&&self.assessment.colors[i]!=='md-orange'&&self.assessment.colors[i]!=='md-purple') 
         self.assessment.colors[i]='md-green';
      return 'md-green';
    }
    
    blue(i){
      var self=this;
      
      return 'md-blue';
    }
    
    purple(i){
      var self=this;
      
      return 'md-purple';
    }
    
    visibilityClass(index){
      var self=this;
      var airport = self.getAirport(self.assessment.airports[index]);
      if (!self.assessment.visibilities[index]) return self.blue(index);
      if (airport.visibilityRequirement.red>self.assessment.visibilities[index]) return self.red(index);
      if (self.assessment.visibilities[index]===99) return self.purple(index);
      if (airport.visibilityRequirement.yellow>self.assessment.visibilities[index]) return self.yellow(index);
      if (self.assessment.night[index]) {
        if (airport.visibilityRequirement.night>self.assessment.visibilities[index]) return self.orange(index);
      }
      else {
        if (airport.visibilityRequirement.ifr>self.assessment.visibilities[index]) return self.orange(index);
      }
      return self.green(index);
    }
    
    ceilingClass(index){
      var self=this;
      var airport = self.getAirport(self.assessment.airports[index]);
      if (!self.assessment.ceilings[index]) return self.blue(index);
      if (airport.ceilingRequirement.red*1>self.assessment.ceilings[index]*1) return self.red(index);
      if (self.assessment.ceilings[index]==="9999") return self.purple(index);
      if (airport.ceilingRequirement.yellow>self.assessment.ceilings[index]) return self.yellow(index);
      if (self.assessment.night[index]) {
        if (airport.ceilingRequirement.night>self.assessment.ceilings[index]) return self.orange(index);
      }
      else {
        if (airport.ceilingRequirement.ifr>self.assessment.ceilings[index]) return self.orange(index);
      }
      return self.green(index);
    }
    
    runwayClass(index){
      var self=this;
      if (self.assessment.runwayConditions[index]<2) return self.red(index);
      if (self.assessment.runwayConditions[index]<4) return self.yellow(index);
      return self.green(index);
    }
    
    windClass(index){
      var self=this;
      if (self.assessment.windGusts[index]===undefined) return self.blue(index);
      if (self.assessment.airports[index]==="PADG") {
        if (self.assessment.windGusts[index]>30) return self.red(index);
        if (self.assessment.crossWinds[index]>15) return self.red(index);
        if (self.assessment.windGusts[index]>25) return self.yellow(index);
        if (self.assessment.crossWinds[index]>12) return self.yellow(index);
      }
      if (self.assessment.windGusts[index]>self.assessment.equipmentObj.wind) return self.red(index);
      if (self.assessment.crossWinds[index]>self.assessment.equipmentObj.xwind) return self.red(index);
      if (self.assessment.windGusts[index]>(self.assessment.equipmentObj.wind-5)) return self.yellow(index);
      if (self.assessment.crossWinds[index]>(self.assessment.equipmentObj.xwind-5)) return self.yellow(index);
      return self.green(index);
    }
    
    freezingClass(index){
      var self=this;
      if (self.assessment.freezingPrecipitations[index]) return self.red(index);
      return self.green(index);
    }
    
    tafClass(index){
      var self=this;
      if (self.assessment.tafs[index]!=="") {
        if (self.assessment.forecastVisibilities&&self.assessment.forecastVisibilities[index]<1) return self.yellow(index);
        if (self.assessment.forecastFreezingPrecipitations&&self.assessment.forecastFreezingPrecipitations[index]) return self.yellow(index);
        return self.green(index);
      }
      return "md-blue";
    }
    
    nightClass(index){
      var self=this;
      if (self.assessment.night[index]) return "night";
      else return "day";
    }
    
    caravanAlert(){
      var self=this;
      var alert = self.mdDialog.alert({
            title: 'Pick another aircraft',
            textContent: 'You cannot take a Caravan to Gambell or Savoonga.',
            ok: 'Close'
          });
              
          self.mdDialog.show(alert).then(function() {
            
          });
    }
    
    submit(ev){
      var self=this;
      self.assessment.equipment=self.assessment.equipmentObj.name;
      if (!self.assessment||
             !self.assessment.pilotObj||
             !self.assessment.pilotObj.name||
             !self.assessment.flight||
             self.assessment.pilotObj.name===""||
             self.assessment.flight===""||
             self.assessment.equipment==="") {
        var alert = self.mdDialog.alert({
          title: 'Attention',
          textContent: 'You need to enter a pilot, an aircraft, and a flight number at the top of the page.',
          ok: 'Close'
        });
            
        self.mdDialog.show(alert).then(function() {
          
        });
      }
      else {
        self.submitDisabled=true;
        self.isSubmitted=true;
        self.assessment.pilot=self.assessment.pilotObj.name;
        var matchPilots = self.pilots.filter(function(pilot){
          return pilot.name===self.assessment.pilot;
        });
        if (matchPilots.length>0) {
          self.assessment.level=matchPilots[0].level;
        }
        else self.assessment.level="level1";
        self.assessment.date=new Date();
        self.assessment.departTimes=self.assessment.times;
        self.assessment.password=self.apiPassword;
        self.$http.post('/api/assessments', self.assessment)
          .then(function(response){
            self.alertSubmitSuccess();
            self.submitDisabled=false;
          },
          function(response){
            if (response.status===501) {
              self.promptForPassword();
              self.submitDisabled=false;
            }
            else {
              self.localAssessments.push(self.assessment);
              window.localStorage.setItem( 'assessments', JSON.stringify(self.localAssessments) );
              self.alertSubmitSuccess();
              self.submitDisabled=false;
            }
          }
        );
        
      }
    }
    
    clear(){
      var self=this;
      self.assessment={};
      self.initAssessment();
    }
    
    alertSubmitSuccess(){
      var self=this;
      var alert = self.mdDialog.alert({
        title: 'Success!',
        htmlContent: 'Your Flight Risk Assessment has been successfully submitted.<br> To clear the assessment, click the purple "Clear Assessment" button',
        ok: 'Close'
      });

      self.mdDialog
        .show( alert )
        .finally(function() {
          alert = undefined;
      }); 
    }
    
    checkNotifications(ev){
      var self=this;
      if (!self.assessment.pilotObj||self.assessment.pilotObj.name==='z') return;
      self.tempPilot=angular.copy(self.assessment.pilotObj);
      window.localStorage.setItem('pilot',JSON.stringify(self.assessment.pilotObj));
      self.$http.post('/api/notifications/pilot',{pilot:self.assessment.pilotObj.name,password:self.apiPassword}).then(function(response){
        //console.log(response.data);
        var notifications=response.data;
        var length=notifications.length;
        var count=0;
        var confirm=[];
        notifications.forEach(function(notification,index){
          confirm[index] = self.mdDialog.confirm({clickOutsideToClose:true,multiple:true})
                .title(notifications[index].title
                    + '   :::   '
                    + 'Notification from ' + notifications[index].creator + ', created on ' 
                    + self.moment(notifications[index].createdAt).format('ddd, MMM Do YYYY, h:mm:ss a'))
                .textContent(notifications[index].notification)
                .ariaLabel('Notification')
                .targetEvent(ev)
                .ok('I have read and understood this notification')
                .cancel('Remind me later');
        });
        
        var showAnother = function(){
          if (length>0) self.mdDialog.show(confirm[count]).then(function() {
            notifications[count].notified.push(self.assessment.pilotObj.name);
            self.$http.put('/api/notifications/'+notifications[count]._id, notifications[count]);
            count++;
            length--;
            showAnother();
          },function(){
            //do something if user declines to read notification
          });
        };
        
        showAnother();
        
      },function(response){
            if (response.status===501) self.promptForPassword();
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
 
    checkPilot(name){
      var self=this;
      return name===self.tempPilot.name;
    }
    
    freezeResult(bool){
      if (bool) return 'Yes';
      return 'None';
    }
    
    checkSubmitted(){
      var self=this;
      if (self.isSubmitted) return "submitted";
      else return;
    }
    
  }

  angular.module('workspaceApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController,
      controllerAs: 'main'
    });
})();

(function() {

angular.module('workspaceApp')
    .controller('DialogController', DialogController);

  DialogController.$inject = ['$scope', '$mdDialog'];
  
  function DialogController($scope, $mdDialog) {
        $scope.dialogAirports=[];
        $scope.answer=function(){
          $mdDialog.hide($scope.dialogAirports);
        };
        $scope.manual=function(){
          $mdDialog.hide('manual');
        };
      
  }
})();
