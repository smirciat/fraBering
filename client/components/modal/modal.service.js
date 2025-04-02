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
                quickModal;

            quickModal = openModal({
              modal: {
                dismissable: true,
                title: 'Important Message',
                html: '<p> <strong>' + name + '</strong> </p>',
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
            var args = Array.prototype.slice.call(arguments),
                flight = args.shift(),
                alternateAirports = args.shift(),
                isAdmin = args.shift(),
                isSuperAdmin = args.shift(),
                user = args.shift(),
                userLastname = args.shift(),
                alternates=['PAOM','PAOT','PAUN','PABE','PAGA','PAFA','PANC'],
                colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'],
                bgColors=['lightgreen','lightblue','#DAB1DA','yellow','orange','#ff0033'],
                scores=[{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                timestamp=new Date().toLocaleString(),
                alternateDisp=flight.alternate,
                quickModal;
            quickModal = openModal({
              modal: {
                getWidth:window.getWidth,
                flight:flight,
                dismissable: true,
                show:false,
                flightModal:true,
                timestamp,timestamp,
                alternates:alternates,
                alternateDisp:alternateDisp,
                pilotAgree:flight.pilotAgree,
                isAdmin:isAdmin,
                isSuperAdmin:isSuperAdmin,
                user:user,
                clearAlternate:function(){
                  flight.alternate=null;
                  alternateDisp=undefined;
                },
                updateParam:function(key,obj){
                  flight[key]=obj;
                  let i=alternateAirports.map(e=>e.icao).indexOf(flight.alternate);
                  if (i>-1) flight.altObj=alternateAirports[i];
                  console.log(flight.altObj)
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
                isWrongUser:function(){
                  if (!flight.pilotObject) return false;
                  //console.log(userLastname.toLowerCase()!==flight.pilotObject.lastName.toLowerCase())
                  if (typeof flight.pilotObject.lastName!=='string') flight.pilotObject={lastName:''};
                  if (!userLastname) userLastname='';
                  return userLastname.toLowerCase()!==flight.pilotObject.lastName.toLowerCase();
                },
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
                moreThanOneHour:function(){
                  let targetTime=new Date(flight.date);
                  const [hours, minutes, seconds] = flight.departTimes[0].split(':').map(Number);
                  targetTime.setHours(hours, minutes, seconds);
                  let now = new Date();
                  now.setHours(now.getHours() + 1);
                  return targetTime >= now;
                },
                formatTimestamp:function(t){if (t) return new Date(t).toLocaleString()},
                ocRequired:function(color){
                  if (colors.indexOf(color)>3) return true;
                  if (flight.pfr&&flight.pfr.legArray[0].fuel<flight.equipment.minFuel) return true;
                  if (flight.knownIce) return true;
                  return false;
                },
                getLbs:function(lbHigh,lbLow){return Math.floor(lbHigh-lbLow)},
                getGals:function(lbHigh,lbLow){return Math.floor((lbHigh-lbLow)/6.7)},
                getRequest(totalTaxi,fob){
                  let main=(totalTaxi*1-fob*1)/2;
                  let aux=0;
                  if (flight.equipment.maxMain){
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
                pilotDisabled:function(f){
                  if (colors.indexOf(f.color)>3) return !f.ocRelease||f.ocRelease==="";
                  else return !f.dispatchRelease&&!f.ocRelease;
                },
                style:function(color){
                  let i=colors.indexOf(color);
                  if (i>-1) return bgColors[i];
                  else return '';
                },
                dispatchInfo:function(){window.alert('Dispatch Release can ONLY be signed when: the flight is within one hour of scheduled departure, the overall condition color is NOT orange or red, the captain has successfully created a PFR and entered fuel quantity, the flight is not considered "Known Icing" and you are logged in as a dispatch or OC manager.')},
                ocInfo:function(){window.alert('OC Release can ONLY be signed when: the flight is within one hour of scheduled departure, the overall condition color is orange or red (of the flight is considered "Known Icing"), the captain has successfully created a PFR and entered fuel quantity, and you are logged in as an OC manager.')},
                pilotInfo:function(){window.alert('Pilot Acceptance can ONLY be signed when: the flight is within one hour of scheduled departure, the disptach or OC manager release has been signed, the captain has successfully created a PFR and entered fuel quantity, and you are logged in as the Captain of the flight.')},
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
                scores=[{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                contaminents=["None","Ice","Wet Ice","Snow","Compact Snow","Compact Snow/Ice","Dry Snow","Wet Snow","Slush","Drift","Water","Mud","Dirt","Debris"],
                percents=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'],
                depths=['0','1/8 inch','1/4 inch','1/2 inch','3/4 inch','1 inch','2 inches','3 inches','4 inches','6 inches','8 inches','10 inches','1 foot or more'],
                timestamp=null,
                unOfficial=!!formData.unOfficialSource,
                official=!!formData.officialSource,
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
                depthDisp:formData.depth||"",
                percentDisp:formData.percent||"",
                contaminentDisp:formData.contaminent||"",
                runwayObj:scores[scores.map(e=>e.score).indexOf(formData.runwayScore*1)]||scores[5],
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
