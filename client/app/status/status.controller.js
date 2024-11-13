'use strict';

(function(){

class StatusComponent {
  constructor($http,$scope,$interval,$timeout,socket,metar,$location,$anchorScroll,moment) {
    this.http=$http;
    this.interval=$interval;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.metar=metar;
    this.$location=$location;
    this.anchorScroll=$anchorScroll;
    this.moment=moment;
    this.date=new Date();
    this.assignedFlights=[];
    this.updateArray=[];
    this.chosenPilot={};
    this.chosenAircraft={},
    this.chosenFlight={};
    this.clicked;
    this.stopped;
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('airportRequirement');
    });
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('airplane');
    });
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('calendar');
    });
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('todaysFlight');
    });
  }
  
  $onInit() {
    this.stoppedInterval=this.interval(()=>{
      //this.getTakeflite({dateString:this.dateString,file:'current\q.csv'});
      this.http.get('/api/todaysFlights/stopped').then(res=>{
        if (res.data.stopped) {
          this.stopped=true;
          if (!this.clicked) this.clicked=confirm('The Takeflite Flight Summary report, which should automatically update every 3 minutes, has stopped.  Flight information may not be current until this is resolved.');
        } 
        else {
          this.clicked=undefined;
          this.stopped=undefined;         
        }
      });
    },5*60*1000);
    this.scrollInterval=this.interval(()=>{this.scroll()},60*60*1000);
    this.http.post('/api/airplanes/firebaseLimited',{collection:'flights',limit:50}).then(res=>{
      this.recentFlights=res.data.filter(flight=>{
        return flight.legArray.at(-1).onTime;
      });
      this.recentFlights.sort((a,b)=>{
        return a.legArray.at(-1).onTime._seconds-b.legArray.at(-1).onTime._seconds;
      });
      //console.log(this.recentFlights.filter(a=>{return a.acftNumber==='N408BA'}));
      this.setAirplaneList();
    });
    this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.allPilots=res.data;
      window.allPilots=res.data;
      this.setPilotList();
      this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
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
      this.scroll();
    });
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{//or '$root.nav...'
      //this.getTakeflite({dateString:'10/20/2024',file:'tomorrow.csv'});
      if (!newVal||newVal==='') return;
      this.dateString=newVal;
      this.date=new Date(this.dateString);
      this.setPilotList();
      this.setAvailableFlights();
      this.http.post('/api/todaysFlights/dayFlights',{dateString:this.dateString}).then(res=>{
        this.todaysFlights=this.filterTodaysFlights(res.data);
        console.log(this.todaysFlights);
        this.scroll();
        this.socket.unsyncUpdates('todaysFlight');
        this.socket.syncUpdates('todaysFlight', this.todaysFlights,(event,item,array)=>{
          console.log('todaysFlights Updated ' + event);
          console.log(item);
          this.todaysFlights=this.filterTodaysFlights(array);
        });
      });
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
        this.updateArray.push(item);
        let localLength=angular.copy(this.updateArray.length);
        this.timeout(()=>{
          if (localLength===this.updateArray.length){
            console.log(this.updateArray);
            this.updateArray=[];
            localLength=0;
            console.log('updating airportRequirements');
            this.airports=this.setBase(array);
          }
        },2000);
    
        
        
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
  
  filterTodaysFlights(array){
    if (!this.dateString||!this.allPilots||this.allPilots.length===0||!array) return array;
    let index,displayName;
    array.forEach(flight=>{
      if (this.dateString!==flight.date) {
        flight=undefined;
        return;
      }
      if (!flight.flightId) flight.active==='false';
      //import pilot
      if (flight.pilot&&flight.pilot!=='No Pilot Assigned') {
        if (flight.pilot.substring(0,1)==="m"&&flight.pilot.slice(-5)==="evans") {
          displayName='M. '+flight.pilot.substring(1,2).toUpperCase()+'. Evans';
        }
        else displayName=flight.pilot.substring(0,1).toUpperCase()+'. '+flight.pilot.substring(1,2).toUpperCase()+flight.pilot.slice(2);
        index = this.allPilots.map(e => e.displayName).indexOf(displayName);
        if (index>-1) flight.pilotObject=angular.copy(this.allPilots[index]);
      }
      //import coPilot
      if (flight.coPilot) {
        if (flight.coPilot.substring(0,1)==="m"&&flight.coPilot.slice(-5)==="evans") {
          displayName='M. '+flight.coPilot.substring(1,2).toUpperCase()+'. Evans';
        }
        else if (flight.coPilot.substring(0,1)==="k"&&flight.coPilot.slice(-9)==="showalter") {
          displayName='D. Showalter';
        }
        else displayName=flight.coPilot.substring(0,1).toUpperCase()+'. '+flight.coPilot.substring(1,2).toUpperCase()+flight.coPilot.slice(2);
        index = this.allPilots.map(e => e.displayName).indexOf(displayName);
        if (index>-1) flight.coPilotObject=angular.copy(this.allPilots[index]);
      }
      //attach routing to airportRequirements
      flight.airportObjs=[];
      flight.airports.forEach((a,listIndex)=>{
      //for (let a of flight.airports) {
        if (!this.masterAirports) return;
        let i=this.masterAirports.map(e=>e.name).indexOf(a);
        if (i>-1) {
          let night=false;
          //let timeArr=flight.departTimes[listIndex].split(':');
          //let time=new Date(this.dateString).setHours(timeArr[0],timeArr[1],timeArr[2]);
          if (flight.departTimes.length>listIndex&&this.masterAirports[i].metarObj) night=this.isItNight(this.masterAirports[i].metarObj.airport,flight.departTimes[listIndex]);
          flight.airportObjs.push(angular.copy(this.masterAirports[i].metarObj));
          if (flight.airportObjs[listIndex]) flight.airportObjs[listIndex].night=night;
        }
        else flight.airportObjs.push({airport:{threeLetter:a}});
      });
    });
    array=array.filter(flight=>{return flight});
    return array;
  }
  
  isItNight(airport,time){
      let night=false;
      let thisDate=new Date(this.dateString).setHours('10','00','00');
      if (!airport) return night;
      let times=SunCalc.getTimes(thisDate,airport.latitude,airport.longitude);
      if (times.dawn instanceof Date && !isNaN(times.dawn)&&times.dusk instanceof Date && !isNaN(times.dusk)) {
        var twilightStart = this.moment(times.dawn);
        var twilightEnd = this.moment(times.dusk);
        if (!time||time==="") return night;
        let timeArr=time.split(':');
        if (timeArr.length<2) return night;
        let departTime = this.moment(thisDate).startOf('day').hour(timeArr[0]).minute(timeArr[1]);
        if (departTime.isBetween(twilightStart,twilightEnd)) night=false;
        else night=true;
      }
      return night;
    }
  
  setBase(airports){
    this.timeout(()=>{
      if (!airports) return;
      airports.forEach(airport=>{
        if (!airport) return;
        airport.metarObj={};
        if (airport.currentMetar&&airport.currentMetar!=='missing') {
          airport.metarObj=this.metar.parseADDS(airport.currentMetar);
        }
        airport.metarObj.airport=angular.copy(airport);
      });
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
      this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
      //console.log(this.airports);
    },0);
  }
  
  scroll(){
    if (!this) {
      console.log('check scope');
      return;
    }
    this.timeout(()=>{
      if (!this.todaysFlights) return;
      let scrollDate=new Date();
      let filteredFlights=this.todaysFlights.filter(this.todaysFlightDisplayFilter);
      filteredFlights.sort((a,b)=>{
        let aSplit=a.departTimes[0].split(':');
        let bSplit=b.departTimes[0].split(':');
        let aTime=scrollDate.setHours(aSplit[0],aSplit[1],aSplit[2]);
        let bTime=scrollDate.setHours(bSplit[0],bSplit[1],bSplit[2]);
        return aTime-bTime;
      });
      if (filteredFlights.length===0) return;
      let scrollId;
      if (new Date().toLocaleDateString()!==this.dateString) scrollId=filteredFlights[0]._id;
      filteredFlights.forEach(flight=>{
        let fSplit=flight.departTimes[0].split(':');
        if (!scrollId&&fSplit.length===3&&new Date()<scrollDate.setHours(fSplit[0],fSplit[1],fSplit[2])) scrollId=flight._id;
      });
      if (!scrollId) scrollId=filteredFlights.at(-1)._id;
      //this.$location.hash(scrollId);
      //this.anchorScroll.yOffset=500;
      //this.anchorScroll();
      console.log('auto scrolling');
      let element = document.getElementById(scrollId);
      //element.scrollIntoView();
      element.scrollIntoView({ behavior: 'smooth' });
    },1000);
  }
  
  overallRiskClass(metarObj){
    let returnString="";
    if (metarObj.night) returnString+=' night';
    if (!metarObj) return returnString+=' airport-green';
    let colors=['airport-green','airport-yellow','airport-pink'];
    let color="airport-green";
    let tempColor="airport-green";
    //runway
    tempColor=this.returnColor({yellow:5,red:2},metarObj.airport.runwayScore,'above');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //if (airport.name==='Gambell') console.log(airport);
    //possibly no metarObj
    if (!metarObj||!metarObj['Raw-Report']) return returnString+=' '+color;
    //visibility
    tempColor=this.returnColor(metarObj.airport.visibilityRequirement,metarObj.Visibility,'above');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //ceiling
    tempColor=this.returnColor(metarObj.airport.ceilingRequirement,metarObj.Ceiling,'above');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //wind
    tempColor=this.returnColor({yellow:30,red:35},metarObj["Wind-Gust"],'below');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //return
    metarObj.color=color;
    return returnString+=' '+color;
  }
  
  returnColor(limitObj,observation,direction){
    if (!observation||!limitObj) return 'airport-green';
    if (!direction) direction="above";
    let color="airport-green";
    if (direction==="above"){
      if ((observation*1)<limitObj.yellow) color="airport-yellow";
      if ((observation*1)<limitObj.red) color="airport-pink";
    }
    else {
      if ((observation*1)>limitObj.yellow) color="airport-yellow";
      if ((observation*1)>limitObj.red) color="airport-pink";
    }
    return color;
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
      let newAirport=angular.copy(this.airports[index]);
      delete newAirport.metarObj;
      this.http.patch('/api/airportRequirements/'+newAirport._id,newAirport);
    }
  }
  
  addEditComment(airport){
    let index = this.airports.map(e => e._id).indexOf(airport._id);
    if (!airport.comment) airport.comment="";
    let response=prompt("Create or Update the Comment for " + airport.threeLetter,airport.comment);
    if (response||response==="") {
      this.airports[index].comment=response;
      let newAirport=angular.copy(this.airports[index]);
      delete newAirport.metarObj;
      this.http.patch('/api/airportRequirements/'+newAirport._id,newAirport);
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
        p.header='';
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
  
  getTakeflite(obj){
    if (!this.date) return;
    this.dateString=new Date(this.date).toLocaleDateString();
    if (this.dateString==="Invalid Date") return;
    this.http.post('/api/todaysFlights/tf',obj).then(res=>{
      console.log(res.data);
    })
    .catch(err=>{
      console.log(err);
    });
  }
  
  todaysFlightDisplayFilter(flight) {
    let inBase;
    if (window.base&&window.base.base==='HEL') inBase=false;
    else if (window.base&&window.base.base==='OTZ')  {
      inBase=flight.airports[0]==='Kotzebue'||flight.airports.at(-1)==='Kotzebue';
    }
    else inBase=flight.airports[0]==='Nome'||flight.airports[0]==='Unalakleet'||flight.airports.at(-1)==='Nome'||flight.airports.at(-1)==='Unalakleet';
    return (flight.date===window.dateString)&&inBase&&flight.active==='true';
  }
  
  activeClass(active){
    if (active!=="true") return "inactive";
  }
  
  amIStopped(){
    if (this.stopped) return "stopped";
  }
  
  visibilityClass(index){
      
    var airport = this.getAirport(this.assessment.airports[index]);
    if (!this.assessment.visibilities[index]) return this.blue(index);
    if (airport.visibilityRequirement.red>this.assessment.visibilities[index]) return this.red(index);
    if (this.assessment.visibilities[index]===99) return this.purple(index);
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
    if (!this.assessment.ceilings[index]) return this.blue(index);
    if (airport.ceilingRequirement.red>this.assessment.ceilings[index]) return this.red(index);
    if (this.assessment.ceilings[index]==="9999") return this.purple(index);
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
    
    if (this.assessment.windGusts[index]===undefined) return this.blue(index);
    if (this.assessment.airports[index]==="PADG") {
      if (this.assessment.windGusts[index]>30) return this.red(index);
      if (this.assessment.crossWinds[index]>15) return this.red(index);
      if (this.assessment.windGusts[index]>25) return this.yellow(index);
      if (this.assessment.crossWinds[index]>12) return this.yellow(index);
    }
    if (this.assessment.windGusts[index]>this.assessment.equipmentObj.wind) return this.red(index);
    if (this.assessment.crossWinds[index]>this.assessment.equipmentObj.xwind) return this.red(index);
    if (this.assessment.windGusts[index]>(this.assessment.equipmentObj.wind-5)) return this.yellow(index);
    if (this.assessment.crossWinds[index]>(this.assessment.equipmentObj.xwind-5)) return this.yellow(index);
    return this.green(index);
  }
  
  freezingClass(index){
    
    if (this.assessment.freezingPrecipitations[index]) return this.red(index);
    return this.green(index);
  }
  
  tafClass(index){
    
    if (this.assessment.tafs[index]!=="") {
      if (this.assessment.forecastVisibilities&&this.assessment.forecastVisibilities[index]<1) return this.yellow(index);
      if (this.assessment.forecastFreezingPrecipitations&&this.assessment.forecastFreezingPrecipitations[index]) return this.yellow(index);
      return this.green(index);
    }
    return "md-blue";
  }
  
  nightClass(index){
    
    if (this.assessment.night[index]) return "night";
    else return "day";
  }
}

angular.module('workspaceApp')
  .component('status', {
    templateUrl: 'app/status/status.html',
    controller: StatusComponent,
    controllerAs: 'status'
  });

})();
