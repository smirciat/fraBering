'use strict';

(function(){

class StatusComponent {
  constructor($http,$scope,$interval,$timeout,socket,metar,$location,$anchorScroll,moment,Auth,appConfig,Modal) {
    this.http=$http;
    this.interval=$interval;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.metar=metar;
    this.$location=$location;
    this.anchorScroll=$anchorScroll;
    this.moment=moment;
    this.Auth=Auth;
    this.appConfig=appConfig;
    this.equipment=appConfig.equipment;
    this.Modal=Modal;
    this.date=new Date();
    this.assignedFlights=[];
    this.updateArray=[];
    this.chosenPilot={};
    this.chosenAircraft={},
    this.chosenFlight={};
    this.toggleAssigned=true;
    this.clicked;
    this.stopped;
    this.alternateArray=['OME','OTZ','UNK','BET','GAL','ANC','FAI'];
    this.airportOrder=['PAOM','PAUN','PAOT','PAGM','PASA','PASH','PAIW','PATC','PFKT','PATE','PAWM','PAGL','PFEL',
            'PAKK','PFSH','PAMK','WBB','PADG','PAPO','PALU','PAVL','PAWN','PFNO','PAIK','PASK','PAFM','PAGH','PAOB','PABL','PADE'];
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
    this.toggleAssigned=window.toggleAssigned;
    this.stoppedInterval=this.interval(()=>{
      this.http.get('/api/todaysFlights/stopped').then(res=>{
        if (res.data.stopped) {
          this.stopped=true;
          if (!this.clicked) this.quickModal('The Takeflite Flight Summary report, which should automatically update every 3 minutes, has stopped.  Flight information may not be current until this is resolved.');
        } 
        else {
          this.clicked=undefined;
          this.stopped=undefined;         
        }
      });
    },5*60*1000);
    this.scrollInterval=this.interval(()=>{
      this.scroll();
      this.renewFirebase();
    },60*60*1000);
    this.timeout(()=>{
      if (this.Auth.isSuperAdmin()) {
        console.log('running');
        this.timeout(()=>{this.recordAssessment()},1000);
        this.minuteInterval=this.interval(()=>{
          let seconds=new Date().getSeconds();
          if (seconds>50||seconds<10) {
            //console.log('closing interval, try again in 30 seconds');
            this.interval.cancel(this.minuteInterval);
            this.timeout(()=>{
              //console.log('try again for interval');
              //this.recordAssessment();
              this.interval(()=>{
                //this.recordAssessment()
              },60*1000);
            },30*1000);
          }
          else this.recordAssessment();
          
        },60*1000);
      }
    },0);
    //this.http.post('/api/airplanes/firebaseQuery',{collection:'flights',value:'N215BA',parameter:'acftNumber'}).then(res=>{
      //console.log(res.data);
    //}).catch(err=>{console.log(err)});
    this.renewFirebase();
    this.quickModal=this.Modal.confirm.quickMessage(response=>{this.clicked=true;});
    this.tafDisplay=this.Modal.confirm.quickShow(response=>{});
    this.runwayModal=this.Modal.confirm.runway(res=>{
      res.timestamp=new Date();
      if (!res.comment) res.comment='';
      if (!res.signature) res.signature='';
      let index = this.airports.map(e => e._id).indexOf(res._id);
      if (index>-1) {
        this.airports[index].signature=res.signature;
        this.airports[index].timestamp=res.timestamp;
        this.airports[index].comment=res.comment;
        this.airports[index].runwayScore=res.runwayScore;
        if (res._id&&res.signature&&res.runwayScore){
          this.http.patch('/api/airportRequirements/'+res._id,res);
        }
      }
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
    this.scope.$watch('nav.isToggle',(newVal,oldVal)=>{
      if (!newVal) this.scroll();
    });
    this.scope.$watch('nav.isToggleAssigned',(newVal,oldVal)=>{
      this.toggleAssigned=newVal;
    });
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      this.base=newVal;
      if (this.base&&this.base.base==='UNK') {
        this.toggleAssigned=false;
        window.toggleAssigned=this.toggleAssigned;
      }
      else {
        this.toggleAssigned=true;
        window.toggleAssigned=this.toggleAssigned;
      }
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
        this.allTodaysFlights=res.data;
        this.todaysFlights=this.filterTodaysFlights(res.data);
        console.log(this.todaysFlights);
        this.scroll();
        this.socket.unsyncUpdates('todaysFlight');
        this.socket.syncUpdates('todaysFlight', this.allTodaysFlights,(event,item,array)=>{
          //no need to run the socket update if its just a color patch!  Runasay conndition with multiple clients ensues!
          if (item.colorPatch&&item.colorPatch==='true') return;
          console.log('todaysFlights Updated ' + event);
          console.log(item);
          this.allTodaysFlights=array;
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
        //this.masterAirports=array;
        this.updateArray.push(item);
        let localLength=angular.copy(this.updateArray.length);
        this.timeout(()=>{
          if (localLength===this.updateArray.length){
            console.log(this.updateArray);
            this.updateArray=[];
            localLength=0;
            console.log('updating airportRequirements at: '+new Date().toLocaleString());
            this.airports=this.setBase(array);
            this.masterAirports=array;
          }
        },3000);
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
          //bmcintosh adjustment
          if (flight.pilot==='bmcintosh') flight.pilot='bmcIntosh';
          if (flight.coPilot==='bmcintosh') flight.coPilot='bmcIntosh';
          //m evans adjustment
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
        let match=true;
        //attach routing to airportRequirements
        let airportObjs=[];
        flight.airports.forEach((a,listIndex)=>{
        //for (let a of flight.airports) {
          if (!this.masterAirports) return;
          let i=this.masterAirports.map(e=>e.name).indexOf(a);
          if (i>-1) {
            let night=false;
            if (flight.departTimes.length>listIndex&&this.masterAirports[i].metarObj) night=this.isItNight(this.masterAirports[i].metarObj.airport,flight.departTimes[listIndex]);
            if (!this.masterAirports[i].metarObj) this.masterAirports[i].metarObj={airport:{threeLetter:a}};
            airportObjs.push(angular.copy(this.masterAirports[i].metarObj));
            if (airportObjs[listIndex]) {
              if (!airportObjs[listIndex].airport) airportObjs[listIndex].airport=angular.copy(this.masterAirports[i]);
              airportObjs[listIndex].night=night;
              airportObjs[listIndex].aircraft=flight.aircraft;
            }
          }
          else airportObjs.push({airport:{threeLetter:a}});
        });
        if (flight.color!==this.flightRiskClass(airportObjs)) match=false;
        if (!flight.airportObjs||flight.airportObjs.length!==airportObjs.length) match=false;
        airportObjs.forEach((obj,objIndex)=>{
          if (!flight.airportObjs||!flight.airportObjs[objIndex]) match=false;
          else if (obj.color!==flight.airportObjs[objIndex].color) match=false;
        });
        flight.airportObjs=airportObjs;
        flight.color=this.flightRiskClass(airportObjs);
        if (!match&&flight.active==='true'&&flight.date===new Date().toLocaleDateString()) this.http.patch('/api/todaysFlights/'+flight._id,{airportObjs:airportObjs,color:flight.color,colorPatch:'true'});
      });
      array=array.filter(flight=>{return flight});
      this.timeout(()=>{
        //this.setPilotList();
        //this.setAirplaneList();
      },200);
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
      this.alternateAirports=[];
      airports.forEach((airport,airportIndex)=>{
        if (!airport) return;
        if (airport.name==="Fairbanks International") airport.name="Fairbanks";
        let taf='';
        let TAF={};
        if (airport.currentTaf) taf=airport.currentTaf;
        if (airport.currentTafObject) TAF=airport.currentTafObject;
        if (airport.metarObj&&(!taf||taf==='')) taf=airport.metarObj.taf;
        //if (airport.currentMetar&&airport.currentMetar!=='missing') {
        //  airport.metarObj=this.metar.parseADDS(airport.currentMetar);
        //}
        if (!airport.metarObj) airport.metarObj={};
        airport.metarObj.airport=angular.copy(airport);
        airport.metarObj.color=this.overallRiskClass(airport.metarObj);
        airport.metarObj.taf=taf;
        airport.metarObj.TAF=TAF;
        let masterIndex=this.masterAirports.map(e=>e.threeLetter).indexOf(airport.threeLetter);
        if (masterIndex>-1) this.masterAirports[masterIndex].metarObj=angular.copy(airport.metarObj);
        if (airport.icao==='PAOM'||airport.icao==='PAOT'||airport.icao==='PAUN'||airport.icao==='PANC'||airport.icao==='PABE'||airport.icao==='PAGA'||airport.icao==='PAFA') {
          //this.http.get('https://avwx.rest/api/taf/' + airport.icao.toUpperCase() + '?token=' + this.appConfig.token).then(res=>{
            //if (res.data.Error) console.log(res.data.Error);
            //airport.metarObj.taf=taf
            //airport.metarObj.TAF=TAF;
            if (this.alternateArray.indexOf(airport.threeLetter)>-1) this.alternateAirports.push(angular.copy(airport));
          //}).catch(err=>{
            //if (this.alternateArray.indexOf(airport.threeLetter)>-1) this.alternateAirports.push(angular.copy(airport));
            //console.log(err)});
        }
        if (airportIndex>=airports.length-1) this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
      });
      if (this.scope.nav.base.four==="PAOM") {
        this.airports=airports.filter(e=>{
          return (e.threeLetter&&e.threeLetter!==""&&(e.baseGroup===window.base.four||e.baseGroup==="PAUN"))
              ||e.icao==="PAOM"||e.icao==="PAUN"||e.icao==="PAOT";
        });
      }
      else {
        this.airports=airports.filter(e=>{
          return (e.threeLetter&&e.threeLetter!==""&&(e.baseGroup===window.base.four))
              ||e.icao==="PAOM"||e.icao==="PAUN"||e.icao==="PAOT";
        });
      }
      this.airports.sort((a,b)=>{
        let aI=this.airportOrder.indexOf(a.icao);
        let bI=this.airportOrder.indexOf(b.icao);
        if (aI>-1&&bI>-1) return aI-bI;//a.threeLetter.localeCompare(b.threeLetter);
        if (aI<0&&bI<0) return a.threeLetter.localeCompare(b.threeLetter);
        if (aI<0) return 1;
        if (bI<0) return -1;
        
      });
      
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
  
  flightRiskClass(airportObjs){
    let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-pink'];
    let color=colors[0];
    let night=false;
    let colorIndex=0;
    if (!airportObjs) return color;
    for (let i=0;i<airportObjs.length;i++) {
    //airportObjs.forEach(metarObj=>{
      let myClass=this.overallRiskClass(airportObjs[i]);
      let arr=myClass.split(' ');
      arr.forEach(a=>{
        if (a==='night') night=true;
        if (colors.indexOf(a)>colorIndex) {
          color=a;
          colorIndex=colors.indexOf(a);
        }
      });
    }
    if (night) return 'night '+color;
    return color;
  }
  
  overallRiskClass(metarObj){
    let returnString="";
    if (!metarObj) metarObj={};
    if (metarObj.night) returnString+=' night';
    let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-pink'];
    let color="airport-green";
    let tempColor="airport-green";
    //runway
    //if (!metarObj.airport) return returnString+=' '+color;
    tempColor=this.returnColor({yellow:5,red:2},metarObj.airport.runwayScore,'above');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //if (airport.name==='Gambell') console.log(airport);
    //possibly no metarObj
    if (!metarObj||!metarObj['Raw-Report']) {
      if (color!=='airport-red') color='airport-blue';
      return returnString+=' '+color;
    }
    //icing?
    if (metarObj.Freezing) color='airport-pink';
    //Visibility
    if (!metarObj.Visibility||!metarObj.Ceiling||!metarObj.altimeter) return returnString+' airport-purple';
    if (metarObj.Visibility==='99'||metarObj.Ceiling=='9999'||metarObj.Visibility===99||metarObj.Ceiling==9999) return returnString+' airport-purple';
    //visibility
    tempColor=this.returnColor(metarObj.airport.visibilityRequirement, metarObj.Visibility,'above',metarObj.airport);
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //ceiling
    tempColor=this.returnColor(metarObj.airport.ceilingRequirement,metarObj.Ceiling,'above',metarObj.airport);
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //wind
    tempColor=this.returnWindColor(metarObj.aircraft,metarObj['Wind-Gust'],metarObj['Wind-Direction'],metarObj.airport);//this.returnColor({yellow:30,red:35},metarObj["Wind-Gust"],'below');
    
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //return
    metarObj.color=returnString+' '+color;
    return returnString+' '+color;
  }
  
  returnColor(limitObj,observation,direction,airport){
    if (!observation||observation===""||!limitObj) {
      return '';
      //console.log('returnColor');
      return 'airport-purple';
    }
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
  
  returnWindColor(aircraft,gust,windDirection,airportObj){
    
    if (!gust||!windDirection||!airportObj) {
      //console.log('windColor');
      return 'airport-purple';
    }
    let equipment=angular.copy(this.equipment[0]);
    if (this.allAircraft) {
      let index=this.allAircraft.map(e=>e._id).indexOf(aircraft);
      if (index>-1&&this.allAircraft[index]) index=this.equipment.map(e=>e.name).indexOf(this.allAircraft[index].acftType);
      if (index>-1) equipment=angular.copy(this.equipment[index]);
    }
    if (!airportObj.runways) {
      if (gust>equipment.wind) return 'airport-pink';
      if (gust>equipment.wind-5) return 'airport-yellow';
      return 'airport-green';
    }
    let xwindAngle=0;
    let direction=0;
    let crosswind=0;
    if (airportObj.runways) {
      xwindAngle=90;
      direction=parseInt(windDirection,10);
      airportObj.runways.forEach(function(runway){
        if (Math.abs(direction-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-runway*10);
        if (Math.abs(direction+360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction+360-runway*10);
        if (Math.abs(direction-360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-360-runway*10);
      });
    }
    crosswind = Math.round(gust*Math.sin(xwindAngle*(Math.PI/180)));
    if (airportObj.icao==='PAGM'){
      if (direction>=40&&direction<=100){
        equipment.wind-=5;
        equipment.xwind-=10;
      }
    }
    if (airportObj.icao==="PADG") {
     equipment.wind=30;
     equipment.xwind=15;
    }
    if (gust>equipment.wind) return 'airport-pink';
    if (crosswind>equipment.xwind) return 'airport-pink';
    if (gust>equipment.wind-5) return 'airport-yellow';
    if (crosswind>equipment.xwind-5) return 'airport-yellow';
    return 'airport-green';
    
  }
  
  airportClass(score){
    score=parseInt(score,10);
    if (isNaN(score)) return "airport-green";
    if (score<=1) return "airport-pink";
    if (score>1&&score<5) return "airport-yellow";
    return "airport-green";
  }
  
  getNextTAF(TAF){
    console.log(TAF);
    let index=this.findTAFIndex(TAF);
    return TAF[index];
  }
  
  findTAFIndex(TAF){
    let index=0;
    let now=new Date();
    let twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    for (let i=0;i<TAF.length;i++){
      let start=new Date(TAF[i].start_time.dt);
      if (start<twoHoursFromNow&&TAF[i].type==="FROM") index=i;
    }
    return index;
  }
  
  altClass(airport){
    let ceiling=10000;
    if (!airport.metarObj||!airport.metarObj.TAF) return 'airport-blue';
    let index=this.findTAFIndex(airport.metarObj.TAF);
    let clouds=[...airport.metarObj.TAF[index].clouds].reverse();
    clouds.forEach(cloud=>{
      if ((cloud.type==='OVC'||cloud.type==="BKN"||cloud.type==='VV')&&cloud.altitude*100<ceiling) ceiling=cloud.altitude*100;
    });
    if (ceiling<400) return 'airport-pink';
    let visibility=10;
    if (airport.metarObj.TAF[index].visibility.value) visibility=airport.metarObj.TAF[index].visibility.value;
    if (visibility<1) return 'airport-pink';
    if (airport.metarObj.TAF[index].icing.length>0) return 'airport-pink';
    // iterate through TAF[index].wx_codes array, look at 'repr' and search for 'FZ'
    if (airport.metarObj.TAF[index].wx_codes){
      for (let y=0;y<airport.metarObj.TAF[index].wx_codes.length;y++){
        let code=airport.metarObj.TAF[index].wx_codes[y];
        if (code.repr&&code.repr.includes('FZ')) return 'airport-pink';
      }
    }
    //console.log(airport.threeLetter+' '+ceiling);
    return 'airport-green';
  }
  
  sign(airport){
    this.runwayModal(airport,{_id:airport._id,runwayScore:airport.runwayScore,comment:airport.comment,signature:airport.signature,timestamp:airport.timestamp});
  }
  
  getDate(timestamp){
    if (!timestamp) return;
    return new Date(timestamp).toLocaleString();
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
    let rf;
    if (this.recentFlights) rf=angular.copy(this.recentFlights);//.filter(f=>{return f.pilotObject}));
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
        if (pilotIndex<0){
          console.log(pilot.name+' is not in the list of allPilots from firebase');
          return;
        }
        let p=this.allPilots[pilotIndex];
        //see if pilot has been assigned yet
        p.assigned=false;
        if (this.todaysFlights){
          let tf=this.todaysFlights.filter(f=>{return f.pilotObject&&f.date===this.dateString});
          let flightIndex=tf.map(e=>e.pilotObject._id).indexOf(p._id);
          if (flightIndex>-1) p.assigned=true;
          tf=this.todaysFlights.filter(f=>{return f.coPilotObject&&f.date===this.dateString});
          flightIndex=tf.map(e=>e.coPilotObject._id).indexOf(p._id);
          if (flightIndex>-1) p.assigned=true;
        }
        let inBase=pilot.pilotBase===this.base.base;
        //UNK Base rules
        if (this.base.base==="UNK") {
          this.recentFlights.forEach(flight=>{
            if (flight.pilot!==p.displayName) return;
            let x=flight.legArray.map(e=>e.arr).indexOf('UNK');
            if (x>-1) inBase=true;
          });
          //inBase=false;
          //if (rf) {
            //let x=rf.map(e=>e.pilot).indexOf(p.displayName);
            //if (x>-1) {
              //let y=rf[x].legArray.map(f=>f.arr).indexOf('UNK');
              //if (y>-1) inBase=true;
            //}
          //}
        }
        //set up headers for sort order
        p.header='';
        p.code=pilot.code;
        if (inBase&&p) {
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
      //do the assigned thing for this.allAircraft
      
    }
  }
  
  fixedWing(base){
    if (!this.base) return false;
    if (base) return base===this.base.base;
    else return this.base.base==="OME"||this.base.base==="OTZ"||this.base.base==="UNK";
  }
  
  getLayout(){
    return "layout-OME";
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
          console.log('This would have fired a firebase update if it weren`t commented out');
          //this.http.post('/api/airplanes/updateFirebaseNew',{collection:'aircraft',doc:{currentAirport:this.recentFlights[x].legArray.at(-1).arr,_id:this.allAircraft[index]._id}});
        }
        this.allAircraft[index].currentAirport=this.recentFlights[x].legArray.at(-1).arr;
      }
    }
    this.allAircraft.forEach(aircraft=>{
      aircraft.assigned=false;
      if (!this.allTodaysFlights) return;
      let tf=angular.copy(this.allTodaysFlights.filter(f=>{return f.active==='true'}));
      let aircraftIndex=tf.map(e=>e.aircraft).indexOf(aircraft._id);
      if (aircraftIndex>-1) aircraft.assigned=true;
    });
    this.displayedAircraft=this.allAircraft.filter(a=>{
      baseTest=false;
      if (this.base.base==="HEL"||a.currentAirport===this.base.base) baseTest=true;
      if (this.base.base==="UNK"){
        this.recentFlights.forEach(flight=>{
          if (flight.acftNumber!==a._id) return;
          let x=flight.legArray.map(e=>e.arr).indexOf('UNK');
          if (x>-1) baseTest=true;
        });
      }
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
      let i=-1;
      if (this.calendar) i=this.calendar.map(e=>e.date).indexOf(this.date.toLocaleDateString());
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
    let date=window.dateString;
    if (this&&this.assessment) {
      date=new Date().toLocaleDateString();
    }
    let old=false;
    if (window.toggle){
      let arr=flight.departTimes[0].split(':');
      if (arr.length===3) {
        let flightDate=new Date(date).setHours(arr[0],arr[1],arr[2]);
        if (new Date()>flightDate&&date===new Date().toLocaleDateString()) old=true;
      }
    }
    let inBase;
    if (window.base&&window.base.base==='HEL') inBase=false;
    else if (window.base&&window.base.base==='OTZ')  {
      inBase=flight.airports[0]==='Kotzebue'||flight.airports.at(-1)==='Kotzebue';
    }
    else if (window.base&&window.base.base==='UNK')  {
      for (let i=0;i<flight.airports.length;i++){
        if (flight.airports[i]==='Unalakleet') inBase=true;
      }
    }
    else inBase=flight.airports[0]==='Nome'||flight.airports[0]==='Unalakleet'||flight.airports.at(-1)==='Nome'||flight.airports.at(-1)==='Unalakleet';
    return (flight.date===date)&&inBase&&flight.active==='true'&&!old;
  }
  
  activeClass(active){
    if (active!=="true") return "inactive";
  }
  
  amIStopped(){
    if (this.stopped) return "stopped";
  }
  
  recordAssessment(){
    let date=new Date();
    //if (!this.dateString||this.dateString!==date.toLocaleDateString()) return;
    let date2=new Date();
    date2.setMinutes(date2.getMinutes()+1);
    date2.setSeconds(date2.getSeconds()+2);
    date.setSeconds(date.getSeconds()-2);
    this.assessment=true;
    if (!this.todaysFlights){
      console.log('too quick!  try again!');
      return;
    }
    let flights=this.todaysFlights.filter(flight=>{return this.todaysFlightDisplayFilter(flight)});
    this.assessment=false;
    flights.forEach(flight=>{
      if (!flight.departTimes||flight.departTimes.length<1) return;
      let depart=flight.departTimes[0];
      let dDate=new Date();
      if (depart) {
        depart=depart.split(':');
        if (depart.length===3) {
          dDate.setHours(depart[0],depart[1],depart[2]);
          if (dDate<=date2&&dDate>=date) {
            let pilot=flight.pilot;
            if (flight.pilotObject) pilot=flight.pilotObject.displayName;
            //record assessment
            this.http.post('/api/assessments',{date:date,airportObjs:flight.airportObjs,pilot:pilot,flight:flight.flightNum,
                   equipment:flight.aircraft,color:this.flightRiskClass(flight.airportObjs)}).then(res=>{
              console.log('Assessment Recorded');
              console.log(res.data);
            }).catch(err=>{console.log(err)});
          }
        }
      }  
    });
    return;
  }
  
  getFlightNum(flightNum){
    if (flightNum.length===3||flightNum.length===4) return 'BRG'+flightNum;
    return 'ID# ' +flightNum;
  }
  
  renewFirebase(){
    this.http.post('/api/airplanes/firebaseLimited',{collection:'flights',limit:51}).then(res=>{
      this.recentFlights=res.data.filter(flight=>{
        return new Date(flight.dateString).toLocaleDateString()===new Date().toLocaleDateString();
        //return flight.legArray.at(-1).onTime;
      });
      this.recentFlights.sort((a,b)=>{
        let aReverse=[...a.legArray].reverse();
        let bReverse=[...b.legArray].reverse();
        let aOnTime= aReverse[0].onTime;
        if (aOnTime) aOnTime=aOnTime._seconds;
        let aOffTime= aReverse[0].offTime;
        let bOnTime= bReverse[0].onTime;
        if (aOffTime) aOffTime=aOffTime._seconds;
        if (bOnTime) bOnTime=bOnTime._seconds;
        let bOffTime= bReverse[0].offTime;
        if (bOffTime) bOffTime=bOffTime._seconds;
        while (!aOnTime&&aReverse.length>0) {
          if (aOffTime) aOnTime=aOffTime;
          else {
            aReverse.shift();
            if (aReverse.length===0) return;
            aOnTime= aReverse[0];
            if (aOnTime) aOnTime=aOnTime.onTime;
            aOffTime= aReverse[0];
            if (aOffTime) aOffTime=aOffTime.offTime;
            if (aOnTime) aOnTime=aOnTime._seconds;
            if (aOffTime) aOffTime=aOffTime._seconds;
          }
        }
        while (!bOnTime&&bReverse.length>0) {
          if (bOffTime) bOnTime=bOffTime;
          else {
            bReverse.shift();
            if (bReverse.length===0) return;
            bOnTime= bReverse[0];
            if (bOnTime) bOnTime=bOnTime.onTime;
            bOffTime= bReverse[0];
            if (bOffTime) bOffTime=bOffTime.offTime;
            if (bOnTime) bOnTime=bOnTime._seconds;
            if (bOffTime) bOffTime=bOffTime._seconds;
          }
        }
        if (aOnTime&&bOnTime) return bOnTime-aOnTime;
        if (!aOnTime&&!bOnTime) return 0;
        if (!aOnTime) return -1;
        if (!bOnTime) return 1;
        return 0;
      });
      console.log(this.recentFlights);
      //console.log(this.recentFlights.filter(a=>{return a.acftNumber==='N408BA'}));
      this.setAirplaneList();
      this.setPilotList();
    });
    this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.allPilots=res.data;
      window.allPilots=res.data;
      //this.setPilotList();
      this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
    });
    this.http.post('/api/airplanes/firebase',{collection:'aircraft'}).then(res=>{
      this.allAircraft=res.data;
    });
  }
  
  handleClick(evt,airport,source,flightId,routeIndex){
    if (source==='taf') {
      switch(evt.which) {
        case 1://left click
            this.runwayModal(airport,{_id:airport._id,runwayScore:airport.runwayScore,comment:airport.comment,signature:airport.signature,timestamp:airport.timestamp}); 
            break;
        case 2:
            // for middle click functionality
            break;
        case 3://right click
            this.tafDisplay('The TAF for ' +airport.name+' is:',airport.metarObj.taf);
            break;
        default:
            console.log("you have a strange mouse");
            break;
      }
    }
    if (source==='metar') {
      switch(evt.which) {
        case 1://left click
            if (!airport['Raw-Report']) {
              this.airportNameToMetar(airport.airport.threeLetter);
              let index=-1;
              this.timeout(()=>{
                if (index>-1) {
                  this.todaysFlights[index].airportObjs[routeIndex]=this.metar.parseADDS(this.tempMetar);
                  this.todaysFlights[index].airportObjs[routeIndex].airport=angular.copy(airport.airport);
                }
              },3000);
              index=this.todaysFlights.map(e=>e._id).indexOf(flightId);
              //console.log(airport);
            }
            break;
        case 2:
            // for middle click functionality
            break;
        case 3://right click
            this.tafDisplay('The METAR for ' +airport.airport.name+' is:',airport['Raw-Report']);
            break;
        default:
            console.log("you have a strange mouse");
            break;
      }
    }
  }
  
  airportNameToMetar(name){
    this.http.get('https://avwx.rest/api/search/station?text=' + name + '&reporting=false&token=' + this.appConfig.token).then(res=>{
      if (res.data.Error) { 
        return '';
      }
      let foundIndex=-1;
      for (let i=0;i<res.data.length;i++){
        if (res.data[i].country==='US'&&res.data[i].state==='AK') foundIndex=i;
      }
      if (foundIndex<0) {
        console.log(res.data);
        return;
      }
      this.http.get('https://avwx.rest/api/metar/' + res.data[foundIndex].icao + '?token=' + this.appConfig.token).then(resp=>{
        if (resp.data.Error) { 
          return;
        }
        this.tempMetar=resp.data.raw;
      }).catch(err=>{console.log(err)});
      //return res.data[0].icao;
    }).catch(err=>{console.log(err)});
    
  }
  
}

angular.module('workspaceApp')
  .component('status', {
    templateUrl: 'app/status/status.html',
    controller: StatusComponent,
    controllerAs: 'status'
  });

})();
