'use strict';

(function(){

class StatusComponent {
  constructor($http,$scope,$interval,$timeout,socket) {
    this.http=$http;
    this.interval=$interval;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.date=new Date();
    this.assignedFlights=[];
    this.chosenPilot={};
    this.chosenAircraft={},
    this.chosenFlight={};
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('airportRequirement');
    });
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('airplane');
    });
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('calendar');
    });
  }
  
  $onInit() {
    this.tfInterval=this.interval(()=>{this.getTakeflite()},5*60*1000);
    this.http.post('/api/airplanes/firebaseLimited',{collection:'flights',limit:50}).then(res=>{
      this.recentFlights=res.data.filter(flight=>{
        return flight.legArray.at(-1).onTime;
      });
      this.recentFlights.sort((a,b)=>{
        return a.legArray.at(-1).onTime._seconds-b.legArray.at(-1).onTime._seconds;
      });
      console.log(this.recentFlights.filter(a=>{return a.acftNumber==='N408BA'}));
      this.setAirplaneList();
    });
    this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.allPilots=res.data;
      window.allPilots=res.data;
      this.setPilotList();
    });
    this.http.post('/api/airplanes/firebase',{collection:'aircraft'}).then(res=>{
      this.allAircraft=res.data;
    });
    this.http.get('/api/airplanes').then(res=>{
      this.airplanes=res.data;
      this.airplanesB190=this.airplanes.filter((e)=>{
        return e.airplaneType==="Beech 1900";
      });
      this.airplanesBE20=this.airplanes.filter((e)=>{
        return e.airplaneType==="King Air";
      });
      this.socket.unsyncUpdates('airplane');
      this.socket.syncUpdates('airplane', this.airplanes,(event,item,array)=>{
        this.airplanes=array;
        this.airplanesB190=this.airplanes.filter((e)=>{
          return e.airplaneType==="Beech 1900";
        });
        this.airplanesBE20=this.airplanes.filter((e)=>{
          return e.airplaneType==="King Air";
        });
      });
    });
    this.base=window.base;
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      this.base=newVal;
      if (this.masterAirports) this.setBase(this.masterAirports);
      this.setPilotList();
      this.setAirplaneList();
      this.setAvailableFlights();
    });
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{//or '$root.nav...'
      this.getTakeflite();
      this.dateString=newVal;
      this.date=new Date(this.dateString);
      this.setPilotList();
      this.setAvailableFlights();
    });
    this.scope.$watch('status.chosenFlight',(newVal,oldVal)=>{
      let index;
      if (this.chosenFlight._id&&this.chosenPilot._id&&this.chosenAircraft._id){
        this.chosenFlight.chosenPilot=this.chosenPilot;
        this.chosenFlight.chosenAircraft=this.chosenAircraft;
        this.assignedFlights.push(this.chosenFlight);
        this.patchCalendarFlights(this.chosenFlight);
        //remove 3 elements from their arrays
        index=this.sortedPilots.map(e=>e._id).indexOf(this.chosenPilot._id);
        if (index>-1) this.sortedPilots.splice(index,1);
        index=this.displayedAircraft.map(e=>e._id).indexOf(this.chosenAircraft._id);
        if (index>-1) this.displayedAircraft.splice(index,1);
        index=this.unassignedFlights.map(e=>e._id).indexOf(this.chosenFlight._id);
        if (index>-1) this.unassignedFlights.splice(index,1);
        this.chosenFlight={};
        this.chosenPilot={};
        this.chosenAircraft={};
      }
    });
    this.http.get('/api/airportRequirements').then(res=>{
      this.masterAirports=res.data;
      this.airports=this.setBase(res.data);
      this.socket.unsyncUpdates('airportRequirement');
      this.socket.syncUpdates('airportRequirement', this.masterAirports,(event,item,array)=>{
        this.masterAirports=array;
        this.airports=this.setBase(array);
      });
    });
    this.http.get('/api/flights').then(res=>{
      this.flightSchedule=res.data;
      window.flightSchedule=res.data;
      this.http.get('/api/calendar').then(res=>{
        this.calendar=res.data;
        this.setPilotList();
        this.setAvailableFlights();
        this.socket.unsyncUpdates('calendar');
        this.socket.syncUpdates('calendar', this.calendar,(event,item,array)=>{
          this.calendar=array;
          this.setPilotList();
        });
      });
    });
  }
  
  setBase(airports){
    this.timeout(()=>{
      if (this.scope.nav.base.four==="PAOM") {
        this.airports=airports.filter(e=>{
          return e.threeLetter&&e.threeLetter!==""&&(e.baseGroup===window.base.four||e.baseGroup==="PAUN");
        });
      }
      else {
        this.airports=airports.filter(e=>{
          return e.threeLetter&&e.threeLetter!==""&&e.baseGroup===window.base.four;
        });
      }
      this.airports.sort((a,b)=>{
        return a.threeLetter.localeCompare(b.threeLetter);
      });
    },0);
  }
  
  airportClass(score){
    score=parseInt(score,10);
    if (isNaN(score)) return "airport-green";
    if (score<=1) return "airport-pink";
    if (score>1&&score<5) return "airport-yellow";
    return "airport-green";
  }
  
  enterScore(airport){
    let index = this.airports.map(e => e._id).indexOf(airport._id);
    let response=prompt("Enter New Runway Score (1-5) for " + airport.threeLetter + " airport");
    if (isNaN(parseInt(response,10))) alert("Enter a number 1-5 for the runway score.");
    if (response||response==="") {
      this.airports[index].runwayScore=response;
      this.http.patch('/api/airportRequirements/'+this.airports[index]._id,this.airports[index]);
    }
  }
  
  addEditComment(airport){
    let index = this.airports.map(e => e._id).indexOf(airport._id);
    if (!airport.comment) airport.comment="";
    let response=prompt("Create or Update the Comment for " + airport.threeLetter,airport.comment);
    if (response||response==="") {
      this.airports[index].comment=response;
      this.http.patch('/api/airportRequirements/'+this.airports[index]._id,this.airports[index]);
    }
  }
  
  editConfiguration(airplane){
    let index = this.airplanes.map(e => e._id).indexOf(airplane._id);
    if (!airplane.status) airplane.status="";
    let response=prompt("Enter the Configuration for " + airplane.registration,airplane.status);
    if (response||response==="") {
      this.airplanes[index].status=response;
      this.http.patch('/api/airplanes/'+this.airplanes[index]._id,this.airplanes[index]).then(res=>{
        console.log(res.data);
      });
    }
  }
  
  setPilotList(){
    if (!this.calendar||!this.base||!this.allPilots) return;
    let headerList=['OC','Night Medevac','Day Medevac','Med Phone','Base Captains','Base Copilots'];
    this.pilotList=[];
    this.coPilotList=[];
    this.ocList=[];
    let index = this.calendar.map(e => e.date).indexOf(this.dateString);
    let pilotIndex;
    if (index>-1) {
      this.sortedPilots=[];
      this.calendar[index].availablePilots.forEach(pilot=>{
        pilotIndex = this.allPilots.map(e => e.name).indexOf(pilot.name);
        let p=this.allPilots[pilotIndex];
        p.code=pilot.code;
        if (pilot.pilotBase===this.base.base&&p) {
          if (p.code==='OC') p.header='OC';
          if (p.code==='16') {
            if (p.far299Exp) p.header="Night Medevac";
            else p.header="Med Phone";
          }
          if (p.code==='DM') p.header='Day Medevac';
          if (p.far299Exp) {
            if (!p.header) p.header='Base Captains';
          }
          else {
            if (!p.header) p.header='Base Copilots';
          }
          this.sortedPilots.push(p);
        }
      });
      this.sortedPilots.sort((a,b)=>{
        //if (!a.header) return -1;
        return headerList.indexOf(a.header)-headerList.indexOf(b.header);
      });
      console.log(this.sortedPilots);
    }
  }
  
  fixedWing(base){
    if (!this.base) return false;
    if (base) return base===this.base.base;
    else return this.base.base==="OME"||this.base.base==="OTZ";
  }
  
  getLayout(){
    if (this.base) return "layout-"+this.base.base;
  }
  
  showHeader(collection,field,index){
    if (!this[collection]||!this.base) return false;
    if (this.base.base==='HEL'&&collection==="sortedPilots") return false; 
    if (index===0) return true;
    return this[collection][index][field]!==this[collection][index-1][field];
  }
  
  setAirplaneList(){
    if (!this.base) return;
    let aircraftTypes=['King Air','Beech 1900', 'Caravan','Courier','Casa'];
    if (this.base.base==="HEL") {
      aircraftTypes=['R44','MD500','AStar','UH-1H'];
    }
    if (!this.allAircraft||!this.recentFlights) return;
    let index,baseTest;
    for (let x=0;x<this.recentFlights.length;x++){
      index = this.allAircraft.map(e => e._id).indexOf(this.recentFlights[x].acftNumber);
      if (index>-1) {
        if (this.allAircraft[index].currentAirport!==this.recentFlights[x].legArray.at(-1).arr) {
          this.http.post('/api/airplanes/updateFirebase',{collection:'aircraft',doc:{currentAirport:this.recentFlights[x].legArray.at(-1).arr,_id:this.allAircraft[index]._id}});
        }
        this.allAircraft[index].currentAirport=this.recentFlights[x].legArray.at(-1).arr;
      }
    }
    this.displayedAircraft=this.allAircraft.filter(a=>{
      baseTest=false;
      if (this.base.base==="HEL"||a.currentAirport===this.base.base) baseTest=true;
      return baseTest&&aircraftTypes.indexOf(a.acftType)>-1;
    });
    if (this.base.base==="HEL") this.displayedAircraft=this.allAircraft.filter(a=>{
      return aircraftTypes.indexOf(a.acftType)>-1;
    });
    this.displayedAircraft.sort((a,b)=>{
      return aircraftTypes.indexOf(a.acftType)-aircraftTypes.indexOf(b.acftType);
    });
  }
  
  patchCalendarFlights(flight){
    let calendarFlights=[];
    let i=this.calendar.map(e=>e.date).indexOf(this.date.toLocaleDateString());
    if (i>-1) {
      calendarFlights=this.calendar[i].availableFlightNumbers||[];
      let index=calendarFlights.map(e=>e.flightNum).indexOf(flight.flightNum);
      if (index>-1) calendarFlights[index]=flight;
      this.calendar[i].availableFlightNumbers=calendarFlights;
      this.http.patch('/api/calendar/'+this.calendar[i]._id,this.calendar[i]);
    }
    else return [];
  }
  
  setAvailableFlights(){
    if (!this.base) return;
    if (this.base.base==="HEL"){
      this.unassignedFlights=[{flightNum:'format TBD',_id:1},{flightNum:'helicopter mission',_id:2},{flightNum:'unspecified',_id:3}];
    }
    else {
      if (!this.flightSchedule||!this.date) return;
      let calendarFlights=[];
      let i=this.calendar.map(e=>e.date).indexOf(this.date.toLocaleDateString());
      if (i>-1) {
        calendarFlights=this.calendar[i].availableFlightNumbers||[];
      }
      this.flightSchedule.forEach(flight=>{
          let index=calendarFlights.map(e=>e.flightNum).indexOf(flight.flightNum);
          if (index<0) calendarFlights.push(flight);
      });
      this.calendar[i].availableFlightNumbers=calendarFlights;
      this.http.patch('/api/calendar/'+this.calendar[i]._id,this.calendar[i]);
      let dayOfWeek = this.date.getDay();
      if (dayOfWeek===0) dayOfWeek=7;
      let prefix='8';
      let prefix2='4';
      if (this.base.base==='OTZ') {
        prefix='6';
        prefix2='5';
      }
      this.availableFlights=[];
      this.assignedFlights=[];
      this.unassignedFlights=[];
      calendarFlights.sort((a,b)=>{
        return a.flightNum-b.flightNum;
      });
      calendarFlights.forEach(flight=>{
        if (flight.flightNum.substring(0,1)===prefix||flight.flightNum.substring(0,1)===prefix2) {
          if (flight.chosenPilot&&flight.chosenAircraft) this.assignedFlights.push(flight);
          if (flight.daysOfWeek.indexOf(dayOfWeek)>-1) {
            this.availableFlights.push(flight);
            if (!flight.chosenPilot||!flight.chosenAircraft) this.unassignedFlights.push(flight);
          }
        }  
      });
    }
  }
  
  choose(listName,id){
    let chosenName='chosenFlight';
    if (listName==='sortedPilots') chosenName="chosenPilot";
    if (listName==='displayedAircraft') chosenName="chosenAircraft";
    if (!this[listName]) return;
    this[listName].forEach(el=>{
      el.chosen=false;
    });
    let index = this[listName].map(e => e._id).indexOf(id);
    if (index>-1) {
      this[listName][index].chosen=true;
      this[chosenName]=this[listName][index];
    }
  }
  
  chosenClass(chosen){
    if (chosen) return 'chosen';
    else return;
  }
  
  buildFlightString(flight){
    console.log(flight);
    return flight.flightNum;
  }
  
  getTakeflite(){
    if (!this.date) return;
    this.http.post('/api/flights/tf',{dateString:new Date(this.date).toLocaleDateString()}).then(res=>{
      console.log(res.data);
    });
  }
}

angular.module('workspaceApp')
  .component('status', {
    templateUrl: 'app/status/status.html',
    controller: StatusComponent,
    controllerAs: 'status'
  });

})();
