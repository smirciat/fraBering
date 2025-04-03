'use strict';

(function(){

class RosterComponent {
  constructor($http,$state,$timeout,$scope,uiGridConstants,moment,Modal,socket) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.codes=['OC','A','DM','NM','ND','T','V','RA','RV','RO','RP','C8','C','SC','B','KA','B2','C2','SC2','F','IOE','OTZ'];
    //this.template='<div class="ui-grid-cell-contents" title="TOOLTIP">{{COL_FIELD}}</div>';
    this.template='<div class="ui-grid-cell-contents" title="TOOLTIP"><span ng-if="COL_FIELD!==\'B\'">{{COL_FIELD}}</span><i ng-if="COL_FIELD===\'B\'" class="fa fa-solid fa-umbrella-beach fa-autosize"></i></div>';
    this.data=[];
    this.date=new Date();
    this.dateString=this.date.toLocaleDateString();
    this.gridOptions={rowHeight:22,
                      enableSorting: false,
                      enableGridMenu: false,
                      //enableCellEditOnFocus:true,
                      //columnDefs: [
                      //{field:'name',minWidth:150},
                      //{field:'1'},
                      
                      //],
                      
                      data:this.data
    };
    
  }
  
  $onInit(){
    this.scope.$watch('nav.base',(newVal,oldVal)=>{
      if (!newVal||newVal==='') return;
      if (!oldVal||oldVal==='') return;
      this.spinner=true;
      this.scope.nav.isCollapsed=true;
      this.init();
    });
    this.scope.$watch('nav.dateString',(newVal,oldVal)=>{//or '$root.nav...'
      if (!newVal||newVal==='') return;
      this.spinner=true;
      this.timeout(()=>{
        this.scope.nav.isCollapsed=true;
        this.dateString=newVal;
        this.date=new Date(this.dateString);
        this.init();
      },0);
    });
  }
  
  init(){
    this.setDaysOfMonth();
    this.http.post('/api/airplanes/firebaseGrab').then(res=>{
      this.pilots=res.data.pilots.filter(pilot=>{return pilot.pilotBase===this.scope.nav.base.base});
      this.pilots.sort((a,b)=>{
        if (!a.far299Exp&&b.far299Exp) return 1;
        if (!b.far299Exp&&a.far299Exp) return -1;
        return new Date(a.dateOfHire)-new Date(b.dateOfHire)||a._id-b._id;
        
      });//a.dateOfHire.localeCompare(b.dateOfHire)});
      this.http.post('/api/calendar/month',{date:this.date}).then(resp=>{
        this.calendar=resp.data;
        this.calendarToData();
        this.spinner=false;
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
          if (index>-1) {
            if (element.availablePilots[index].code==="8") element.availablePilots[index].code="C8";
            if (element.availablePilots[index].code==="16") {
              if (pilot.far299Exp) element.availablePilots[index].code="NM";
              else element.availablePilots[index].code="ND";
            }
            pilot[element.day]=element.availablePilots[index].code;
          }
        }
      }
    }
    this.gridOptions.data=pilots;
    return pilots;
  }
  
  setDaysOfMonth(){
    //set this.gridOptions.columnDefs
    const lastDay=new Date(this.date.getFullYear(), this.date.getMonth()+1, 0).getDate();
    let columnDefs=[{name:'Name',field:'displayName',minWidth:150}];
    for (let x=1;x<=lastDay;x++){
      //if (x==='B') 
      //template=this.templateVacation;
      columnDefs.push({field:x.toString(),cellTemplate:this.template,cellClass:this.cellClass});
    }
    this.gridOptions.columnDefs=columnDefs;
  }

  cellClass(grid, row, col, rowRenderIndex, colRenderIndex) {
    if (grid) {
      if (!grid.getCellValue(row,col)||grid.getCellValue(row,col)==="") return;
      return grid.getCellValue(row,col);
    }
  }
}

angular.module('workspaceApp')
  .component('roster', {
    templateUrl: 'app/roster/roster.html',
    controller: RosterComponent,
    controllerAs: 'roster'
  });

})();
