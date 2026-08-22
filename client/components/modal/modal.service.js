'use strict';

angular.module('workspaceApp')
  .factory('Modal', function($rootScope, $uibModal, Util, $timeout, rotAppConfig) {
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
        standbyIntermediateNag(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                message = args.shift(),
                flight = args.shift(),
                quickModal;
            quickModal = openModal({
              modal: {
                dismissable: true,
                title: 'Standby Charter — Times Needed',
                html: '<p>' + message + '</p>',
                buttons: [{
                  classes: 'btn-primary',
                  text: 'Open Flight Release',
                  click: function(event) {
                    quickModal.close('open');
                  }
                }, {
                  classes: 'btn-default',
                  text: 'Dismiss',
                  click: function(event) {
                    quickModal.close('dismiss');
                  }
                }]
              }
            }, 'modal-warning');
            quickModal.result.then(function(result) {
              cb(result, flight);
            }).catch(function() {
              cb('dismiss', flight);
            });
          };
        },
        radio(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                formData = args.shift() || {},
                theModal;
            for (let key in formData) {
              if (formData[key] === 'true' && key !== 'newBaseMonth' && key !== 'includes297G') formData[key] = true;
              if (formData[key] === 'false' && key !== 'newBaseMonth' && key !== 'includes297G') formData[key] = false;
            }
            theModal = openModal({
              modal: {
                formData: formData,
                radio: true,
                trainingTypes: rotAppConfig.trainingEvents,
                dismissable: true,
                title: 'Click Each Training Type Accomplished on this Training Record',
                buttons: [{
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    theModal.close(event);
                  }
                }, {
                  classes: 'btn-danger',
                  text: 'Cancel',
                  click: function(event) {
                    theModal.dismiss(event);
                  }
                }]
              }
            }, 'modal-success');
            if (theModal) theModal.result.then(function(event) {
              cb.apply(event, [formData]);
            }).catch(function(err) {
              console.log(err);
            });
          };
        },
        pilotData(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                pilotData = args.shift() || {},
                pilotArr = args.shift() || [],
                theModal;
            var trainingEvents = rotAppConfig.trainingEvents;
            let index = pilotArr.map(e => e.name).indexOf('new');
            if (index > -1) pilotArr.splice(index, 1);
            index = pilotArr.map(e => e._id).indexOf(undefined);
            if (index > -1) pilotArr.splice(index, 1);
            index = pilotArr.map(e => e._id).indexOf('');
            if (index > -1) pilotArr.splice(index, 1);
            pilotArr.sort((a, b) => {
              if (!a.name) a.name = '';
              if (!b.name) b.name = '';
              return a.name.localeCompare(b.name);
            });
            pilotArr.forEach(pilot => {
              pilot.combo = pilot._id + ': ' + pilot.name;
            });
            pilotArr.unshift({name: 'new', combo: 'new', _id: ''});
            let aircraftTypes = ['C208', 'C408', 'B190', 'BE20', 'C212'];
            theModal = openModal({
              modal: {
                formData: pilotData,
                pilotArr: pilotArr,
                trainingEvents: trainingEvents,
                pilot: true,
                dismissable: true,
                aircraftTypes: aircraftTypes,
                fixDate: function(key) {
                  let dateString = this.formData[key];
                  if (typeof dateString === 'string') {
                    let arr = dateString.split('/');
                    if (arr.length >= 3 && arr[2].length === 2) {
                      this.formData[key] = arr[0] + '/' + arr[1] + '/20' + arr[2];
                    }
                  }
                },
                title: 'Check or Enter the Pilot`s Information',
                fill: function() {
                  if (this.formData.name === 'new' || this.new) {
                    if (!this.new) this.formData.name = '';
                    this.new = true;
                    return;
                  }
                  let idx = -1;
                  if (pilotData._id) idx = pilotArr.map(e => e._id).indexOf(pilotData._id);
                  if (this.formData._id) idx = pilotArr.map(e => e._id).indexOf(this.formData._id);
                  if (pilotData.name) idx = pilotArr.map(e => e.name).indexOf(pilotData.name);
                  if (this.formData.name) idx = pilotArr.map(e => e.name).indexOf(this.formData.name);
                  if (idx > -1) {
                    pilotData = pilotArr[idx];
                    this.formData = pilotData;
                  }
                },
                buttons: [{
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    theModal.close(event);
                  }
                }, {
                  classes: 'btn-danger',
                  text: 'Cancel',
                  click: function(event) {
                    theModal.dismiss(event);
                  }
                }]
              }
            }, 'modal-success');
            if (theModal) theModal.result.then(function(event) {
              cb.apply(event, [pilotData]);
            }).catch(function(err) {
              console.log(err);
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
                trendExpand=false,
                manualOpen=false,
                quickModal;

            quickModal = openModal({
              modal: {
                getWidth:window.getWidth,
                dismissable: true,
                show:false,
                airportModal:true,
                trendExpand:trendExpand,
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
                taxiFuel=flight.pfr.legArray[0].taxiFuel||0,
                startFuel=flight.pfr.legArray[0].fuel-taxiFuel,//flight.pfr.legArray[0].startFuel||
                reasons=['No Reason','BA Employee','BA Pilot','Non-Company Handler','Other Airline Pilot','FAA','DOD'],
                alternates=['None','PAOM','PAOT','PAUN','PABE','PAGA','PAFA','PANC'],
                colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'],
                bgColors=['lightgreen','lightblue','#DAB1DA','yellow','orange','#ff0033'],
                scores=[{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                timestamp=new Date().toLocaleString(),
                alternateDisp=flight.alternate || 'None',
                checkPirep=function(pirep){
                  if (!pirep) return false;
                  let flightTime,tempDate,threeHoursAgo;
                  flightTime=Date.now();
                  if (flight.releaseTimestamp&&(flight.ocReleaseTimestamp||flight.dispatchReleaseTimestamp)) {
                    let latest=new Date(flight.releaseTimestamp);
                    let date2=new Date(flight.ocReleaseTimestamp);
                    let date3=new Date(flight.dispatchReleaseTimestamp);
                    if (flight.ocReleaseTimestamp && date2 > latest) latest = date2;
                    if (flight.dispatchReleaseTimestamp && date3 > latest) latest = date3;
                    flightTime=latest.getTime();
                  }
                  let arr=pirep.split('>');
                  if (arr.length>1) {
                    tempDate=new Date(arr[0]);
                    threeHoursAgo = flightTime - 3 * 60 * 60 * 1000;
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
                riskColorTokens=function(colorStr){
                  if (!colorStr) return [];
                  return String(colorStr).replace(/\s+unofficial/g,'').split(/\s+/).filter(c=>colors.indexOf(c)>-1);
                },
                worstRiskColorIndex=function(colorStr){
                  let max=0;
                  riskColorTokens(colorStr).forEach(c=>{
                    let i=colors.indexOf(c);
                    if (i>max) max=i;
                  });
                  return max;
                },
                lockFlightColorFromLegs=function(objs){
                  if (!objs||!objs.length) return;
                  let color=colors[0];
                  let night=false;
                  let colorIndex=0;
                  for (let i=0;i<objs.length;i++) {
                    let myClass=objs[i].lockedLegColor||objs[i].color;
                    if (!myClass) continue;
                    if (objs[i].color) objs[i].lockedLegColor=objs[i].color;
                    myClass.split(' ').forEach(a=>{
                      if (a==='night') night=true;
                      if (colors.indexOf(a)>colorIndex) {
                        color=a;
                        colorIndex=colors.indexOf(a);
                      }
                    });
                  }
                  flight.colorLock=night?('night '+color):color;
                  flight.color=flight.colorLock;
                },
                legBlocksDispatch=function(metarObj){
                  let idx=worstRiskColorIndex(metarObj&&metarObj.color);
                  return idx===1||idx===2||idx===4||idx===5;
                },
                flightHasLegBlockingDispatch=function(){
                  let objs=flight.airportObjs||flight.airportObjsLocked;
                  if (!objs||!objs.length) return false;
                  for (let i=0;i<objs.length;i++) {
                    if (legBlocksDispatch(objs[i])) return true;
                  }
                  return false;
                },
                flightHasBlueOrPurpleLeg=function(){
                  let objs=flight.airportObjs||flight.airportObjsLocked;
                  if (!objs||!objs.length) return false;
                  for (let i=0;i<objs.length;i++) {
                    let idx=worstRiskColorIndex(objs[i].color);
                    if (idx===1||idx===2) return true;
                  }
                  return false;
                },
                flightExceedsRedDogOcWind=function(){
                  let objs=flight.airportObjs||flight.airportObjsLocked;
                  if (!objs||!objs.length) return false;
                  for (let i=0;i<objs.length;i++) {
                    let m=objs[i];
                    if (!m||!m.airport||m.airport.icao!=='PADG') continue;
                    let gust=m['Wind-Gust']*1;
                    let dir=m['Wind-Direction'];
                    if (!gust||!dir) continue;
                    let limits=Util.redDogWindLimitsForDirection(dir);
                    if (gust>limits.oc) return true;
                  }
                  return false;
                },
                manualObsRecent=function(airport){
                  if (!airport||!airport.manualObs||!airport.manualTimestamp) return false;
                  let oneHourAgo=new Date();
                  oneHourAgo.setHours(oneHourAgo.getHours()-1);
                  oneHourAgo.setMinutes(oneHourAgo.getMinutes()-10);
                  return new Date(airport.manualTimestamp)>oneHourAgo;
                },
                enrichMetarWithManualObs=function(metarObj){
                  if (!metarObj||!metarObj.airport||!manualObsRecent(metarObj.airport)) return;
                  let mo=metarObj.airport.manualObs;
                  if (mo.webcam) {
                    metarObj['Raw-Report']='WebCam Observation, VFR Only';
                    metarObj.usingManual=true;
                    metarObj.isOfficial=false;
                    metarObj.color=(String(metarObj.color||'').indexOf('night')>-1?'night ':'')+'airport-green';
                    return;
                  }
                  if (mo.webcamIFR) {
                    metarObj['Raw-Report']='Official WebCam Observation';
                    metarObj.usingManual=true;
                    metarObj.isOfficial=true;
                    metarObj.color=(String(metarObj.color||'').indexOf('night')>-1?'night ':'')+'airport-orange';
                    return;
                  }
                  let priorColor=String(metarObj.color||'');
                  let needsManual=!metarObj['Raw-Report']||priorColor.indexOf('airport-blue')>-1||priorColor.indexOf('airport-purple')>-1;
                  if (!needsManual) return;
                  let obs='UNOFFICIAL: ';
                  if (mo.isOfficial) obs='OFFICIAL OBSERVATION: ';
                  if (mo.windSpeed&&mo.windDirection) obs=obs+'Wind '+mo.windDirection+'@'+mo.windSpeed+'kts';
                  if (mo.visibility) obs=obs+', Visibility '+mo.visibility;
                  if (mo.ceiling) obs=obs+', Ceiling '+mo.ceiling;
                  if (mo.altimeter) obs=obs+', Altimeter '+mo.altimeter;
                  metarObj['Raw-Report']=obs;
                  metarObj.Visibility=mo.visibility;
                  metarObj.Ceiling=mo.ceiling;
                  metarObj['Wind-Gust']=mo.windSpeed;
                  metarObj['Wind-Direction']=mo.windDirection;
                  metarObj.altimeter=mo.altimeter;
                  metarObj.isOfficial=mo.isOfficial;
                  metarObj.usingManual=true;
                  metarObj.manualObs=mo;
                },
                snapshotReleaseWeather=function(lockColor){
                  let source=flight.airportObjs;
                  if (!source||!source.length) return;
                  flight.airportObjsLocked=angular.copy(source);
                  flight.airportObjsLocked.forEach(metarObj=>{
                    enrichMetarWithManualObs(metarObj);
                    if (metarObj.color) metarObj.lockedLegColor=metarObj.color;
                  });
                  if (lockColor&&!flight.colorLock) lockFlightColorFromLegs(flight.airportObjsLocked);
                },
                ocRequired=function(){
                  if (flightHasLegBlockingDispatch()) return true;
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
            if (flight.dispatchRelease||flight.ocRelease) {
              if (!flight.airportObjsLocked||!flight.airportObjsLocked.length) snapshotReleaseWeather(false);
            }
            else snapshotReleaseWeather(false);
            let standbyCharter=Util.isStandbyCharter(flight);
            if (!flight.miscObject) flight.miscObject={};
            flight.miscObject.standbyCharter=standbyCharter;
            Util.initStandbyLegTimes(flight);
            Util.initFlightEtaFields(flight);
            quickModal = openModal({
              modal: {
                Math:Math,
                highMinsClass:highMinsClass,
                flightInfo:[{title:'Origin',val:flight.pfr.flightOrigin},
                            {title:'Date',val:flight.date},
                            {title:'Time',val:flight.departTimes[0].substring(0,5)+' - '+flight.departTimes[flight.departTimes.length-1].substring(0,5)},
                            {title:'Est Flight Time',val:flight.block},
                            {title:'Flight ID',val:'BRG'+flight.flightNum},
                            {title:'Operation',val:Util.operationDisplay(flight)},
                            {title:'Rule',val:'VFR/IFR. Altitude per GOM 06.19'},
                            {title:'Route',val:flight.airports.toString()}
                            ],
                bewInfo:[{title:'Equipment Lbs',val:'equipment'},
                            {title:'Captain lbs',val:'captain'},
                            {title:'FO lbs',val:'fo'}
                            ],
                summaryInfo:[{title:'MaxZFW',val:flight.equipment.ZFW},
                            {title:'Takeoff Fuel',val:startFuel},
                            {title:'TKS (From iPad)',val:tksCalc().lbs,gals:tksCalc().gals},
                            {title:'Load Available',val:isNaN(Math.round(flight.pfr.legArray[0].mgtow-flight.pfr.legArray[0].operatingWeightEmpty-startFuel-flight.pfr.legArray[0].tksWeight)) ? 0 : Math.round(flight.pfr.legArray[0].mgtow-flight.pfr.legArray[0].operatingWeightEmpty-startFuel-flight.pfr.legArray[0].tksWeight)},
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
                startFuel:startFuel,
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
                standbyCharter:standbyCharter,
                standbyLegTimes:flight.miscObject.standbyLegTimes,
                isStandbyCharter:function(){return Util.isStandbyCharter(flight);},
                standbyLegTimesDisabled:function(){return flight.active==='false';},
                enrouteFieldsDisabled:function(){return flight.flightStatus==='Completed';},
                plannedFinalEta:function(){return Util.plannedFinalEta(flight);},
                dismissable: true,
                show:false,
                flightModal:true,
                pilotEmpNumber: Util.pilotEmpNumber,
                crewIdCheckedLabel:function(){
                  if (flight.pilotAgree) return 'CHECKED';
                  return '';
                },
                crewIdInputDisabled:function(){
                  return allDisabled() || !!flight.pilotAgree;
                },
                fikiRemarkSnippets:[
                  {label:'VFR', text:'VFR'},
                  {label:'Below icing forecast', text:'Planned flight altitude below icing forecast.'},
                  {label:'Recent PIREP — no icing', text:'Recent PIREP indicates no icing.'}
                ],
                knownIcePrior:!!flight.knownIce,
                showFikiUncheckHint:false,
                applyFikiUncheckRemark:function(){
                  let defaultText='Planned flight altitude below icing forecast.';
                  if (!flight.otherEnvironment||!String(flight.otherEnvironment).trim()) {
                    flight.otherEnvironment=defaultText;
                  }
                  this.showFikiUncheckHint=true;
                },
                applyFikiRemarkSnippet:function(snippet){
                  if (!snippet||!snippet.text) return;
                  flight.otherEnvironment=snippet.text;
                  this.showFikiUncheckHint=false;
                },
                onKnownIceChange:function(){
                  if (this.knownIcePrior&&!flight.knownIce) this.applyFikiUncheckRemark();
                  else if (flight.knownIce) this.showFikiUncheckHint=false;
                  this.knownIcePrior=!!flight.knownIce;
                },
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
                  flight.alternate=null;
                  flight.altObj=null;
                  this.alternateDisp='None';
                  var modalUi=this;
                  $timeout(function(){
                    flight.alternate=null;
                    flight.altObj=null;
                    modalUi.alternateDisp='None';
                  }, 0);
                },
                applyAlternateSelection:function(choice){
                  if (choice==='None'||choice==null||choice==='') {
                    flight.alternate=null;
                    flight.altObj=null;
                    this.alternateDisp='None';
                  } else {
                    flight.alternate=choice;
                    this.alternateDisp=choice;
                    let i=alternateAirports.map(e=>e.icao).indexOf(choice);
                    if (i<0) {
                      i=alternateAirports.map(e=>e.threeLetter).indexOf(choice);
                    }
                    if (i>-1) {
                      flight.altObj=angular.copy(alternateAirports[i]);
                    } else {
                      flight.altObj=null;
                    }
                  }
                },
                applyAlternateSelect:function(item){
                  var modalUi=this;
                  modalUi.applyAlternateSelection(item);
                  $timeout(function(){
                    modalUi.applyAlternateSelection(item);
                  }, 0);
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
                  if (key==='alternate') {
                    var modalUi=this;
                    modalUi.applyAlternateSelection(obj);
                    $timeout(function(){
                      modalUi.applyAlternateSelection(obj);
                    }, 0);
                    return;
                  }
                  flight[key]=obj;
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
                    snapshotReleaseWeather(true);
                  }
                },
                ocClick:function(){
                  if (!flight.ocRelease) {
                    flight.ocRelease=user.name;
                    flight.ocReleaseTimestamp=new Date();
                    snapshotReleaseWeather(true);
                  }
                },
                pilotClick:function(){
                  if (!flight.pilotAgree) {
                    flight.pilotAgree=user.name;
                    flight.releaseTimestamp=new Date();
                    if (!flight.crewId) flight.crewId='checked';
                    flight.cockpitInspection='secure';
                    flight.cabinInspection='secure';
                    flight.cargoInspection='secure';
                    flight.wheelWellInspection='secure';
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
                  if (fob===undefined||fob===null||fob==='') fob=flight.autoOnboard||0;
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
                  let legs=flight.airportObjsLocked||flight.airportObjs;
                  if (index===(legs.length-1)) return "Destination";
                  return "Intermediate";
                },
                allDisabled:allDisabled,
                style:function(color){
                  let i=colors.indexOf(color);
                  if (i>-1) return bgColors[i];
                  else return '';
                },
                isDispatchDisabled:function(){
                  return ocRequired() || moreThanOneHour() || !isAdmin || noPfr() || flight.pfr.legArray[0].fuel<1 || allDisabled();
                },
                isOCDisabled:function(){
                  return !ocRequired() || flightExceedsRedDogOcWind() || moreThanOneHour() || !isSuperAdmin || noPfr() || flight.pfr.legArray[0].fuel<1 || allDisabled();
                },
                isPilotDisabled:function(){
                  return isWrongUser() || moreThanOneHour() || noPfr() || flight.pilotAgree || user.name==='Bering Air'
                    || (flightHasBlueOrPurpleLeg()&&!flight.ocRelease);
                },
                dispatchInfo:function(){
                  let string='Dispatch Release can ONLY be signed when: \r\n';
                  if (highMinimums) string+='- The captain is NOT listed as a High Mimumums Captain,\r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (noPfr()) string+='- The captain has successfully created a PFR and entered fuel quantity,\r\n';
                  if (!isAdmin) string+='- You are logged in as an OC Manager or Dispatcher';
                  if (ocRequired()) string+='- Every leg is green or yellow only (no blue, purple, orange, or red), FIKI is not checked (Caravans), and captain is not high minimums,\r\n';
                  if (string.length<55) string+='All criteria for signing appear to have been met.  If you can`t sign, something unexpected has happened.';
                  window.alert(string);
                },
                ocInfo:function(){
                  let string='OC Release can ONLY be signed when: \r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (noPfr()) string+='- The captain has successfully created a PFR and entered fuel quantity,\r\n';
                  if (!isSuperAdmin) string+='- You are logged in as an OC Manager';
                  if (!ocRequired()) string+='- A leg is blue, purple, orange, or red, FIKI is checked (Caravans), or captain is high minimums,\r\n';
                  if (string.length<55) string+='All criteria for signing appear to have been met.  If you can`t sign, something unexpected has happened.';
                  window.alert(string);
                },
                pilotInfo:function(){
                  let string='Pilot Acceptance can ONLY be signed when: \r\n';
                  if (moreThanOneHour()) string+='- The flight is within one hour of scheduled departure,\r\n';
                  if (missingPfr()) string+='- The captain has successfully created a PFR,\r\n';
                  if (noPfr()) string+='- The captain has entered fuel quantity on the PFR,\r\n';
                  if (isWrongUser()) string+='- You are logged in as the Captain of the flight.';
                  if (flightHasBlueOrPurpleLeg()&&!flight.ocRelease) string+='- OC Manager has signed (required for blue or purple airports),\r\n';
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
                    if (flight.tfliteDepart) {//flight.pilotAgree&&(flight.ocRelease||flight.dispatchRelease)){
                      alert('Cannot remove a release after flight has taken off');
                    }
                    else if (user.role==='admin'||user.role==='superadmin') {
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
                quickModal,
                weatherModalApi;
            weatherModalApi={
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
                parseManualWeatherNumber:function(val){
                  if (val===null||val===undefined||val==='') return val;
                  if (typeof val==='number'&&!isNaN(val)) return val;
                  let s=String(val).trim();
                  if (!s) return '';
                  let m=s.match(/\d+/);
                  if (!m) return val;
                  return Number(m[0]);
                },
                normalizeManualObsField:function(field){
                  if (!manualObs||!field||field==='altimeter') return;
                  if (manualObs[field]!==null&&manualObs[field]!==undefined&&manualObs[field]!=='') {
                    manualObs[field]=weatherModalApi.parseManualWeatherNumber(manualObs[field]);
                  }
                },
                normalizeManualObs:function(){
                  ['windDirection','windSpeed','visibility','ceiling'].forEach((field)=>{
                    weatherModalApi.normalizeManualObsField(field);
                  });
                },
                getTimestamp:function(){if (airport.manualTimestamp) return new Date(airport.manualTimestamp).toLocaleString()},
                title: 'Enter the Weather Observation for: ' +airport.name,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
                    weatherModalApi.normalizeManualObs();
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
              };
            quickModal = openModal({
              modal: weatherModalApi
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
        text: function(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
              messages = args.shift(),
              updateChanged=function(message){
                let i=messages.map(e=>e._id).indexOf(message._id);
                if (i>-1) messages[i].changed=true;
              },
              quickModal = openModal({
              modal: {
                messages:messages,
                dismissable:false,
                textModal:true,
                createMessage:function(message){
                  return new Date(message.sent).toLocaleString()+  '\n     ' + message.body;
                },
                updateChanged:updateChanged,
                title: 'Incoming Spidertrackes Text Messages',
                html: '<p> <strong>Check Message After Reading to Confirm</strong> </p>',
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Close Window',
                  click: function(event) {
                    quickModal.close(event);
                  }
                }]
              }
            }, 'modal-success');

            quickModal.result.then(function(event) {
              cb.apply(event,[messages]); //this is where all callback is actually called
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
