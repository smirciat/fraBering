'use strict';

(function(){

class PublicComponent {
  constructor($http,$scope,$interval,$timeout,socket) {
    this.http=$http;
    this.scope=$scope;
    this.interval=$interval;
    this.timeout=$timeout;
    this.socket=socket;
    this.shouldInvert=true;
    this.date=new Date().toLocaleDateString();
    this.timeString=new Date().toLocaleTimeString('en-US',{timeStyle:'short',timeZone:'America/Anchorage'});
    this.dateString=new Date().toLocaleDateString('en-US', { weekday: 'long', year:'numeric',month:'long',day:'numeric' }).toUpperCase();
    this.flights=[];
    this.base="Nome";
    this.bases=["Nome","Kotzebue","Unalakleet"];
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('todaysFlight');
    });
  }
  
  $onInit(){
    this.interval(()=>{this.timeString=new Date().toLocaleTimeString('en-US',{timeStyle:'short',timeZone:'America/Anchorage'});},10*1000);
    let temp=window.localStorage.getItem('myBase');
    if (temp) this.base=temp;
    this.width=document.documentElement.clientWidth;
    console.log(this.width)
    this.http.post('/api/todaysFlights/dayFlights',{dateString:this.date}).then(res=>{
      //this.allFlights=res.data;
      this.filterFlights(res.data);
      this.sort();
      this.socket.unsyncUpdates('todaysFlight');
      this.socket.syncUpdates('todaysFlight', this.allFlights,(event,item,array)=>{
        //this.allFlights=array;
        this.filterFlights(array);
        if (item.runScroll) this.sort();
      });
    });
  }
  
  filterFlights(flights){
    this.allFlights=flights.filter(flight=>{
      if (!flight.flightNum) return false;
      let f=flight.flightNum.toString();
      let char=f.substring(0,1);
      if (!Number.isInteger(char*1)) return false;
      return f.length===3&&(char*1)%2===0;
    });
  }
  
  sort(){
    window.localStorage.setItem('myBase',this.base);
    this.flights=this.allFlights.filter(flight=>{
      let match=false;
      flight.airports.forEach(a=>{
        if (a===this.base) match=true;
      });
      return match&&flight.active==="true"&&flight.date===new Date().toLocaleDateString();
    });
    
    //return flights.sort((a,b)=>{
    //  return a.
    //});
  }
  
  arrayToString(array){
    let str='';
    array.forEach((e,i)=>{
      str+=e;
      if (i<array.length-1) str+=', ';
    });
    return str.toUpperCase();
  }
  
  getStatusColor(flight){
    let depart=flight.tfliteDepart;
    let arrive=flight.pfr.legArray[flight.pfr.legArray.length-1].onTimeString;
    let bigSize=this.calcFontSize(30,1.5);
    if (flight.flightStatus==="Boarded") return {"color":"green","font-size":bigSize+"px"};
    if (arrive) return {"color":"purple"};
    if (depart) return {"color":"green"};
  }
  
  getFontColor(status){
    if (status!=="Boarded") return 'public-inverted'; 
  }
  
  getFontSize=function(num,kind,mult){
    num=num||20;
    num=this.calcFontSize(num,mult);
    let altnum=Math.round(3.5*this.width/72);
    altnum=altnum+'px';
    let val=num.toString()+'px';//+kind;
    if (mult===1.5) return {"font-weight":"bold","font-size":val,"height":altnum,"line-height":altnum};
    return {"font-weight":"bold","font-size":val};
  }
  
  calcFontSize(num,mult){
    mult=mult||1;
    return Math.round(mult*this.width/72);
  }
  
  getKingAir(){
    if (this.width>=1912) return "assets/images/kingair-big.png";
    return "assets/images/kingair.png";
  }
  
  background(flight){
    if (flight.flightStatus==='WX Delay'||flight.flightStatus==='Delayed') return 'public-delayed';
    if (flight.flightStatus==='Boarded') return 'public-boarding';
    if (flight.tfliteDeparture) return 'public-departed';
    return 'public-normal';
  }
  
  isLineThrough(flight){
    let str='';
    if (flight.flightStatus!=="Boarded") str+= 'public-inverted '; 
    if (flight.tfliteDepart) str+= ' public-linethrough';
    return str;
  }
  
  getFlightStatus(status){
    if (status==='Boarded') return 'Boarding';
    if (!status) return 'On Time';
    return status;
  }
}

angular.module('workspaceApp')
  .component('public', {
    templateUrl: 'app/public/public.html',
    controller: PublicComponent,
    controllerAs: 'public'
  });

})();
