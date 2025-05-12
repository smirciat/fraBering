'use strict';

(function(){

class StatusComponent {
  constructor($http,$scope,$interval,$timeout,socket,metar,$location,$anchorScroll,moment,Auth,appConfig,Modal) {
    this.headerScroll=120;
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
    this.Math=Math;
    this.appConfig=appConfig;
    this.equipment=appConfig.equipment;
    this.Modal=Modal;
    this.date=new Date();
    this.assignedFlights=[];
    this.todaysFlights=[];
    this.updateArray=[];
    this.chosenPilot={};
    this.chosenAircraft={},
    this.chosenFlight={};
    this.toggleAssigned=true;
    this.clicked;
    this.stopped;
    this.longPressTimer;
    this.longPressDuration = 500;
    this.view='board';
    this.updateKeys=['pilotAgree','releaseTimestamp','ocRelease','ocReleaseTimestamp','dispatchRelease','dispatchReleaseTimestamp','knownIce'];
    this.B190Configs=['Mx','Cargo','Primary 9','9','13','15','17','19','Low Hours','Medivac','Silver Sky'];
    this.B190Equipments=[0,0,134,134,137,97,57,57.5,0,0,0];
    this.BE20Configs=['Mx','9','Primary','Secondary','Single','Tandem','Aft Tandem','Low Hours','Silver Sky'];
    this.BE20Equipments=[0,0,40,40,40,40,40,40,40,0];
    this.alternateArray=['OME','OTZ','UNK','BET','GAL','ANC','FAI'];
    this.airportOrder=['PAOM','PAUN','PAOT','PAGM','PASA','PASH','PAIW','PATC','PFKT','PATE','PAWM','PAGL','PFEL',
            'PAKK','PFSH','PAMK','WBB','PADG','PAPO','PALU','PAVL','PAWN','PFNO','PAIK','PASK','PAFM','PAGH','PAOB','PABL','PADE'];
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('todaysFlight');
        socket.unsyncUpdates('calendar');
        socket.unsyncUpdates('airplane');
        socket.unsyncUpdates('signature');
        socket.unsyncUpdates('airportRequirement');
    });
  }
  
  $onInit() {
    this.http.post('/api/airportRequirements/pireps',{airport:'UNK'}).then(res=>{console.log(res.data)});
    this.http.post('/api/signatures/day',{date:this.dateString}).then(res=>{console.log(res.data)});
    this.http.post('/api/todaysFlights/getManifest',{date:'04/13/2025',flightNum:'815'}).then(res=>{console.log(res.data)}).catch(err=>{console.log(err)});
    //this.http.post('/api/todaysFlights/getManifests').then(res=>{console.log(res.data)});
    this.width=document.documentElement.clientWidth;
    if (this.width<768) this.mobile=true;
    if (this.width===768) this.iPad=true;
    window.width=this.width;
    window.getWidth=function(num,kind){
      if (window.width<768) num=Math.floor(num/2);
      let val=num.toString()+kind;
      return {"width":val};
    };
    //this.http.post('/api/airportRequirements/notams',{airport:'PAOM'}).then(res=>{
    //  console.log(res.data);
    //});
    this.isFilter=window.isFilter;
    this.toggleAssigned=window.toggleAssigned;
    this.scrollInterval=this.interval(()=>{
      //this.scroll();
      this.renewFirebase();
    },60*60*1000);
    
    this.renewFirebase();
    this.metarModal=this.Modal.confirm.metars();
    this.quickModal=this.Modal.confirm.quickMessage(response=>{this.clicked=true;});
    this.tafDisplay=this.Modal.confirm.quickShow(response=>{});
    this.airportModal=this.Modal.confirm.airport(response=>{
      if (response.requestMetarList) {
        if (response.airport&&response.airport.icao) {
            this.http.post('/api/airportRequirements/grabMetars',{airport:response.airport.icao}).then(res=>{
              this.metarModal(res.data);
            });
        }
      }
      if (response&&response.manualOpen){
        if (response.airport.manualObs) {
          response.airport.manualObs.previousSignature=response.airport.manualObs.signature;
          response.airport.manualObs.signature=null;
        }
        this.weatherModal(response.airport,this.user);
      }
    });
    this.weatherModal=this.Modal.confirm.weather(airport=>{
      this.http.patch('/api/airportRequirements/'+airport._id,{manualObs:airport.manualObs,manualTimestamp:airport.manualTimestamp});
      let index=this.airports.map(e => e._id).indexOf(airport._id);
      if (index>-1) this.airports[index]=airport;
    });
    this.flightModalCallback=(flight)=>{
      this.spinner=true;
      //if (flight.security){
        //patch pfr with pfr.remark1
        //this.http.post('/api/airplanes/updateFirebaseNew',{collection:'flights',doc:{_id:flight.pfr._id,remarks1:flight.security}}).then(res=>{
          //console.log(res.data)
        //}).catch(err=>{
          //console.log(err);
        //});
      //}
      if ((flight.ocRelease||flight.dispatchRelease)&&flight.pilotAgree&&!flight.colorLock) flight.colorLock=flight.color;
      if (flight.pilotAgree&&flight.pilotAgree!==""&&!flight.releaseTimestamp) flight.releaseTimestamp=new Date();
      if (flight.ocRelease&&flight.ocRelease!==""&&!flight.ocReleaseTimestamp) flight.ocReleaseTimestamp=new Date();
      if (flight.dispatchRelease&&flight.dispatchRelease!==""&&!flight.dispatchReleaseTimestamp) flight.dispatchReleaseTimestamp=new Date();
      flight.runScroll=true;
      //update flight in database
      flight.updated=new Date();
      flight.updatedBy=this.user.name;
      let id=flight._id;
      delete flight._id;
      this.http.post('/api/signatures',flight);
      this.http.patch('/api/todaysFlights/'+id,flight).then(res=>{
        flight._id=id;
        this.spinner=false;
        console.log('Updated Flight ' + flight.flightNum);
        if (flight.pilotAgree||flight.ocRelease||flight.dispatchRelease) this.quickModal("Flight Release Signature has Been Recorded","Success!",false);
        //updates have been failing occasionally, even with positive confimation, try to prevent that
        this.timeout(()=>{
          let index=this.todaysFlights.map(e=>e._id).indexOf(flight._id);
          if (index>-1) {
            let match=true;
            for (let key of this.updateKeys){
              if (key.slice(-5)==='stamp'&&this.todaysFlights[index][key]&&flight[key]) {
                if (new Date(this.todaysFlights[index][key]).toLocaleString()!==new Date(flight[key]).toLocaleString()) match=false;
              }
              else if (this.todaysFlights[index][key]!==flight[key]) match=false;
            }
            console.log(match);
            if (!match) this.flightModalCallback(flight);
          }
        },5000);
      })
      .catch(err=>{
        console.log(err);
        this.spinner=false;
        this.quickModal("Flight Release Signing Failed!  Check Internet Connection!","Failed!",true);
      });
      //update flight in this.todaysFlights
      let index=this.todaysFlights.map(e => e._id).indexOf(flight._id);
      if (index>-1) Object.assign(this.todaysFlights[index], flight);
    };
    this.flightModal=this.Modal.confirm.flight(flight=>{
      this.flightModalCallback(flight);
    });
    this.runwayModal=this.Modal.confirm.runway(res=>{
      this.spinner=true;
      if (res.timestampString) res.timestamp=new Date(res.timestampString);
      else res.timestamp=new Date();
      res.runScroll=true;
      if (!res.comment) res.comment='';
      if (!res.signature) res.signature='';
      if (res.runwayScore===undefined||res.runwayScore===null) res.runwayScore='';
      if (!res.depth) res.depth='';
      if (!res.contaminent) res.contaminent='';
      if (!res.percent) res.percent='';
      if (!res.openClosed) res.openClosed='';
      let index = this.airports.map(e => e._id).indexOf(res._id);
      if (index>-1) {
        this.airports[index].signature=res.signature;
        this.airports[index].timestamp=res.timestamp;
        this.airports[index].comment=res.comment;
        this.airports[index].runwayScore=res.runwayScore;
        this.airports[index].openClosed=res.openClosed;
        this.airports[index].depth=res.depth;
        this.airports[index].contaminent=res.contaminent;
        this.airports[index].percent=res.percent;
        if (res._id) {//&&res.signature&&res.runwayScore){
          this.http.patch('/api/airportRequirements/'+res._id,res).then(resp=>{
            this.spinner=false;
          })
          .catch(err=>{
            console.log(err);
            this.spinner=false;
            this.quickModal("Runway Update Failed!  Check Internet Connection!","Failed!",true);
          });
        }
      }
    });
    this.http.get('/api/airplanes').then(res=>{
      this.user=this.Auth.getCurrentUser();
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
    //this.scope.$watch('nav.isToggle',(newVal,oldVal)=>{
      //if (!newVal) this.scroll();
    //});
    //this.scope.$watch('nav.isToggleAssigned',(newVal,oldVal)=>{
    //  this.toggleAssigned=newVal;
    //});
    this.scope.$watch('nav.view',(newVal,oldVal)=>{
      if (!newVal) return;
      this.view=newVal;
    });
    this.scope.$watch('nav.isFilter',(newVal,oldVal)=>{
      this.isFilter=newVal;
      this.todaysFlights=this.filterTodaysFlights(this.allTodaysFlights);
    });
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      this.spinner=true;
      if (!newVal||newVal==='') return;
      this.timeout(()=>{
        this.scope.nav.isCollapsed=true;
        this.base=newVal;
        if (!oldVal) {
          this.spinner=false;
          return;
        }
        //this.scroll();
          this.timeout(()=>{
            this.spinner=false;
            if (this.masterAirports) this.setBase(this.masterAirports);
            this.setPilotList();
            this.setAirplaneList();
          },200);
      },0);
    });
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{//or '$root.nav...'
      this.spinner=true;
      if (!newVal||newVal==='') return;
      let timeoutVal=0;
      if (!oldVal||oldVal==='') timeoutVal=300;
      this.timeout(()=>{
        this.scope.nav.isCollapsed=true;
        this.dateString=newVal;
        this.date=new Date(this.dateString);
        this.http.post('/api/todaysFlights/dayFlights',{dateString:this.dateString}).then(res=>{
          console.log(res.data)
          this.allTodaysFlights=res.data;
          this.todaysFlights=this.filterTodaysFlights(res.data);
          //this.scroll();
          this.timeout(()=>{
            this.spinner=false;
            this.setPilotList();
            this.setAirplaneList();
          },200);
          this.socket.unsyncUpdates('todaysFlight');
          this.socket.syncUpdates('todaysFlight', this.allTodaysFlights,(event,item,array)=>{
            this.allTodaysFlights=array;
            //no need to run the socket update if its just a color patch!  Runaway conndition with multiple clients ensues!
            if (item.colorPatch&&item.colorPatch==='true') return;
            if (item.runScroll||(item.date===this.dateString&&event==="created")) {
              this.spinner=true;
              console.log(array)
              this.todaysFlights=this.filterTodaysFlights(array);
              console.log('Todays Flight Socket fired');
              console.log(item);
              this.timeout(()=>{this.spinner=false;},0);
            }
          });
        });
      },timeoutVal);
    });
    
    this.http.get('/api/airportRequirements').then(res=>{
      this.masterAirports=res.data;
      this.airports=this.setBase(res.data);
      this.socket.unsyncUpdates('airportRequirement');
      this.socket.syncUpdates('airportRequirement', this.masterAirports,(event,item,array)=>{
        this.timeout(()=>{
          if (item.runScroll) {
            console.log('AirportRequiments Updated');
            console.log(array);
            console.log('updating airportRequirements at: '+new Date().toLocaleString());
            this.airports=this.setBase(array);
            this.masterAirports=array;
          }
        },0);
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
      })
      .catch(err=>{console.log(err)});
    });
  }
  
  nonPilot(nonPilot){
    if (nonPilot) return 'airport-gray';
  }
  
  filterTodaysFlights(array){
      if (!this.dateString||!array) return array;
      if (this.isFilter){
        let user=this.user.name.toLowerCase();
        let middle='';
        let userArr=user.split(' ');
        if (userArr.length>1&&user!=="bering air"&&this.user.role!=='admin') {
          //mike evans code
          if (userArr[0]==='michael'&&userArr[userArr.length-1]==='evans') middle=userArr[1].substring(0,1);
          user=userArr[0].substring(0,1) + middle + userArr[userArr.length-1];
          //sophia Evans code
          if (userArr[0]==='sophia'&&userArr[userArr.length-1]==='evans') user = 'shobbs';
          array=array.filter(flight=>{
            return flight.pilot===user||flight.coPilot===user;
          });
        }
      }
      array.forEach(flight=>{
        if (this.dateString!==flight.date) {
          flight=undefined;
          return;
        }
        if (!flight.flightId) flight.active==='false';
        
        let match=true;
        //attach routing to airportRequirements
        let airportObjs=[];
        if (!flight.airportObjs) {
          flight.airportObjs=[];
          flight.airports.forEach(a=>{
            let i=this.masterAirports.map(e=>e.name).indexOf(a);
            if (i>-1) flight.airportObjs.push(angular.copy(this.masterAirports[i]));
            else flight.airportObjs.push({airport:{threeLetter:a}});
          });
        }  
        flight.airports.forEach((a,listIndex)=>{
        //for (let a of flight.airports) {
          if (!this.masterAirports) return;
          let i=this.masterAirports.map(e=>e.name).indexOf(a);
          if (i>-1) {
            if (!flight.airportObjs[listIndex]) flight.airportObjs[listIndex]=angular.copy(this.masterAirports[i]);
            let night=false;
            if (flight.departTimes.length>listIndex&&this.masterAirports[i].metarObj) night=this.isItNight(this.masterAirports[i].metarObj.airport,flight.departTimes[listIndex]);
            if (!this.masterAirports[i].metarObj) this.masterAirports[i].metarObj={airport:{threeLetter:a}};
            airportObjs.push(angular.copy(this.masterAirports[i].metarObj));
            if (airportObjs[listIndex]) {
              if (!airportObjs[listIndex].airport) airportObjs[listIndex].airport=angular.copy(this.masterAirports[i]);
              airportObjs[listIndex].night=night;
              flight.airportObjs[listIndex].night=night;
              if (night) flight.airportObjs[listIndex].color+=" night ";
              airportObjs[listIndex].aircraft=flight.aircraft;
              flight.airportObjs[listIndex].aircraft=flight.aircraft;
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
        //flight.airportObjs=airportObjs;
        //flight.color=this.flightRiskClass(airportObjs);
        //if (!match&&flight.active==='true'&&flight.date===new Date().toLocaleDateString()) this.http.patch('/api/todaysFlights/'+flight._id,{airportObjs:airportObjs,color:flight.color,colorPatch:'true'});
      });
      array=array.filter(flight=>{return flight});
      //this.timeout(()=>{
        //this.setPilotList();
        //this.setAirplaneList();
      //},0);
      
      return array;// array.sort((a,b)=>{return a.departTimes[0].localeCompare(b.departTimes[0])});
  }
  
  filterDuplicates(arr, key1, key2) {
    const seen = new Set();
    return arr.filter(obj => {
      const identifier = `${obj[key1]}-${obj[key2]}`;
      const isDuplicate = seen.has(identifier);
      seen.add(identifier);
      return !isDuplicate;
    });
  }
  
  updateSignatures(item){
    let tf=this.todaysFlights.filter(f=>{return f.date===item.date&&f.flightNum===item.flightNum});
    if (tf.length>0) {
      let i=this.todaysFlights.map(e=>e._id).indexOf(tf[0]._id);
      if (i>-1) {
        this.todaysFlights[i].knownIce=item.knownIce;
        this.todaysFlights[i].pilotAgree=item.pilotAgree;
        this.todaysFlights[i].dispatchRelease=item.dispatchRelease;
        this.todaysFlights[i].ocRelease=item.ocRelease;
        this.todaysFlights[i].releaseTimestamp=item.releaseTimestamp;
        this.todaysFlights[i].ocReleaseTimestamp=item.ocReleaseTimestamp;
        this.todaysFlights[i].dispatchReleaseTimestamp=item.dispatchReleaseTimestamp;
      }
    }
  }
  
  getUnofficial(metarObj){
    let c=metarObj.color;
    if (!metarObj.isOfficial&&metarObj.usingManual) return c+" unofficial";
    return c;
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
        //if (airportIndex>=airports.length-1) this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
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
    //this.timeout(()=>{
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
      this.spinner=false;
      angular.copy(filteredFlights,this.filteredFlights);
      return;
      if (filteredFlights.length===0) return;
      let scrollId;
      if (new Date().toLocaleDateString()!==this.dateString) scrollId=filteredFlights[0]._id;
      filteredFlights.forEach(flight=>{
        let fSplit=flight.departTimes[0].split(':');
        if (!scrollId&&fSplit.length===3&&new Date()<scrollDate.setHours(fSplit[0],fSplit[1],fSplit[2])) scrollId=flight._id;
      });
      if (!scrollId) scrollId=filteredFlights.at(-1)._id;
      //if (this.mobile) return;
      //this.$location.hash(scrollId);
      //this.anchorScroll.yOffset=500;
      //this.anchorScroll();
      console.log('auto scrolling');
      let element = document.getElementById(scrollId);
      console.log(element)
      if (element) element.scrollIntoView({ behavior: 'smooth' });
      //document.body.scrollTop = document.documentElement.scrollTop = 0;
    //},0);
  }
  
  fuelRequest(flight){
    if (!flight.pfr) return "WAITING ON PILOT";
    let response="FILL TO: "+(flight.pfr.legArray[0].fuel*1+flight.equipment.taxiFuel*1) + " LBS";
    if (flight.equipment.name==="Beech 1900"||flight.equipment.name==="King Air"){
      let fob=flight.fuelPreviouslyOnboard||flight.autoOnboard;
      let main=(flight.pfr.legArray[0].fuel*1+flight.equipment.taxiFuel*1-fob*1)/2;
      let gallons=Math.floor(main/6.7);
      if (gallons<0) response+=', DOUBLE CHECK FUEL REQUEST';
      else response +=", " + Math.floor(main/6.7) + " GALLONS/side";
    }
    else {
      response +=", " + Math.floor((flight.pfr.legArray[0].fuel*1+flight.equipment.taxiFuel*1)/2) + " LBS/side";
    }
    return response;
  }
  
  flightRiskClass(airportObjs){
    let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
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
    let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
    let color="airport-green";
    let tempColor="airport-green";
    //runway
    if (!metarObj.airport) return returnString+=' '+color;
    tempColor=this.returnColor({yellow:3,red:2},metarObj.airport.runwayScore,'above');
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //if (airport.name==='Gambell') console.log(airport);
    //possibly no metarObj
    if (!metarObj||!metarObj['Raw-Report']) {
      if (color!=='airport-red') {
        color='airport-blue';
      }
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
      if ((observation*1)<limitObj.orange) color="airport-orange";
      if ((observation*1)<limitObj.red) color="airport-pink";
    }
    else {
      if ((observation*1)>limitObj.yellow) color="airport-yellow";
      if ((observation*1)>limitObj.orange) color="airport-orange";
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
  
  airportClass(airport){
    let score=airport.runwayScore;
    let now=new Date();
    //if airport.timestamp is more than 10 hours old, return blue
    if (!airport.timestamp||!score) return 'airport-stripe';
    const tenHoursAgo = new Date(now.getTime() - (10 * 60 * 60 * 1000)); // 10 hours in milliseconds
    if (new Date(airport.timestamp) < tenHoursAgo) return 'airport-stripe';
    if (airport.openClosed==='Closed') return 'airport-pink';
    score=parseInt(score,10);
    //if (isNaN(score)) return "airport-green";
    if (score<=1) return "airport-pink";
    if (score===2) return "airport-yellow";
    return "airport-green";
  }
  
  getNextTAF(TAF){
    //console.log(TAF);
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
    let ap=JSON.parse(JSON.stringify(airport));
    if (!ap.openClosed) ap.openClosed="Open";
    if (!ap.contaminent) ap.contaminent="None";
    ap.signature=null;
    this.runwayModal(ap,this.user);
  }
  
  lookAtFlight(flight){
    try{
      if (!flight.fuelPreviouslyOnboard&&!isNaN(flight.autoOnboard)&&flight.autoOnboard>0) flight.fuelPreviouslyOnboard=Math.floor(flight.autoOnboard);
      if (!flight.fuelTotalTaxi&&flight.pfr&&flight.pfr.legArray&&flight.pfr.legArray[0]) flight.fuelTotalTaxi=flight.taxiFuel*1+flight.pfr.legArray[0].fuel*1;
      let lastname='';
      if (this.user.name&&this.user.name.split(' ').length>1) lastname=this.user.name.split(' ')[this.user.name.split(' ').length-1];
      if (flight.alternate){
        let i=this.alternateAirports.map(e=>e.icao).indexOf(flight.alternate);
        if (i>-1) flight.altObj=this.alternateAirports[i];
      }
      let duration=0;
      let times=[];
      let time1,time2;
      flight.departTimes.forEach((t,i)=>{
        let d=new Date();
        const [hours, minutes, seconds] = t.toString().split(':').map(Number);
        d.setHours(hours, minutes, seconds, 0);
        times.push(d);
        if (i>0) {
          time1=times[i-1].getTime();
          time2=times[i].getTime();
          duration+=((time2-time1)/(60*1000)-10);
        }
      });
      flight.duration=duration/60;
      flight.minFlightFuel=flight.equipment.fuelBurn*(flight.duration+0.5);
      if (!flight.alternate) flight.maxFlightFuel=flight.equipment.fuelBurn*(flight.duration+1.5);
      let calendarIndex=this.wholeRoster.map(e=>e.title).indexOf('OC');
      if (calendarIndex>-1) flight.ocName=this.wholeRoster[calendarIndex].employee_full_name;
      switch(flight.ocName){
        case 'David Olson':
          flight.ocNumber= '(907) 443-8985';
          break;
        case 'Fen Kinneen':
          flight.ocNumber= '(907) 304-1132';
          break;
        case 'Brian Weckwerth':
          flight.ocNumber= '(907) 750-5890';
          break;
      }
      if (flight.pfr) flight.pfr.legArray[0].operatingWeightEmpty=Math.round(flight.pfr.legArray[0].operatingWeightEmpty);
      if (flight.departTimes) flight.block=this.subtractTimes(flight.departTimes[flight.departTimes.length-1],flight.departTimes[0],flight.departTimes.length);
      let tks=0;
      if (flight.equipment.name==="Caravan") tks=20.8;
      if (flight.bew&&flight.bew.tks) tks=flight.bew.tks;
      let equipment=0;
      let acIndex=this.B190Configs.indexOf(flight.status);
      if (flight.equipment.name==="King Air") acIndex=this.BE20Configs.indexOf(flight.status);
      switch(flight.equipment.name){
        case "Caravan": equipment=69;
          break;
        case "King Air": 
          if (acIndex>-1) equipment=this.BE20Equipments[acIndex];
          break;
        case "Beech 1900":
          if (acIndex>-1) equipment=this.B190Equipments[acIndex];
          break;
        case "Casa": equipment=738;
          break;
        case "Sky Courier": equipment=0;
          break;
        default: equipment=69;
          break;
      }
      if (!flight.airplaneObj.tempBew) flight.airplaneObj.tempBew={};
      if (!flight.bew||!flight.bew.bew) flight.bew={fo:0,bew:flight.airplaneObj.tempBew.aircraftAsWeighed,equipment:equipment,tks:tks,captain:200,jumpseater:0,seatsRemoved:0,seatWeight:0};
      flight.bew.bew=flight.airplaneObj.tempBew.aircraftAsWeighed;
      if (!flight.pfr) flight.pfr={legArray:[{}]};
      let alts=angular.copy(this.alternateAirports);
      alts.shift({});
      if (!flight.jumpseaterObject) flight.jumpseaterObject={bodyWt:'0',bagWt:'0',reason:'No Reason'};
      console.log(flight);
      this.flightModal(JSON.parse(JSON.stringify(flight)),alts,this.Auth.isAdmin(),this.Auth.isSuperAdmin(),this.user,lastname,this.recentFlights);
    }
    catch(err){
      console.log(err);
      this.quickModal('Error Opening Flight!','Error!',true);
    }
  }  
  
  subtractTimes(time1, time2, arrLength) {
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);
  
    const totalSeconds1 = h1 * 3600 + m1 * 60 + s1;
    const totalSeconds2 = h2 * 3600 + m2 * 60 + s2;
  
    let differenceInSeconds = Math.abs(totalSeconds1 - totalSeconds2);
    if (arrLength>1) differenceInSeconds-=((arrLength-2)*10*60);
  
    const resultHours = Math.floor(differenceInSeconds / 3600);
    const resultMinutes = Math.floor((differenceInSeconds % 3600) / 60);
    const resultSeconds = differenceInSeconds % 60;
  
    const formattedHours = String(resultHours).padStart(2, '0');
    const formattedMinutes = String(resultMinutes).padStart(2, '0');
    const formattedSeconds = String(resultSeconds).padStart(2, '0');
  
    //return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    return `${formattedHours}+${formattedMinutes}`;
    
  }
  
  getDate(timestamp){
    if (!timestamp) return;
    return new Date(timestamp).toLocaleString();
  }
  
  editConfiguration(airplane){
    let index = this.airplanes.map(e => e._id).indexOf(airplane._id);
    if (!airplane.status) airplane.status=null;
    //let response=prompt("Enter the Configuration for " + airplane.registration,airplane.status);
    //if (airplane.status) {
      this.airplanes[index].status=airplane.status;
      this.http.patch('/api/airplanes/'+this.airplanes[index]._id,{status:airplane.status}).then(res=>{
        console.log(res.data);
      });
    //}
  }
  
  setPilotList(){
    if (!this.dateString||!this.base||!this.allPilots) return;
    let headerList=['OC','Night Medevac','Day Medevac','Med Phone','Captains','Copilots'];
    this.http.post('/api/calendar/rosterDay',{dateString:this.dateString}).then(res=>{
      this.pilotList=[];
      this.coPilotList=[];
      this.ocList=[];
      this.sortedPilots=[];
      this.wholeRoster=res.data;
      let basePilotRoster=res.data.filter(pilot=>{
        if (pilot.location_name) {
          pilot.position=pilot.location_name.split(' ')[1];
          pilot.location=pilot.location_name.split(' ')[0];
        }
        if (pilot.title==='OC'&&pilot.type==='shift'&&pilot.location!=="HELICOPTER") return true;
        if (this.base.base==="UNK") return pilot.position==='CAPT'||pilot.position==='FO';
        if (this.base.base==="OME") return pilot.location==='NOME'&&(pilot.position==='CAPT'||pilot.position==='FO');
        if (this.base.base==="OTZ") return pilot.location==='KOTZEBUE'&&(pilot.position==='CAPT'||pilot.position==='FO');
        return true;
      });
      console.log(basePilotRoster)
      for (let pilot of basePilotRoster){//pilot is the pilot object from acroroster
        let p;
        //if (pilot.employee_full_name==="Michael Evans") pilot.employee_full_name="Mike Evans";
        if (pilot.employee_full_name==="Sophia Hobbs") pilot.employee_full_name="Sophia Evans";
        //if (pilot.employee_full_name==="Mikey Evans") pilot.employee_full_name="Michael Evans";
        let index=this.allPilots.map(e=>e.firstName + ' ' + e.lastName).indexOf(pilot.employee_full_name);
        
        if (index<0){
          console.log(pilot.employee_full_name+' is not in the list of this.allPilots from firebase');
          continue;
        }
        else p=this.allPilots[index];//p is the pilot object from firebase
        let inBase=p.pilotBase===this.base.base;
        if (pilot.title==="OC") inBase=true;
        //UNK Base rules
        if (this.base.base==="UNK"&&this.todaysFlights) {
          this.todaysFlights.forEach(flight=>{
            if (!flight.pilotObject||flight.pilotObject.displayName!==p.displayName||flight.active==='false') return;
            let x=flight.airports.indexOf('Unalakleet');
            if (x>-1) inBase=true;
          });
        }
        //set up headers for sort order
        p.header='';
        p.code=pilot.title;
        if (inBase&&p) {
          if (p.code==='OC') p.header='OC';
          if (p.code==='NM') p.header='Night Medevac';
          if (p.code==='ND') p.header='Med Phone';
          if (p.code==='16') {
            if (p.far299Exp) p.header="Night Medevac";
            else p.header="Med Phone";
          }
          if (p.code==='DM') p.header='Day Medevac';
          if (p.far299Exp) {
            if (!p.header) p.header='Captains';
          }
          else {
            if (!p.header) p.header='Copilots';
          }
          this.sortedPilots.push(p);
        }
      }//end of for of loop
      this.sortedPilots.sort((a,b)=>{
        //if (!a.header) return -1;
        return headerList.indexOf(a.header)-headerList.indexOf(b.header)||new Date(a.dateOfHire)-new Date(b.dateOfHire)||a._id-b._id;
      });
      console.log(this.sortedPilots);
    })
    .catch(err=>{
      console.log(err);
      if (err.status===403) this.setPilotList();
    });
  }
  
  fixedWing(base){
    if (!this.base) return false;
    if (base) return base===this.base.base;
    else return this.base.base==="OME"||this.base.base==="OTZ"||this.base.base==="UNK";
  }
  
  getColumnFlights(){
    if (this.iPad) return "status-column-flights-ipad";
    if (this.mobile) return "status-column-flights-phone";
    return "status-column-flights";
  }
  
  getColumn(){
    if (this.iPad) return "status-column-ipad";
    if (this.mobile) return "status-column-phone";
    return "status-column";
  }
  
  getLayout(){
    if (this.iPad) return "layout-ipad";
    if (this.mobile) return "layout-phone";
    return "layout-OME";
    //if (this.base) return "layout-"+this.base.base;
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
    let baseTest;
    //this.allAircraft.forEach(aircraft=>{
    //  aircraft.assigned=false;
    //  if (!this.allTodaysFlights) return;
    //  let tf=angular.copy(this.allTodaysFlights.filter(f=>{return f.active==='true'}));
    //  let aircraftIndex=tf.map(e=>e.aircraft).indexOf(aircraft._id);
    //  if (aircraftIndex>-1) aircraft.assigned=true;
    //});
    this.displayedAircraft=this.allAircraft.filter(a=>{
      a.acftType=a.acftType.trim();
      if (a.acftType==="Sky Courier") a.acftType="Courier";
      baseTest=false;
      if (this.base.base==="HEL"||a.currentAirport===this.base.base) baseTest=true;
      if (this.base.base==="UNK"){
        if (this.todaysFlights) this.todaysFlights.forEach(flight=>{
          if (flight.aircraft!==a._id||flight.active==='false') return;
          let x=flight.airports.indexOf('Unalakleet');
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
    return;
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
    return;
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
      else {
        this.date=new Date();
        this.dateString=this.date.toLocaleDateString();
        this.timeout(()=>{
          this.setAvailableFlights();
        },100);
        return;
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
  
  recordAssessment(){
    return;
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
  
  laCalc(flight){
    if (!flight.pfr||!flight.pfr.legArray[0]) return;
    let mgtow=flight.pfr.legArray[0].mgtow*1;
    let owe=flight.pfr.legArray[0].operatingWeightEmpty*1;
    let fuel=flight.pfr.legArray[0].fuel*1;
    let tks=0;
    if (flight.pfr.legArray[0].tksGallons){
      tks=flight.pfr.legArray[0].tksGallons;
      if (flight.pfr.legArray[0].tksGallons>20.8) tks=20.8;
      tks=tks*9.2308;
    }
    return Math.round(mgtow-owe-fuel-tks);
  }
  
  getFlightNum(flight){
    if (flight.flightNum.length===3||flight.flightNum.length===4) return 'BRG'+flight.flightNum;
    if (flight.pfr&&flight.pfr.flightNumber) return 'BRG'+flight.pfr.flightNumber;
    return 'ID# ' +flight.flightNum;
  }
  
  getFlightColor(flight){
    if (flight.ocRelease&&flight.ocRelease!=="") return "oc";
    return;
  }
  
  renewFirebase(){
    //this.http.post('/api/airplanes/firebaseLimited',{collection:'flights',limit:51}).then(res=>{
    this.http.post('/api/airplanes/firebaseGrab').then(res=>{
      this.recentFlights=res.data.flights.filter(flight=>{
        return new Date(flight.dateString).toLocaleDateString()===new Date().toLocaleDateString();
        //return flight.legArray.at(-1).onTime;
      });
      //console.log(this.recentFlights.filter(a=>{return a.acftNumber==='N408BA'}));
    //});
    //this.http.post('/api/airplanes/firebase',{collection:'pilots'}).then(res=>{
      this.todaysFlights=this.filterTodaysFlights(this.todaysFlights);
      this.allPilots=res.data.pilots;
      window.allPilots=res.data.pilots;
      this.setPilotList();
      this.allAircraft=res.data.aircraft;
      this.timeout(()=>{this.setAirplaneList()},500);
      //this.setPilotList();
    //});
    //this.http.post('/api/airplanes/firebase',{collection:'aircraft'}).then(res=>{
    });
  }
  
  handleClick(evt,airport,source,flightId,routeIndex){
    if (source==='taf') {
      switch(evt.which) {
        case 1://left click
            let ap=JSON.parse(JSON.stringify(airport));
            if (!ap.openClosed) ap.openClosed="Open";
            if (!ap.contaminent) ap.contaminent="None";
            ap.signature=null;
            this.runwayModal(ap,this.user);
        break;
        case 2:
            // for middle click functionality
            break;
        case 3://right click
            if (airport.manualObs) {
              airport.manualObs.previousSignature=airport.manualObs.signature;
              airport.manualObs.signature=null;
            }
            this.weatherModal(airport,this.user);
            //this.tafDisplay('The TAF for ' +airport.name+' is:',airport.metarObj.taf);
            break;
        default:
            console.log("you have a strange mouse");
            break;
      }
    }
    if (source==='metar') {
      switch(evt.which) {
        case 3://right click
            console.log(airport);
            //if (!airport['Raw-Report']||!airport.Visibility||!airport.Ceiling||!airport.altimeter) {
            if (airport.airport.manualObs) {
              airport.airport.manualObs.previousSignature=airport.airport.manualObs.signature;
              airport.airport.manualObs.signature=null;
            }
              this.weatherModal(airport.airport,this.user);
            //}
            break;
        case 2:
            // for middle click functionality
            break;
        case 1://left click
            //this.tafDisplay('The METAR for ' +airport.airport.name+' is:',airport['Raw-Report']);
            //console.log(airport);
            //set wind color based on flight
            //airport.windColor=......, based on airport.aircraft
            //call airportModal
            airport.requestMetarList=undefined;
            airport.manualOpen=undefined;
            this.airportModal(airport);
            break;
        default:
            console.log("you have a strange mouse");
            break;
      }
    }
  }
  
  clickAirport(airport){
    airport.requestMetarList=undefined;
    airport.manualOpen=undefined;
    this.airportModal(airport);
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
    controllerAs: 'status',
    authenticate: 'user'
  });

})();