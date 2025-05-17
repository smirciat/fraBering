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
    this.flights=[];
    this.base="Nome";
    this.bases=["Nome","Kotzebue","Unalakleet"];
    $scope.$on('$destroy', function() {
        socket.unsyncUpdates('todaysFlight');
    });
  }
  
  $onInit(){
    let temp=window.localStorage.getItem('myBase');
    if (temp) this.base=temp;
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
  
  getFontColor(depart,arrive){
    if (arrive) return {"color":"purple"};
    if (depart) return {"color":"green"};
  }
}

angular.module('workspaceApp')
  .component('public', {
    templateUrl: 'app/public/public.html',
    controller: PublicComponent,
    controllerAs: 'public'
  });

})();
