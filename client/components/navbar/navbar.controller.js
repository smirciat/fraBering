'use strict';

class NavbarController {
  //start-non-standard
  menu = [{
    'title': 'Home',
    'state': 'status'
  },
  {
    'title': 'Other',
    'state': 'main'
  },
  ];

  isCollapsed = true;
  //end-non-standard

  constructor(Auth,$interval,$http,$scope,$timeout,$window) {
    this.Auth=Auth;
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.hasRole = Auth.hasRole;
    this.getCurrentUser = Auth.getCurrentUser;
    this.interval=$interval;
    this.http=$http;
    this.scope=$scope;
    this.window=$window;
    this.timeout=$timeout;
    this.bases=[{base:"OME",four:"PAOM"},{base:"OTZ",four:"PAOT"},{base:"UNK",four:"PAUN"},{base:"HEL",four:"HELI"}];
    //this.base=this.bases[0];
    //window.base=this.base;
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    this.dateStringFormatted=this.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'numeric',//''long', 
        day: 'numeric' 
    });
    //this.isToggleAssigned=true;
    //window.toggleAssigned=true;
    this.pairs=[{v:'ST MICHAEL',c:'PAMK'},
               {v:'NOME',c:'PAOM'},
               {v:'SHISHMAREF',C:'PASH'},
               {v:'WALES',c:'PAIW'},
               {v:'TIN CITY',c:'PATC'},
               {v:'BREVIG',c:'PFKT'},
               {v:'TELLER',c:'PATE'},
               {v:'WT MOUNTAIN',c:'PAWM'},
               {v:'GOLOVIN',c:'PAGL'},
               {v:'ELIM',c:'PFEL'},
               {v:'KOYUK',c:'PAKK'},
               {v:'SHAKTOOLIK',c:'PFSH'},
               {v:'UNALAKLEET',c:'PAUN'},
               {v:'STEBBINS',c:'WBB'},
               {v:'SAVOONGA',c:'PASA'},
               {v:'GAMBELL',c:'PAGM'},
               {v:'POINT HOPE',c:'PAPO'},
               {v:'C. LISBURNE',c:'PALU'},
               {v:'KIVALINA',c:'PAVL'},
               {v:'NOATAK',c:'PAWN'},
               {v:'KOTZEBUE',c:'PAOT'},
               {v:'NOORVIK',c:'PFNO'},
               {v:'KIANA',c:'PAIK'},
               {v:'SELAWIK',c:'PASK'},
               {v:'AMBLER',c:'PAFM'},
               {v:'SHUNGNAK',c:'PAGH'},
               {v:'KOBUK',c:'PAOB'},
               {v:'BUCKLAND',c:'PABL'},
               {v:'DEERING',c:'PADE'}
    ];
  }
  
  $onInit() {
    if (window.localStorage.getItem('baseIndex')!==null&&window.localStorage.getItem('baseIndex')!=='undefined') this.base=this.bases[window.localStorage.getItem('baseIndex')];
    else this.base=this.bases[0];
    window.base=this.base;
    window.dateString=this.dateString;
    if (window.stoppedInterval) this.interval.cancel(window.stoppedInterval);
    window.stoppedInterval=this.interval(()=>{
      this.stoppedFunction();
    },1*60*1000);
    this.timeout(()=>{this.stoppedFunction()},200);
    this.interval(()=>{
      const hour=new Date().getHours();
      if (hour===1||hour===2) {
        this.date=new Date();
        this.dateString=this.date.toLocaleDateString();
        window.dateString=this.dateString;
      }
    },60*60*1000);
    this.dateString=this.date.toLocaleDateString();
    this.myInterval=this.interval(()=>{
      let fileWatch;
      let d=document.getElementById('file');
      if (d) fileWatch=d.files;
      if (fileWatch&&fileWatch.length>0) {
        this.fileExists=true;
        this.interval.cancel(this.myInterval);
      }
    },1000);
    //this.scope.$watch('status.toggleAssigned',(newVal,oldVal)=>{
      //this.isToggleAssigned=newVal;
    //});
  }
  
  stoppedFunction(){
    let version='18';
    this.http.post('/api/todaysFlights/stopped'+version).then(res=>{
      window.localStorage.setItem('stopped','true');
      console.log('Stopped Value ('+version+') is '+res.data.stopped);
      if (res.data.stopped) {
        window.stopped=true;
        this.scope.$apply;
        //if (!this.clicked) this.quickModal('The Takeflite Flight Summary report, which should automatically update every 3 minutes, has stopped.  Flight information may not be current until this is resolved.');
      } 
      else {
        this.clicked=undefined;
        window.stopped=undefined;         
      }
    })
    .catch(err=>{
      console.log(err);
      if (window.localStorage.getItem('stopped')==='true'&&(err.status===403||err.status===404)) {
        window.localStorage.setItem('stopped','false');
        this.window.location.reload();
      }
      window.localStorage.setItem('stopped','false');
    });
  }

  minusDate(){
    //this.isCollapsed=true;
    this.date.setDate(this.date.getDate() - 1);
    this.dateString=this.date.toLocaleDateString();
    this.dateStringFormatted=this.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'numeric',//''long', 
        day: 'numeric' 
    });
    window.dateString=this.dateString;
  }
  
  plusDate() {
    //this.isCollapsed=true;
    this.date.setDate(this.date.getDate() + 1);
    this.dateString=this.date.toLocaleDateString();
    this.dateStringFormatted=this.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'numeric',//''long', 
        day: 'numeric' 
    });
    window.dateString=this.dateString;
  }
  
  upDate(key){
    //this.isCollapsed=true;
    if (key==='string') this.date=new Date(this.dateStringFormatted);
    this.dateString=this.date.toLocaleDateString();
    this.dateStringFormatted=this.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'numeric',//''long', 
        day: 'numeric' 
    });
    window.dateString=this.dateString;
  }
  
  updateBase(){
    //this.isCollapsed=true;
    let index=this.bases.map(e => e.base).indexOf(this.base.base);
    if (index>-1) window.localStorage.setItem('baseIndex',index);
    window.base=this.base;
  }
  
  convertToAirport(string){
    for (let x=0;x<this.pairs.length;x++){
      string=string.replaceAll(this.pairs[x].v,this.pairs[x].c);
    }
    return string;
  }
  
  uploadCSVTemp(){
    let inputFile=document.getElementById('file');
    let f = inputFile.files[0];
    let r = new FileReader();
    let flights=[];
    let flight={};
    r.onloadend = e=>{
      //file is e.target.result
      let csv = e.target.result;
      csv=csv.replace(/(?:\\[rn"]|[\r\n\"]+)+/g, ",");
      let arr=csv.split(',');
      console.log(arr);
      let string="";
      let space,stringArr;
      outerLoop : for (let x=0;x<arr.length;x++){
        //terminate loop at specified value
        if (arr[x]==="NOME & UNALAKLEET FLIGHT FINDER") {
          x=arr.length;
          continue outerLoop;
        }
        //check if null or blank
        if (!arr[x]||arr[x]==="") continue outerLoop;
        //check if arr[x] is a flight number
        if (!isNaN(+parseInt(arr[x],10))&&arr[x].length===3){
          //&&!flight.flightNum) {
          //process string
          //console.log(string);
          string=this.convertToAirport(string);
          stringArr=string.split(' ');
          stringArr=stringArr.filter(str=>{
            return str;
          });
          //console.log(stringArr);
          let origin,destination,depTime,arrTime;
          innerLoop : for (let y=0;y<stringArr.length;y++){
            if (stringArr[y]==="MAY"||stringArr[y]==="TNC"||stringArr[y]==="Flagstops") {
              y=stringArr.length;
              continue innerLoop;
            }
            if (stringArr[y]==='-') y++;
            let index=this.pairs.map(e => e.c).indexOf(stringArr[y]);
            if (index>-1) {
              if (origin) destination=stringArr[y];
              else origin=stringArr[y];
            }
            else{
              //turn string into xx:xx:xx time string format
              let timeString=stringArr[y];
              if (timeString.length===4) timeString='0'+timeString;
              let hours=parseInt(timeString.substring(0,2),10);
              let minutes=parseInt(timeString.substring(2,4),10);
              if (minutes<10) minutes='0'+minutes;
              if (timeString.slice(-1)==="P"&&hours!==12) hours+=12;
              if (hours<10) hours='0'+hours;
              if (isNaN(hours)) hours="00";
              if (isNaN(minutes)) minutes="00";
              timeString=hours+':'+minutes+':00';
              if (depTime) {
                arrTime=timeString;
              }
              else {
                depTime=timeString;
              }
            }
            if (origin&&destination&&depTime&&arrTime) {
              flight.airports.push(origin);
              flight.departTimes.push(depTime);
              if (y===stringArr.length-1){
                flight.airports.push(destination);
                flight.departTimes.push(arrTime);
              }
              origin=destination=depTime=arrTime=undefined;
            }
          }
          if (string&&string!=="") {
            flights.push(flight);
            //if flight number exists, update, otherwise post new one
            let i=window.flightSchedule.map(e => e.flightNum).indexOf(flight.flightNum);
            
            if (i<0&&flight.flightNum!=='805'&&flight.flightNum!=='605'){
              this.http.post('/api/flights',flight).then(res=>{console.log(res.data)}).catch(err=>{
                console.log(flight);
                console.log(err);
              });
            }
            else if (flight.flightNum!=='805'&&flight.flightNum!=='605'){
              this.http.patch('/api/flights/'+window.flightSchedule[i]._id,flight).then(res=>{console.log(res.data)}).catch(err=>{
                console.log(flight);
                console.log(err);
              });
            }
          }
          //reset string
          string="";
          flight={flightNum:arr[x],daysOfWeek:[1,2,3,4,5],airports:[],departTimes:[]};
          continue outerLoop;
        }
        //check if there is a flight currently in the works
        if (flight.flightNum){
          //test if flight details string
          //if (arr[x].substring(0,4)==='NOME'||arr[x].substring(0,4)==='UNAL'||arr[x].substring(0,4)==='KOTZ'){
            //parse string into flight info
            if (string) space=" ";
            else space="";
            string+=space + arr[x];
            //console.log(flight.flightNum + ' - ' + arr[x]);
            //finish recording this flight information
            
          //}
        }
      }
      console.log(flights);
      
    };
    r.readAsText(f);
    inputFile.value='';
    this.fileExists=false;
  }
  
  //create users for a list of people with email addresses
  uploadCSVUsers(){
    let inputFile=document.getElementById('file');
    let f = inputFile.files[0];
    let r = new FileReader();
    r.onloadend = e=>{
      //file is e.target.result
      let csv = e.target.result;
      //csv=csv.replace(/(?:\\[rn"]|[\r\n\"]+)+/g, ",");
      let arr=csv.split('\r\n');
      let headers=arr.shift().split(',');
      let pilots=[];
      arr.forEach(a=>{
        a=a.split(',');
        let obj={};
        headers.forEach((h,i)=>{
          obj[h]=a[i];
        });
       pilots.push(obj);
      });
      for (let pilot of pilots) {
        
        this.Auth.createUser({
          name: pilot['First Name'] + ' ' + pilot['Last Name'],
          email: pilot.Username,
          password: 'N45052$$'
        })
        .then(function() {
          console.log('Succcessfully created for' +  pilot.Username);
          // Account created, redirect to home
          //self.$state.go('status');
        })
        .catch(function(err) {
          err = err.data;
          console.log(err);
          self.errors = {};

          // Update validity of form fields that match the sequelize errors
          if (err.name) {
            angular.forEach(err.fields, function(field) {
              form[field].$setValidity('mongoose', false);
              this.errors[field] = err.message;
            });
          }
        });
      }
      
      
      
    };
    r.readAsText(f);
    inputFile.value='';
    this.fileExists=false;
  }
  
  //create users for a list of people with email addresses
  uploadBewCSV(){
    let inputFile=document.getElementById('file');
    let f = inputFile.files[0];
    let r = new FileReader();
    r.onloadend = e=>{
      //file is e.target.result
      let csv = e.target.result;
      //csv=csv.replace(/(?:\\[rn"]|[\r\n\"]+)+/g, ",");
      let arr=csv.split('\r\n');
      let headers=arr.shift().split(',');
      let airplanes=[];
      arr.forEach(a=>{
        a=a.split(',');
        let obj={};
        headers.forEach((h,i)=>{
          obj[h]=a[i];
        });
       airplanes.push(obj);
      });
      for (let airplane of airplanes) {
        let doc={_id:airplane._id,tempBew:airplane};
        this.http.post('/api/airplanes/updateFirebaseNew',{collection:'aircraft',doc:doc}).then(res=>{
          
        console.log(res.data);
          
        });
        
      }
    };
    r.readAsText(f);
    inputFile.value='';
    this.fileExists=false;
  }
  
  uploadCSVParams(){
    let inputFile=document.getElementById('file');
    let f = inputFile.files[0];
    let r = new FileReader();
    let flights=[];
    let flight={};
    r.onloadend = e=>{
      //file is e.target.result
      let csv = e.target.result;
      //csv=csv.replace(/(?:\\[rn"]|[\r\n\"]+)+/g, ",");
      let arr=csv.split('\r\n');
      let headers=arr.shift().split(',');
      let airports=[];
      arr.forEach(a=>{
        a=a.split(',');
        let obj={};
        headers.forEach((h,i)=>{
          obj[h]=a[i];
        });
        airports.push(obj);
      });
      airports.forEach((ap,i)=>{
        let obj={};
        obj._id=ap._id;
        obj.ceilingRequirement={red:ap['ceiling red'],yellow:ap['ceiling yellow'],orange:ap['ceiling orange']};
        obj.visibilityRequirement={red:ap['visibility red'],yellow:ap['visibility yellow'],orange:ap['visibility orange']};
        obj.specialWind={directionLow:ap['Special Wind Quadrant Start'],directionHigh:ap['Special Wind Quadrant End'],reduction:ap['Special Wind Speed Reduction']};
        this.http.patch('/api/airportRequirements/'+obj._id,obj).then(res=>{
          console.log('success for ' + obj._id);
        });
      });
      console.log(airports);
      
      
    };
    r.readAsText(f);
    inputFile.value='';
    this.fileExists=false;
  }
  
  uploadCSV(){
    let months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let inputFile=document.getElementById('file');
    let f = inputFile.files[0];
    let r = new FileReader();
    r.onloadend = e=>{
      //file is e.target.result
      let csv = e.target.result;
      let arr=csv.split('\r\n');
      let header=arr.shift().split(',');
      header[0]+=' '+header[7];
      let headerArr=header[0].split(' ');
      let month,year,first,last,pilotArr,index,lastDay,monthNumber,date;
      headerArr.every(el=>{
        if (typeof parseInt(el,10)==="number"&&!isNaN(parseInt(el,10))) year=el;
        let monthPartOfInput = el.substring(0, 3).toLowerCase(); 
        if (months.indexOf(monthPartOfInput) >= 0) month=el;
        if (month&&year) return false;
        return true;
      });
      if (month&&year){
        this.calendar=[];
        date=new Date(month +  '  ' + year);
        monthNumber=date.getMonth();
        lastDay=new Date(year, monthNumber+1, 0).getDate();
        for (let x=0;x<lastDay;x++) {
          this.calendar.push({date:new Date(year,monthNumber,x+1).toLocaleDateString(),day:x+1,availablePilots:[]});
        }
      }
      arr.forEach(pilotString=>{
        first=last='';
        pilotArr=pilotString.split(',');
        if (pilotArr[1]) first=pilotArr[1].replace('"','').replace(' ','');
        if (pilotArr[0]) last=pilotArr[0].replace('"','').replace(' ','');
        index = window.allPilots.map(e => e.name).indexOf(first + ' ' + last);
        if (index>-1) {
          for (let x=0;x<lastDay;x++){
            if (pilotArr[x+2]&&pilotArr[x+2]!=='T'&&pilotArr[x+2].toUpperCase()!=='V'&&pilotArr[x+2].toUpperCase()!=='OFF') this.calendar[x].availablePilots.push({code:pilotArr[x+2],name:first + ' ' + last,pilotBase:window.allPilots[index].pilotBase});
          }
        }
      });
      this.http.get('/api/calendar').then(res=>{
        let existing=res.data;
        let index;
        console.log(this.calendar);
        this.calendar.forEach(day=>{
          index = existing.map(e => e.date).indexOf(day.date);
          if (index<0) {//day does not yet exist in the collection
            this.http.post('/api/calendar',day);
          }
          else {//day exists in the collection
            existing[index].availablePilots=day.availablePilots;
            this.http.patch('/api/calendar/'+existing[index]._id,existing[index]);
          }
        });
      });
      //this.http.post('/api/calendar/month',this.calendar);
    };
    r.readAsText(f);
    inputFile.value='';
    this.fileExists=false;
    
  }
  
  buttonClass(toggle){
    if (toggle) return 'airport-green';
    return 'airport-pink';
  }
  
  toggle(){
    window.toggle=!window.toggle;
    this.isToggle=window.toggle;
  }
  
  toggleAssigned(){
    window.toggleAssigned=!window.toggleAssigned;
    this.isToggleAssigned=window.toggleAssigned;
  }
  
  showHide(bool){
    if (bool) return "Hide";
    return "Show";
  }
  
  stoppedClass(stopped){
    if (window.stopped) return 'airport-purple';
  }
}

angular.module('workspaceApp')
  .controller('NavbarController', NavbarController);
