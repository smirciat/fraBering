'use strict';

(function(){

class PublicComponent {
  constructor($http,$scope,$interval,$timeout,socket) {
    this.http=$http;
    this.scope=$scope;
    this.interval=$interval;
    this.timeout=$timeout;
    this.socket=socket;
    this.date=new Date().toLocaleDateString();
    this.timeString=new Date().toLocaleTimeString('en-US',{timeStyle:'short'});
    this.dateString=new Date().toLocaleDateString('en-US', { weekday: 'long', year:'numeric',month:'long',day:'numeric' }).toUpperCase();
    this.flights=[];
    this.base="Nome";
    this.bases=["Nome","Kotzebue","Unalakleet"];
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('todaysFlight');
    });
  }
  
  $onInit(){
    this.interval(()=>{this.timeString=new Date().toLocaleTimeString('en-US',{timeStyle:'short'});},60*1000);
    let temp=window.localStorage.getItem('myBase');
    if (temp) this.base=temp;
    this.width=document.documentElement.clientWidth;
    this.http.post('/api/todaysFlights/dayFlights',{dateString:this.date}).then(res=>{
      this.allFlights=res.data;
      this.sort();
      this.socket.unsyncUpdates('todaysFlight');
      this.socket.syncUpdates('todaysFlight', this.allFlights,(event,item,array)=>{
        this.allFlights=array;
        if (item.runScroll) this.sort();
      });
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
  
  getFontColor(depart,arrive){
    if (arrive) return {"color":"purple"};
    if (depart) return {"color":"green"};
  }
  
  getFontSize=function(num,kind){
    if (this.width<768) num=Math.floor(num/2);
    let val=num.toString()+kind;
    return {"font-weight":"bold","font-size":val};
  }
  
  background(flight){
    if (flight.flightStatus==='Boarding') return 'public-boarding';
    if (flight.tfliteDeparture) return 'public-departed';
    return 'public-normal';
  }
  
  isLineThrough(bool){
    if (bool) return 'public-linethrough';
  }
}

angular.module('workspaceApp')
  .component('public', {
    templateUrl: 'app/public/public.html',
    controller: PublicComponent,
    controllerAs: 'public'
  });

})();
