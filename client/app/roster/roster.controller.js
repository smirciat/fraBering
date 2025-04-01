'use strict';

(function(){

class RosterComponent {
  constructor($http,$state,$timeout,$scope,uiGridConstants,moment,Modal,socket) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.data=[];
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    this.gridOptions={rowHeight:22,
                      enableCellEditOnFocus:true,
                      //columnDefs: [
                      //{field:'name',minWidth:150},
                      //{field:'1'},
                      
                      //],
                      
                      data:this.data
    };
    
  }
  
  $onInit(){
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{//or '$root.nav...'
      if (!newVal||newVal==='') return;
      this.timeout(()=>{
        this.setDaysOfMonth();
        this.scope.nav.isCollapsed=true;
      //if (!oldVal||oldVal==='') return;
        this.dateString=newVal;
        this.date=new Date(this.dateString);
      },0);
    });
    this.http.post('/api/airplanes/firebaseGrab').then(res=>{
      this.pilots=res.data.pilots;
      this.http.get('/api/calendar').then(resp=>{
        console.log(resp.data);
        this.calendar=resp.data;
        console.log(this.calendarToData());
        this.socket.unsyncUpdates('calendar');
        this.socket.syncUpdates('calendar', this.calendar,(event,item,array)=>{
          this.calendar=array;
        });
      })
      .catch(err=>{console.log(err)});
    });
  }
  
  calendarToData(){
    this.data=[];//this.data will be an array of pilots with elements keyed by day of month (integer) and a code for that day, if it exists
    //iterate through pilots
    let pilots=angular.copy(this.pilots.filter(p=>{return p.isActive}));
    for (const pilot of pilots){
      for (const element of this.calendar){
        let calendarDate=new Date(element.date);
        if (this.date.getMonth() === calendarDate.getMonth() && this.date.getFullYear() === calendarDate.getFullYear()){
          const index=element.availablePilots.map(e=>e.name).indexOf(pilot.name);
          if (index>-1) pilot[element.day]=element.availablePilots[index].code;
        }
      }
    }
    this.gridOptions.data=pilots;
    return pilots;
  }
  
  setDaysOfMonth(){
    //set this.gridOptions.columnDefs
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    let columnDefs=[{field:'name'}];
    for (let x=1;x<=lastDay;x++){
      columnDefs.push({field:x.toString()});
    }
    this.gridOptions.columnDefs=columnDefs;
  }
}

angular.module('workspaceApp')
  .component('roster', {
    templateUrl: 'app/roster/roster.html',
    controller: RosterComponent,
    controllerAs: 'roster'
  });

})();
