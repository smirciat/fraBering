'use strict';

(function(){

class RosterComponent {
  constructor($http,$state,$timeout,$scope,uiGridConstants,moment,Modal,socket) {
    this.http=$http;
    this.scope=$scope;
    this.timeout=$timeout;
    this.socket=socket;
    this.dutyCodes=['A','DM','IOE','8','KA','B1','B2','C1','C2','S1','S2','F','OTZ'];
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
    //this.http.post('/api/calendar/rosterMonth').then(res=>{console.log(res.data)});
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
      this.dateString=newVal;
      this.date=new Date(this.dateString);
      this.timeout(()=>{
        this.scope.nav.isCollapsed=true;
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
      this.http.post('/api/calendar/rosterMonth',{date:this.date}).then(resp=>{
        let arr=resp.data.filter(r=>{
          if (!r.location_name) return false;
          let a=r.location_name.split(' ');
          if (a.length<2) return false;
          return (a[1]==='FO'||a[1]==='CAPT');//&&r.type==='shift';
        });
        console.log(arr.filter(p=>{return p.employee_full_name==='Mikey Evans'}))
        let calendar=this.initCalendar(this.date);
        calendar.forEach(day=>{
          day.availablePilots=arr.filter(pilot=>{
            if (!pilot.start_plain_date_time||!day.dateObj) return false;
            return pilot.start_plain_date_time.split('T')[0]===day.dateObj.split('T')[0];
          });
        });
        this.calendarToData(calendar);
      });
    });
  }
  
  calendarToData(calendar){
    this.data=[];//this.data will be an array of pilots with elements keyed by day of month (integer) and a code for that day, if it exists
    //iterate through pilots
    let pilots=angular.copy(this.pilots.filter(p=>{return p.isActive}));
    for (const pilot of pilots){
      for (const element of calendar){
        let totalCaptOME=0;
        let totalCaptOTZ=0;
        let totalFOOME=0;
        let totalFOOTZ=0;
        element.availablePilots.forEach(pilot=>{
          //if (pilot.employee_full_name==="Michael Evans") pilot.employee_full_name="Mike Evans";
          if (pilot.employee_full_name==="Sophia Hobbs") pilot.employee_full_name="Sophia Evans";
          //if (pilot.employee_full_name==="Mikey Evans") pilot.employee_full_name="Michael Evans";
          let arr=pilot.location_name.split(' ');
          let location=arr[0];
          let position=arr[1];
          if (location=='NOME'){
            if (position==='CAPT'&&this.dutyCodes.indexOf(pilot.label)>-1) totalCaptOME++;
            if (position==='FO'&&this.dutyCodes.indexOf(pilot.label)>-1) totalFOOME++;
          }
          if (location=='NOME'){
            if (position==='CAPT'&&this.dutyCodes.indexOf(pilot.label)>-1) totalCaptOTZ++;
          }
        });
        element.totalCaptOME=totalCaptOME;
        element.totalFOOME=totalFOOME;
        element.totalCaptOTZ=totalCaptOTZ;
        element.totalFOOTZ=totalFOOTZ;
        let calendarDate=new Date(element.date);
        if (this.date.getMonth() === calendarDate.getMonth() && this.date.getFullYear() === calendarDate.getFullYear()){
          //const index=element.availablePilots.map(e=>e.name).indexOf(pilot.name);
          const index=element.availablePilots.map(e=>e.employee_full_name).indexOf(pilot.firstName+' '+pilot.lastName);
          if (index>-1) {
            if (element.availablePilots[index].label==="8") element.availablePilots[index].label="C8";
            if (element.availablePilots[index].label==="16") {
              if (pilot.far299Exp) element.availablePilots[index].label="NM";
              else element.availablePilots[index].label="ND";
            }
            pilot[element.day]=element.availablePilots[index].label;
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
  
  initCalendar(date){
    let arr=[{}];
    date=new Date(date);
    let year=date.getFullYear();
    let month=date.getMonth();
    let lastDay = new Date(year, month + 1, 0);
    for (let x=1;x<=lastDay.getDate();x++){
      let d=new Date(year,month,x);
      let utcD=new Date(year,month,x);
      utcD.setUTCHours(0, 0, 0, 0);
      arr[x]={date:d.toLocaleDateString(),
                dateObj: utcD.toISOString(),
                day: x,
                availablePilots: [],
                totalCaptOME:0,
                totalFOOME:0,
                totalCaptOTZ:0,
                totalFOOTZ:0
      };
    }
    return arr;
  }
}

angular.module('workspaceApp')
  .component('roster', {
    templateUrl: 'app/roster/roster.html',
    controller: RosterComponent,
    controllerAs: 'roster'
  });

})();
