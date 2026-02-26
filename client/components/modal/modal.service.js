'use strict';

angular.module('workspaceApp')
  .factory('Modal', function($rootScope, $uibModal) {
    /**
     * Opens a modal
     * @param  {Object} scope      - an object to be merged with modal's scope
     * @param  {String} modalClass - (optional) class(es) to be applied to the modal
     * @return {Object}            - the instance $uibModal.open() returns
     */
    function openModal(scope = {}, modalClass = 'modal-default') {
      var modalScope = $rootScope.$new();
      angular.extend(modalScope, scope);
      return $uibModal.open({
        templateUrl: 'components/modal/modal.html',
        windowClass: modalClass,
        scope: modalScope,
        backdrop: 'static'
      });
    }

    // Public API here
    return {

      /* Confirmation modals */
      confirm: {

        /**
         * Create a function to open a delete confirmation modal (ex. ng-click='myModalFn(name, arg1, arg2...)')
         * @param  {Function} del - callback, ran when delete is confirmed
         * @return {Function}     - the function to open the modal (ex. myModalFn)
         */
        quickMessage(del = angular.noop) {
          /**
           * Open a delete confirmation modal
           * @param  {String} name   - name or info to show on modal
           * @param  {All}           - any additional args are passed straight to del callback
           */
          return function() {
            var args = Array.prototype.slice.call(arguments),
                name = args.shift(),
                title = args.shift(),
                errBoolean = args.shift(),
                respType=function(){
                  if (errBoolean) return 'modal-danger';
                  return 'modal-success';
                },
                quickModal;

            quickModal = openModal({
              modal: {
                dismissable: true,
                errBoolean:errBoolean,
                title: title,
                html: '<p> <strong>' + name + '</strong> </p>',
                buttons: [ {
                  classes: 'btn-success',
                  text: 'OK',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }]
              }
            }, respType);

            quickModal.result.then(function(event) {
              del.apply(event, args);
            });
          };
        },
        quickShow(del = angular.noop) {
          /**
           * Open a delete confirmation modal
           * @param  {String} name   - name or info to show on modal
           * @param  {All}           - any additional args are passed straight to del callback
           */
          return function() {
            var args = Array.prototype.slice.call(arguments),
                airport = args.shift(),
                taf = args.shift(),
                quickModal;

            quickModal = openModal({
              modal: {
                dismissable: true,
                show:false,
                title: airport,
                html: '<p> <strong>' + taf + '</strong> </p>',
                buttons: [ {
                  classes: 'btn-success',
                  text: 'OK',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              del.apply(event, args);
            });
          };
        } ,
        metars(del = angular.noop) {
          /**
           * Open a delete confirmation modal
           * @param  {String} name   - name or info to show on modal
           * @param  {All}           - any additional args are passed straight to del callback
           */
          return function() {
            var args = Array.prototype.slice.call(arguments),
                airport = args.shift(),
                quickModal;

            quickModal = openModal({
              modal: {
                dismissable: true,
                show:false,
                metarModal:true,
                airport:airport,
                title: 'Last 2 Hours of Metars for ' + airport.airport,
                buttons: [ {
                  classes: 'btn-success',
                  text: 'OK',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              del.apply(event, args);
            });
          };
        } ,
        airport: function(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                airport = args.shift(),
                manualOpen=false,
                quickModal;

            quickModal = openModal({
              modal: {
                getWidth:window.getWidth,
                dismissable: true,
                show:false,
                airportModal:true,
                metarObj:airport,
                manualOpen:manualOpen,
                console:function(key,val){
                  airport[key]=val;
                },
                title: airport.airport.name,
                buttons: [ {
                  classes: 'btn-success',
                  text: 'OK',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              cb.apply(event, [{manualOpen:airport.manualOpen,airport:airport.airport,requestMetarList:airport.requestMetarList}]); //this is where all callback is actually called
            }).catch(err=>{
              console.log(err);
            });
          };
        } ,
        flight: function(cb) {
          cb = cb || angular.noop;
          return function() {
            let args = Array.prototype.slice.call(arguments),
                flight = args.shift(),
                alternateAirports = args.shift(),
                isAdmin = args.shift(),
                isSuperAdmin = args.shift(),
                user = args.shift(),
                userLastname = args.shift(),
                recentFlights = args.shift(),
                reasons=['No Reason','BA Employee','BA Pilot','Non-Company Handler','Other Airline Pilot','FAA','DOD'],
                alternates=['None','PAOM','PAOT','PAUN','PABE','PAGA','PAFA','PANC'],
                colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'],
                bgColors=['lightgreen','lightblue','#DAB1DA','yellow','orange','#ff0033'],
                scores=[{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                timestamp=new Date().toLocaleString(),
                alternateDisp=flight.alternate,
                checkPirep=function(pirep){
                  if (!pirep) return false;
                  let arr=pirep.split('>');
                  let tempDate,threeHoursAgo;
                  if (arr.length>1) {
                    tempDate=new Date(arr[0]);
                    threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
                    return tempDate.getTime() > threeHoursAgo;
                  }
                  return false;
                },
                isWrongUser = function(){
                  if (userLastname==='K.'||userLastname==='R.') userLastname="Evans";
                  if (!flight.pilotObject) return false;
                  //console.log(userLastname.toLowerCase()!==flight.pilotObject.lastName.toLowerCase())
                  if (typeof flight.pilotObject.lastName!=='string') flight.pilotObject={lastName:''};
                  if (!userLastname) userLastname='';
                  return userLastname.toLowerCase()!==flight.pilotObject.lastName.toLowerCase();
                },
                moreThanOneHour=function(){
                  let targetTime=new Date(flight.date);
                  const [hours, minutes, seconds] = flight.departTimes[0].split(':').map(Number);
                  targetTime.setHours(hours, minutes, seconds);
                  let now = new Date();
                  now.setHours(now.getHours() + 1);
                  return targetTime >= now;
                },
                ocRequired=function(color){
                  if (colors.indexOf(color)>3) return true;
                  if (flight.pfr&&flight.pfr.legArray[0].fuel<flight.equipment.minFuel) return true;
                  if (flight.knownIce&&flight.equipment.name==="Caravan") return true;
                  if (highMinimums) return true;
                  return false;
                },
                tksCalc=function(){
                  let gals=0;
                  if (flight.pfr.legArray[0].tksGallons) {
                    gals=flight.pfr.legArray[0].tksGallons*1;
                    if (gals>20.8) gals=gals*1;//gals=20.8;
                  }
                  return {gals:gals,lbs:Math.round(gals*9.2308)};
                  //return Math.round(flight.bew.tks*9.2308);
                },
                noPfr=function(){
                  if (flight.operation==='Test'||flight.operation==='Training'||flight.operation==='Ferry') return false;
                  return !flight.pfr||!flight.pfr.legArray[0]||!flight.pfr.legArray[0].fuel;
                },
                missingPfr=function(){
                  if (flight.operation==='Test'||flight.operation==='Training'||flight.operation==='Ferry') return false;
                  return !flight.pfr||!flight.pfr._id;
                },
                allDisabled=function(){return (flight.ocRelease||flight.dispatchRelease)&&flight.pilotAgree},
                aircraftTypes=['C208','C408','B190','BE20','C212'],
                highMinimums=false,
                highMinsClass=function(){
                  let index=aircraftTypes.indexOf(flight.equipment.short);
                  if (index>-1) {
                    if (flight.pilotObject&&flight.pilotObject['highMinimums'+aircraftTypes[index]]) {
                      highMinimums=true;
                      return 'highMinimums';
                    }  
                  }
                  return;
                },
                quickModal;
            quickModal = openModal({
              modal: {
                Math:Math,
                highMinsClass:highMinsClass,
                flightInfo:[{title:'Origin',val:flight.pfr.flightOrigin},
                            {title:'Date',val:flight.date},
                            {title:'Time',val:flight.departTimes[0].substring(0,5)+' - '+flight.departTimes[flight.departTimes.length-1].substring(0,5)},
                            {title:'Est Flight Time',val:flight.block},
                            {title:'Flight ID',val:'BRG'+flight.flightNum},
                            {title:'Operation',val:flight.operation},
                            {title:'Rule',val:'VFR/IFR'},
                            {title:'Route',val:flight.airports.toString()}
                            ],
                bewInfo:[{title:'Equipment Lbs',val:'equipment'},
                            {title:'Captain lbs',val:'captain'},
                            {title:'FO lbs',val:'fo'}
                            ],
                summaryInfo:[{title:'MaxZFW',val:flight.equipment.ZFW},
                            {title:'T/O Fuel',val:flight.pfr.legArray[0].fuel},
                            {title:'TKS (From iPad)',val:tksCalc().lbs,gals:tksCalc().gals},
                            {title:'Load Available',val:isNaN(Math.round(flight.pfr.legArray[0].mgtow-flight.pfr.legArray[0].operatingWeightEmpty-flight.pfr.legArray[0].fuel-tksCalc().lbs)) ? 0 : Math.round(flight.pfr.legArray[0].mgtow-flight.pfr.legArray[0].operatingWeightEmpty-flight.pfr.legArray[0].fuel-tksCalc().lbs)},
                            {title:'Actual Load',val:flight.pfr.legArray[0].totalLoad},
                            {title:'TOW',val:Math.round(flight.pfr.legArray[0].tow)}
                            ],
                calcSeatWeight:function(num){
                  if (num>9) {
                    num=9;
                    flight.bew.seatsRemoved=9;
                  }
                  flight.bew.seatWeight=num*24.5*-1;
                  return flight.bew.seatWeight;
                },
                oweCalc:function(){
                  //if (flight.equipment.name!=="Caravan") flight.bew.tks=0;
                  return Math.round(flight.bew.seatWeight*1+flight.bew.bew*1+flight.bew.equipment*1+flight.bew.captain*1+flight.bew.fo*1+flight.jumpseaterObject.bodyWt*1+flight.jumpseaterObject.bagWt*1);
                },
                reasons:reasons,
                jumpseatDisp:flight.jumpseaterObject.reason,
                tksCalc:tksCalc,
                checkPirep:checkPirep,
                fuelCalc:function(){
                  if (!flight.pfr.legArray[0].fuel) return 0;
                  return (flight.pfr.legArray[0].fuel/flight.equipment.fuelBurn).toFixed(1);
                },
                upOrDown:function(bool){
                  if (!bool) return "fa fa-solid fa-angle-down fa-lg";
                  return "fa fa-solid fa-angle-up fa-lg";
                },
                getWidth:window.getWidth,
                flight:flight,
                dismissable: true,
                show:false,
                flightModal:true,
                securityDisp:flight.pfr.remarks1||flight.security,
                timestamp:timestamp,
                alternates:alternates,
                alternateDisp:alternateDisp,
                pilotAgree:flight.pilotAgree,
                isAdmin:isAdmin,
                isSuperAdmin:isSuperAdmin,
                user:user,
                noPfr:noPfr,
                clearAlternate:function(){
                  alternateDisp='None';
                  flight.alternate=null;
                },
                updateParam:function(key,obj){
                  if (key==='jumpseat') {
                    flight.jumpseaterObject.reason=obj;
                    return;
                  }
                  if (key==='security') {
                    flight.security=obj;
                    flight.pfr.remarks1=obj;
                    return;
                  }
                  if (key==='alternate'&&obj==='None') flight.alternate=null;
                  else {
                    flight[key]=obj;
                    let i=alternateAirports.map(e=>e.icao).indexOf(flight.alternate);
                    if (i>-1) flight.altObj=alternateAirports[i];
                  }
                  
                },
                zulu:function(index){
                  let timeString=flight.departTimes[index];
                  let d=new Date();
                  const [hours, minutes, seconds] = timeString.split(":").map(Number);
                  d.setHours(hours, minutes, seconds);
                  return d.toISOString();
                },
                formatScore:function(s){
                  let i=scores.map(e=>e.score).indexOf(s*1);
                  if (i>-1) return s + ' - Braking ' + scores[i].descr;
                },
                isWrongUser:isWrongUser,
                dispatchClick:function(){
                  if (!flight.dispatchRelease) {
                    flight.dispatchRelease=user.name;
                    flight.dispatchReleaseTimestamp=new Date();
                  }
                },
                ocClick:function(){
                  if (!flight.ocRelease) {
                    flight.ocRelease=user.name;
                    flight.ocReleaseTimestamp=new Date();
                  }
                },
                pilotClick:function(){
                  if (!flight.pilotAgree) {
                    flight.pilotAgree=user.name;
                    flight.releaseTimestamp=new Date();
                  }
                },
                acceptSig:function(pilotAgree){flight.pilotAgree=pilotAgree},
                fuelSanity:function(fuel){if (fuel<flight.equipment.minFuel) return "airport-pink";},
                moreThanOneHour:moreThanOneHour,
                formatTimestamp:function(t){if (t) return new Date(t).toLocaleString()},
                ocRequired:ocRequired,
                getLbs:function(lbHigh,lbLow){return Math.floor(lbHigh-lbLow)},
                getGals:function(lbHigh,lbLow){return Math.floor((lbHigh-lbLow)/6.7)},
                getRequest(totalTaxi,fob){
                  let main=(totalTaxi*1-fob*1)/2;
                  let aux=0;
                  if (false){//flight.equipment.maxMain){
                    if (totalTaxi*1>flight.equipment.maxMain*2){
                      aux=(totalTaxi*1-flight.equipment.maxMain*2)/2;
                      main=main-aux;
                      if (flight.equipment.maxAux&&aux>flight.equipment.maxAux) aux=flight.equipment.maxAux;
                    }
                  }
                  return {main:Math.floor(main/6.7),aux:Math.floor(aux/6.7)};
                },
                getDestinationType:function(index){
                  if (index===0) return "Departure";
                  if (index===(flight.airportObjsLocked.length-1)) return "Destination";
                  return "Intermediate";
                },
                allDisabled:allDisabled,
                style:function(color){
                  let i=colors.indexOf(color);
                  if (i>-1) return bgColors[i];
                  else return '';
                },
                isDispatchDisabled:function(){
                  return ocRequired(flight.color) || moreThanOneHour() || !isAdmin || noPfr() || flight.pfr.legArray[0].fuel<1 || allDisabled();
                },
                isOCDisabled:function(){
                  return !ocRequired(flight.color) || moreThanOneHour() || !isSuperAdmin || noPfr() || flight.pfr.legArray[0].fuel<1 || allDisabled();
                },
                isPilotDisabled:function(){
                  return isWrongUser() || moreThanOneHour() || noPfr() || flight.pilotAgree || user.name==='Bering Air';
                },
                dispatchInfo:function(){
                  let string='Dispatch Release can ONLY be signed when: \r\n';
                  if (highMinimums) string+='- The captain is NOT listed as a High Mimumums Captain,\r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (noPfr()) string+='- The captain has successfully created a PFR and entered fuel quantity,\r\n';
                  if (!isAdmin) string+='- You are logged in as an OC Manager or Dispatcher';
                  if (ocRequired(flight.color)) string+='- Flight color is NOT orange or red, and the FIKI box is NOT checked (Caravans)\r\n';
                  if (string.length<55) string+='All criteria for signing appear to have been met.  If you can`t sign, something unexpected has happened.';
                  window.alert(string);
                },
                ocInfo:function(){
                  let string='OC Release can ONLY be signed when: \r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (noPfr()) string+='- The captain has successfully created a PFR and entered fuel quantity,\r\n';
                  if (!isSuperAdmin) string+='- You are logged in as an OC Manager';
                  if (!ocRequired(flight.color)) string+='- Flight color is orange or red, or the FIKI box is checked (Caravans)\r\n';
                  if (string.length<55) string+='All criteria for signing appear to have been met.  If you can`t sign, something unexpected has happened.';
                  window.alert(string);
                },
                pilotInfo:function(){
                  let string='Pilot Acceptance can ONLY be signed when: \r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (missingPfr()) string+='- The captain has successfully created a PFR,\r\n';
                  if (noPfr()) string+='- The captain has entered fuel quantity on the PFR,\r\n';
                  if (isWrongUser()) string+='- You are logged in as the Captain of the flight.';
                  if (string.length<55) string+='All criteria for signing appear to have been met.  If you can`t sign, something unexpected has happened.';
                  window.alert(string);
                  if (noPfr()||missingPfr()){
                    string='';
                    if (flight.pfr&&flight.pfr._id) string+='This flight is synced with PFR # '+flight.pfr._id+'\r\n\r\n';
                    let pilotsPFRs=recentFlights.filter(f=>{return flight.pilotObject.displayName===f.pilot});
                    string+='Possible PFRs for this pilot (Today Only):\r\n';
                    if (pilotsPFRs.length===0) string +='None yet, please create one and wait a few minutes for it to upload to the server.';
                    pilotsPFRs.forEach(pfr=>{
                      let fuel='';
                      if (pfr.legArray[0]) fuel=pfr.legArray[0].fuel;
                      string+=pfr.pilot+': in '+pfr.acftNumber+', Flight# '+pfr.flightNumber+', with '+fuel+' lbs Fuel\r\n';
                    });
                    window.alert(string);
                  }
                },
                checkOWE:function(){
                  
                            //{title:'OWE',val:flight.pfr.legArray[0].operatingWeightEmpty},
                  //if owe too high, return 'webcam-bad';
                  if (flight.pfr&&flight.pfr.legArray&&flight.pfr.legArray[0]&&flight.pfr.legArray[0].operatingWeightEmpty) {
                    let owe=flight.pfr.legArray[0].operatingWeightEmpty*1;
                    let std=145;
                    let stdHigh=280;
                    let crew=1;
                    if (flight.coPilot) crew++;
                    if (flight.jumpseaterObject&&flight.jumpseaterObject.name) crew++;
                    let bew=flight.bew.bew*1+60;
                    if (flight.bew.seatsRemoved) bew+=1*flight.bew.seatWeight;
                    let est=bew+std*crew*1;
                    let estHigh=bew+stdHigh*crew*1;
                    //console.log(flight.bew);
                    //console.log(bew);
                    //console.log(owe);
                    //console.log(estHigh + ' ' + est);
                    if (owe>estHigh||owe<est) return 'webcam-bad';
                  }
                },
                title: 'Flight Release  BRG' + flight.flightNum +' '+ flight.aircraft,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }, {
                  classes: 'btn-warning',
                  text: 'Remove Release',
                  click: function(event) {
                    if (user.role==='admin'||user.role==='superadmin') {
                      flight.dispatchRelease=null;
                      flight.ocRelease=null;
                      flight.pilotAgree=null;
                      flight.releaseTimestamp=null;
                      flight.dispatchReleaseTimestamp=null;
                      flight.ocReleaseTimestamp=null;
                      flight.colorLock=null;
                    }
                    quickModal.close(event);
                  }
                }, {
                  classes: 'btn-danger',
                  text: 'Cancel',
                  click: function(event) {
                    quickModal.dismiss(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              cb.apply(event, [flight]); //this is where all callback is actually called
            }).catch(err=>{
              console.log('Flight Modal Canceled');
              console.log(err);
            });
          };
        } ,
        weather: function(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                airport = args.shift(),
                user = args.shift(),
                manualObs=airport.manualObs||{},
                timestamp=new Date().toLocaleString(),
                manualTimestamp=airport.manualTimestamp||null,
                isWebcamGood=function(webcam){
                  if (webcam) return "webcam-good";
                },
                isWebcamBad=function(webcam){
                  if (webcam===undefined||webcam===null) return;
                  if (webcam===false) return "webcam-bad";
                },
                webcamEnabled=['ELI','GAM','SMK','SVA','SHH','WAA'],
                quickModal;
            quickModal = openModal({
              modal: {
                getWidth:window.getWidth,
                airport:airport,
                manualObs:manualObs,
                dismissable: true,
                show:false,
                weatherModal:true,
                timestamp:timestamp,
                isWebcamGood:isWebcamGood,
                isWebcamBad:isWebcamBad,
                disableWebcam:function(){
                  if (webcamEnabled.indexOf(airport.threeLetter)<0) return true;
                },
                clickWebcam:function(kind){
                  setTimeout(()=>{
                    if (kind==='webcam') {
                      if (manualObs.webcam) {
                        manualObs.webcamIFR=false;
                        manualObs.isOfficial=false;
                        manualObs.visibility=null;
                        manualObs.ceiling=null;
                        manualObs.altimeter=null;
                        manualObs.windDirection=null;
                        manualObs.windSpeed=null;
                      }
                      
                    }
                    else {
                      if (manualObs.webcamIFR) {
                        manualObs.webcam=false;
                        manualObs.isOfficial=true;
                        manualObs.visibility=null;
                        manualObs.ceiling=null;
                        manualObs.altimeter=null;
                        manualObs.windDirection=null;
                        manualObs.windSpeed=null;
                      }
                    }
                  },0);
                },
                floor:function(num){
                  console.log(num)
                  return Math.floor(num)
                  
                },
                signClick:function(){
                  manualObs.signature=user.name;
                  airport.manualTimestamp=new Date();
                },
                getTimestamp:function(){if (airport.manualTimestamp) return new Date(airport.manualTimestamp).toLocaleString()},
                title: 'Enter the Weather Observation for: ' +airport.name,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    if (!manualObs.signature){
                      manualObs.signature=user.name;
                      airport.manualTimestamp=new Date();
                    }
                    quickModal.close(event);
                  }
                }, {
                  classes: 'btn-danger',
                  text: 'Cancel',
                  click: function(event) {
                    quickModal.dismiss(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              airport.manualObs=manualObs;
              if (airport.manualTimestamp) airport.manualTimestamp=new Date(airport.manualTimestamp);
              cb.apply(event, [airport]); //this is where all callback is actually called
            }).catch(err=>{
              console.log(err);
            });
          };
        } ,
        runway: function(cb) {
          cb = cb || angular.noop;
          return function() {
            let args = Array.prototype.slice.call(arguments),
                airport = args.shift(),
                user = args.shift(),
                formData = airport||{},
                timestampObj={timestampString:""},
                scores=[{score:'N/A',descr:'N/A'},{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                contaminents=["None","Ice","Wet Ice","Snow","Compact Snow","Compact Snow/Ice","Dry Snow","Wet Snow","Slush","Drift","Water","Mud","Dirt","Debris"],
                percents=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'],
                depths=['0','1/8 inch','1/4 inch','1/2 inch','3/4 inch','1 inch','2 inches','3 inches','4 inches','6 inches','8 inches','10 inches','1 foot or more'],
                timestamp=null,
                unOfficial=!!formData.unOfficialSource,
                official=!!formData.officialSource,
                checkPirep=function(){
                  let str='';
                  let count=1;
                  if (!airport||!airport.companyPireps||airport.companyPireps.length<1) return str;
                  airport.companyPireps.forEach(pirep=>{
                    if (!pirep) return;
                    let arr=pirep.split('>');
                    let tempDate,threeHoursAgo;
                    if (arr.length>1) {
                      tempDate=new Date(arr[0]);
                      threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
                      if (tempDate.getTime() > threeHoursAgo) {
                        str += ' ' + count + ') ' + pirep + '\n';
                        count++;
                      }
                    }
                  });
                  return str;
                }, 
                quickModal;
            quickModal = openModal({
              modal: {
                airport:airport,
                formData:formData,
                dismissable: true,
                show:false,
                runway:true,
                unOfficial:unOfficial,
                official:official,
                getWidth:window.getWidth,
                checkPirep:checkPirep,
                makeUnOfficial:function(){
                  if (formData.unOfficialSource) {
                    formData.officialSource=null;
                    official=false;
                    unOfficial=true;
                  }
                },
                makeOfficial:function(){
                  if (formData.officialSource) {
                    formData.unOfficialSource=null;
                    unOfficial=false;
                    official=true;
                  }
                },
                depths:depths,
                percents:percents,
                contaminents:contaminents,
                scores:scores,
                timestampObj:timestampObj,
                timestamp:timestamp,
                checkPirep:checkPirep,
                depthDisp:formData.depth||"",
                percentDisp:formData.percent||"",
                contaminentDisp:formData.contaminent||"",
                runwayObj:scores[scores.map(e=>e.score).indexOf(formData.runwayScore*1)]||scores[6],
                signClick:function(){
                  formData.signature=user.name;
                  timestampObj.timestampString=new Date().toLocaleString();
                },
                updateParam:function(key,obj){formData[key]=obj},
                updateRunwayScore:function(obj){formData.runwayScore=obj.score},
                updateOpenClosed:function(){console.log(formData.openClosed)},
                getMyDate:function(d){return new Date(d).toLocaleString()},
                timestampChange:(ts)=>{
                  timestampObj.timestampString=ts;
                },
                title: 'Update the Runway Conditions for ' + airport.name,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    if (!formData.signature){
                      formData.signature=user.name;
                      timestampObj.timestampString=new Date().toLocaleString();
                    }
                    quickModal.close(event);
                  }
                }, {
                  classes: 'btn-danger',
                  text: 'Cancel',
                  click: function(event) {
                    quickModal.dismiss(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              if (timestampObj) formData.timestampString=timestampObj.timestampString;
              cb.apply(event, [formData]); //this is where all callback is actually called
            }).catch(err=>{
              console.log(err);
            });
          };
        } ,
        delete(del = angular.noop) {
          /**
           * Open a delete confirmation modal
           * @param  {String} name   - name or info to show on modal
           * @param  {All}           - any additional args are passed straight to del callback
           */
          return function() {
            var args = Array.prototype.slice.call(arguments),
              name = args.shift(),
              deleteModal;

            deleteModal = openModal({
              modal: {
                dismissable: true,
                title: 'Confirm Delete',
                html: '<p>Are you sure you want to delete <strong>' + name +
                  '</strong> ?</p>',
                buttons: [{
                  classes: 'btn-danger',
                  text: 'Delete',
                  click: function(e) {
                    deleteModal.close(e);
                  }
                }, {
                  classes: 'btn-default',
                  text: 'Cancel',
                  click: function(e) {
                    deleteModal.dismiss(e);
                  }
                }]
              }
            }, 'modal-danger');

            deleteModal.result.then(function(event) {
              del.apply(event, args);
            });
          };
        }
      }
    };
  });
