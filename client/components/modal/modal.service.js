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
        airport(del = angular.noop) {
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
                airportModal:true,
                metarObj:airport,
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
              del.apply(event, args);
            });
          };
        } ,
        flight: function(cb) {
          cb = cb || angular.noop;
          return function() {
            var args = Array.prototype.slice.call(arguments),
                flight = args.shift(),
                colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'],
                bgColors=['lightgreen','lightblue','#DAB1DA','yellow','orange','#ff0033'],
                timestamp=new Date().toLocaleString(),
                pilotAgree=null,
                quickModal;
            quickModal = openModal({
              modal: {
                flight:flight,
                dismissable: true,
                show:false,
                flightModal:true,
                timestamp,timestamp,
                pilotAgree:pilotAgree,
                acceptSig:function(pilotAgree){flight.pilotAgree=pilotAgree},
                moreThanOneHour:function(){
                  let targetTime=new Date(flight.date);
                  const [hours, minutes, seconds] = flight.departTimes[0].split(':').map(Number);
                  targetTime.setHours(hours, minutes, seconds);
                  let now = new Date();
                  now.setHours(now.getHours() + 1);
                  return targetTime >= now;
                },
                formatTimestamp:function(t){if (t) return new Date(t).toLocaleString()},
                ocRequired:function(color){return colors.indexOf(color)>3},
                getLbs:function(lbHigh,lbLow){return Math.floor(lbHigh-lbLow)},
                getGals:function(lbHigh,lbLow){return Math.floor((lbHigh-lbLow)/6.7)},
                pilotDisabled:function(f){
                  if (colors.indexOf(f.color)>3) return !f.ocRelease||f.ocRelease==="";
                  else return !f.dispatchRelease||f.dispatchRelease==="";
                },
                style:function(color){
                  let i=colors.indexOf(color);
                  if (i>-1) return bgColors[i];
                  else return '';
                },
                title: 'Flight Release  BRG' + flight.flightNum +' '+ flight.aircraft,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
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
                manualObs=airport.manualObs,
                timestamp=new Date().toLocaleString(),
                quickModal;
            quickModal = openModal({
              modal: {
                airport:airport,
                dismissable: true,
                show:false,
                weatherModal:true,
                timestamp:timestamp,
                getTimestamp:function(){if (airport.manualTimestamp) return new Date(airport.manualTimestamp).toLocaleString()},
                title: 'Enter the Weather Observation for: ' +airport.name,
                buttons: [ {//this is where you define you buttons and their appearances
                  classes: 'btn-primary',
                  text: 'Confirm/Save',
                  click: function(event) {
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
              airport.manualTimestamp=timestamp;
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
                formData = args.shift()||{},
                timestampObj={timestampString:""},
                scores=[{score:0,descr:"Nil"},{score:1,descr:"Poor"},{score:2,descr:"Medium to Poor"},{score:3,descr:"Medium"},{score:4,descr:"Good to Medium"},{score:5,descr:"Good"},{score:6,descr:"Better than Good"}],
                contaminents=["None","Ice","Snow","Compact Snow","Compact Snow/Ice","Dry Snow","Wet Snow","Slush","Drift"],
                timestamp=new Date().toLocaleString(),
                quickModal;
            quickModal = openModal({
              modal: {
                airport:airport,
                formData:formData,
                dismissable: true,
                show:false,
                runway:true,
                contaminents:contaminents,
                scores:scores,
                timestampObj:timestampObj,
                timestamp:timestamp,
                contaminentDisp:formData.contaminent||"Stuff",
                runwayObj:scores[scores.map(e=>e.score).indexOf(formData.runwayScore*1)]||scores[5],
                updateContaminent:function(obj){formData.contaminent=obj},
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
