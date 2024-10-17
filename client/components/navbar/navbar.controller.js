'use strict';

class NavbarController {
  //start-non-standard
  menu = [{
    'title': 'Home',
    'state': 'main'
  }];

  isCollapsed = true;
  //end-non-standard

  constructor(Auth,$interval,$http,$scope) {
    this.isLoggedIn = Auth.isLoggedIn;
    this.isAdmin = Auth.isAdmin;
    this.hasRole = Auth.hasRole;
    this.getCurrentUser = Auth.getCurrentUser;
    this.interval=$interval;
    this.http=$http;
    this.scope=$scope;
    this.bases=[{base:"OME",four:"PAOM"},{base:"OTZ",four:"PAOT"},{base:"HEL",four:"HELI"}];
    this.base=this.bases[0];
    window.base=this.base;
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    window.dateString=this.dateString;
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
  }

  minusDate(){
    this.date.setDate(this.date.getDate() - 1);
    this.dateString=this.date.toLocaleDateString();
    window.dateString=this.dateString;
  }
  
  plusDate() {
    this.date.setDate(this.date.getDate() + 1);
    this.dateString=this.date.toLocaleDateString();
    window.dateString=this.dateString;
  }
  
  upDate(){
    this.date=new Date(this.dateString);
    this.dateString=this.date.toLocaleDateString();
  }
  
  updateBase(){
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
            if (pilotArr[x+2]&&pilotArr[x+2]!=='T'&&pilotArr[x+2].toUpperCase()!=='V') this.calendar[x].availablePilots.push({code:pilotArr[x+2],name:first + ' ' + last,pilotBase:window.allPilots[index].pilotBase});
          }
        }
      });
      this.http.get('/api/calendar').then(res=>{
        let existing=res.data;
        let index;
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
}

angular.module('workspaceApp')
  .controller('NavbarController', NavbarController);
