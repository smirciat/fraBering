'use strict';

angular.module('workspaceApp')
  .directive('loads', function($compile, $http, $timeout) {
  
  return {

    templateUrl: 'assets/files/sheet002.html',
      scope: {
        flight: '=',
        save: '&'
      },
    link: function(scope, element, attrs) {
      scope.dirty=false;
      $http.get('assets/files/data.json').then(res=>{
        scope.jsonData=res.data;
        scope.load.fuelPlan=scope.load.fuelPlan||
          {
              "label": "ROUND TRIP NO ALT",
              "fuel": "1329"
          };
        setHtml();
      }).catch(err=>{
        console.log(err);
      });
      const inputs=[
        'captainWeight',         'firstOfficerWeight',
        'fuelPreviouslyOnboard', 'fuelHaulGallons',
        'land',                  'mgtowDeparture',
        'mgtowDestination',      'pallet1',
        'pallet10',              'pallet11',
        'pallet12',              'pallet13',
        'pallet14',              'pallet15',
        'pallet16',              'pallet17',
        'pallet18',              'pallet2',
        'pallet3',               'pallet4',
        'pallet5',               'pallet6',
        'pallet7',               'pallet8',
        'pallet9'
      ];
      const dataFields=[
          'aircraft',
          'aircraftAsWeighed',
          'aircraftInches',
          'aircraftIndex',
          'departure',
          'destination',
          'burnOff1',
          'captainInches',
          'captainIndex',
          'captainWeight',
          'cg',
          'cruisePPH',
          'date',
          'distance',
          'firstOfficerInches',
          'firstOfficerIndex',
          'firstOfficerWeight',
          'flightNum',
          'flightTime',
          'fuel',
          'fuelHours',
          'fuelPlan',
          'fob',
          'fuelRemain1',
          'fuelHaulGallons',
          'land',
          'landingWeight',
          'lmgtow',
          'lmgtowLimit',
          'loadAvailable',
          'loadRemaining',
          'maxLandingWeight',
          'mgtowDeparture',
          'mgtowDestination',
          'mgtow',
          'mgtowLimit',
          'ow',
          'owe',
          'pallet1',
          'pallet10',
          'pallet11',
          'pallet12',
          'pallet13',
          'pallet14',
          'pallet15',
          'pallet16',
          'pallet17',
          'pallet18',
          'pallet2',
          'pallet3',
          'pallet4',
          'pallet5',
          'pallet6',
          'pallet7',
          'pallet8',
          'pallet9',
          'rampLimit',
          'rampWeight',
          'requestGallons',
          'startFuel',
          'tailNumber',
          'takeoffFuel',
          'totalLoad',
          'totalLoadAft',
          'totalLoadNose',
          'totalLoadZone1',
          'totalLoadZone2',
          'totalLoadZone3',
          'totalLoadZone4',
          'wbDate',
          'zfw',
          'zfwLimit'
        ];
      console.log(scope.flight);//two way binding comfirmed working
      scope.load = JSON.parse(JSON.stringify(scope.flight.loadsObject||{}));//
      //initialize input models
      scope.load.tailNumber=scope.load.tailNumber||scope.flight.aircraft.replace(/\D/g, "");
      if (scope.flight.pfr&&scope.flight.pfr.pilotData&&scope.flight.pfr.pilotData.weight) scope.load.captainWeight=scope.load.captainWeight||scope.flight.pfr.pilotData.weight*1;
      if (scope.flight.pfr&&scope.flight.pfr.coPilotData&&scope.flight.pfr.coPilotData.weight) scope.load.firstOfficerWeight=scope.load.firstOfficerWeight||scope.flight.pfr.coPilotData.weight*1;
      if (scope.flight.fuelPreviouslyOnboard) scope.load.fob=scope.load.fob||scope.flight.fuelPreviouslyOnboard*1;
      if (scope.flight.airportObjs&&scope.flight.airportObjs[0]&&scope.flight.airportObjs[0].airport&&scope.flight.airportObjs[0].airport.threeLetter) scope.load.departure=scope.load.departure||scope.flight.airportObjs[0].airport.threeLetter;
      if (scope.flight.airportObjs&&scope.flight.airportObjs[1]&&scope.flight.airportObjs[1].airport&&scope.flight.airportObjs[1].airport.threeLetter) scope.load.destination=scope.load.destination||scope.flight.airportObjs[1].airport.threeLetter;
      scope.load.flightNum=scope.load.flightNum||scope.flight.flightNum;
      scope.load.captainInches=142.2;
      scope.load.firstOfficerInches=142.2;
      scope.load.mgtowDeparture=19000;
      scope.load.mgtowDestination=19000;
      scope.load.land=18600;
      
      
      function setHtml(){
        //find all 'data-field' elements and update their innerHtml   
        
        angular.forEach(
          element[0].querySelectorAll('[data-field]'),
          function(td) {
            const field = td.getAttribute('data-field');
            const type = td.getAttribute('data-type');
            let inputType="number";
            if (type === 'input') {
              scope.load[field]=scope.load[field]||0;
              if (field==='departure'||field==='destination') inputType="text";
              td.innerHTML =
                '<input type="'+inputType+'" ng-blur="save()"' +
                'class="load-input" ng-model-options="{updateOn:\'blur\'}" ' +
                'ng-model="load.' + field + '">' ;
            }
            if (type === 'dropdown') {
              td.innerHTML =
                "<ui-select style='line-height:14px;height:14px' ng-model='load."+field+"' theme='selectize' class='shorter-ui-select' on-select='save()'> "+
                  "<ui-select-match style='line-height:14px;height:14px' placeholder='None'>{{$select.selected.label}}</ui-select-match> "+
                  "<ui-select-choices repeat='choice in "+JSON.stringify(scope.jsonData.choices)+"' > "+
                    "<div ng-bind-html='choice.label | highlight: $select.search'></div> "+
                  "</ui-select-choices> "+
                "</ui-select>";
            }
            if (type === 'data'||!type) {
              if (field==="cg"||(field.length>=5&&field.slice(-5)==="Index")){
                td.innerHTML =
                  '{{load.'+field+' | number : 1}}';
              }
              else {
                td.innerHTML =
                  '{{load.'+field+'}}';
              }
            }
            $compile(td)(scope);
          }
        );
      }
      
      function calculateIndex(load,inches){
        return (inches-297)*load/15000;
      }
      
      function timeFormat(decimalHours){
        decimalHours=decimalHours*1;
        const hours = Math.floor(decimalHours);
    
        // 2. Multiply the remaining decimal by 60 and round to nearest minute
        const minutes = Math.round((decimalHours - hours) * 60);
        
        // 3. Ensure minutes have a leading zero if they are less than 10
        const formattedMinutes = minutes.toString().padStart(2, '0');
        
        // 4. Return the formatted string
        return `${hours}\+${formattedMinutes}`;
      }
      
      function calculateDataFields(){
        scope.dirty=true;
        scope.load.fob=scope.load.fob*1||0;
        scope.load.requestGallons=Math.round(10*(scope.load.startFuel*1-scope.load.fob)/6.7)/10;
        let i=-1;
        //calculate zone loads
        scope.load.totalLoadNose=scope.load.pallet1;
        scope.load.totalLoadZone1=scope.load.pallet2+scope.load.pallet3+scope.load.pallet4+scope.load.pallet5;
        scope.load.totalLoadZone2=scope.load.pallet6+scope.load.pallet7+scope.load.pallet8+scope.load.pallet9;
        scope.load.totalLoadZone3=scope.load.pallet10+scope.load.pallet11+scope.load.pallet12+scope.load.pallet13;
        scope.load.totalLoadZone4=scope.load.pallet14+scope.load.pallet15+scope.load.pallet16+scope.load.pallet17;
        scope.load.totalLoadAft=scope.load.pallet18;
        if (!scope.jsonData) return;
        //calculate distance
        let distance, ete, fuelRequired, cruiseSpeed, burnRate, extra, legTaxi, firstLegTaxi, minTO, fuelHour, fuel55, fltBO, climbDistance, climbBurnRate, climbSpeed, climbBurn;
        i=scope.jsonData.distanceNM.map(e=>e.Airport).indexOf(scope.load.departure);
        if (i>-1) {
          distance=1*(scope.jsonData.distanceNM[i][scope.load.destination]);
        
          i=scope.jsonData.aircraft.map(e=>e.ID).indexOf(scope.flight.aircraft);
          if (i>-1) {
            //data parameters lookup
            cruiseSpeed=1*(scope.jsonData.aircraft[i].Cruise_Speed);
            climbDistance=1*(scope.jsonData.aircraft[i]['Dist']);
            burnRate=1*(scope.jsonData.aircraft[i]['Burn Rate']);
            extra=1*(67);
            legTaxi=1*(scope.jsonData.aircraft[i]['Taxi Fuel burn']);
            firstLegTaxi=1*(scope.jsonData.aircraft[i]['Taxi Fuel']);
            minTO=1*(scope.jsonData.aircraft[i]['Min TO']);
            fuelHour=1*(scope.jsonData.aircraft[i]['Low Burn Cruise']);
            fuel55=1*(scope.jsonData.aircraft[i]['Fuel_55min']);
            climbBurnRate=1*(scope.jsonData.aircraft[i]['Burn Rate']);
            climbSpeed=1*(scope.jsonData.aircraft[i]['Climb_Speed']);
            climbBurn=1*(scope.jsonData.aircraft[i]['Clb Burn']);
            //calc ete in hours
            ete=(distance-climbDistance)/cruiseSpeed + climbDistance/climbSpeed;
            fltBO=burnRate*(ete - .15) + climbBurn;
            if (scope.load.fuelPlan.label==="ROUND TRIP NO ALT") {
              fuelRequired=fltBO*2 + extra + fuelHour + legTaxi;
            }
            if (scope.load.fuelPlan.label==="ROUND TRIP W/ ALT") {
              fuelRequired=fltBO*2 + extra  + fuelHour + legTaxi + fuel55;
            }
            if (scope.load.fuelPlan.label==="one way no alt") {
              fuelRequired=fltBO + extra + fuelHour;
            }
            if (scope.load.fuelPlan.label==="one way w/ alt") {
              fuelRequired=fltBO + extra + fuelHour + fuel55;
            }
            if (!fuelRequired) fuelRequired=1*(scope.load.fuelPlan.fuel);
            if (fuelRequired<minTO) fuelRequired=minTO;
            scope.load.fuelPlan.fuel=fuelRequired;
          }
        }
        //basic408
        i=scope.jsonData.basic408.map(e=>e.Aircraft).indexOf(scope.load.tailNumber);
        if (i>-1){
          scope.load.aircraft = scope.jsonData.basic408[i].longAircraft;
          scope.load.aircraftAsWeighed = scope.jsonData.basic408[i].Weight*1;
          scope.load.aircraftInches = scope.jsonData.basic408[i]['Long Arm']*1;
          scope.load.aircraftIndex = scope.jsonData.basic408[i]['Lon Mom']*1;
          scope.load.wbDate = scope.jsonData.basic408[i].Date;
        }
        scope.load.takeoffFuel=Math.round(scope.load.fuelPlan.fuel);
        scope.load.startFuel=Math.round(scope.load.fuelPlan.fuel + firstLegTaxi);
        if (burnRate) {
          scope.load.fuelHours=timeFormat(scope.load.fuelPlan.fuel/burnRate);
        }
        scope.load.burnOff1=Math.round(fltBO);
        scope.load.fuelRemain1=Math.round(scope.load.fuelPlan.fuel-fltBO);
        scope.load.owe=scope.load.aircraftAsWeighed+scope.load.captainWeight+scope.load.firstOfficerWeight;
        scope.load.ow=scope.load.owe+scope.load.takeoffFuel;
        scope.load.rampLimit=19070;
        scope.load.mgtowLimit=19000;
        scope.load.lmgtowLimit=18819;
        scope.load.maxLandingWeight=18600;
        scope.load.zfwLimit=17900;
        scope.load.totalLoad=scope.load.totalLoadNose+scope.load.totalLoadZone1+scope.load.totalLoadZone2+scope.load.totalLoadZone3+scope.load.totalLoadZone4+scope.load.totalLoadAft;
        scope.load.mgtow=scope.load.ow+scope.load.totalLoad;
        scope.load.lmgtow=scope.load.mgtow;
        scope.load.rampWeight=scope.load.mgtow+70;
        scope.load.landingWeight=scope.load.mgtow-Math.round(fltBO);
        scope.load.zfw=scope.load.owe+scope.load.totalLoad;
        
        //index and inches for load areas
        scope.load.captainIndex=calculateIndex(scope.load.captainWeight,scope.load.captainInches);
        scope.load.firstOfficerIndex=calculateIndex(scope.load.firstOfficerWeight,scope.load.firstOfficerInches);
        scope.load.noseInches=68.2;
        scope.load.noseIndex=calculateIndex(scope.load.totalLoadNose,scope.load.noseInches);
        scope.load.zone1Inches=210.5;
        scope.load.zone1Index=calculateIndex(scope.load.totalLoadZone1,scope.load.zone1Inches);
        scope.load.zone2Inches=280.9;
        scope.load.zone2Index=calculateIndex(scope.load.totalLoadZone2,scope.load.zone2Inches);
        scope.load.zone3Inches=351.7;
        scope.load.zone3Index=calculateIndex(scope.load.totalLoadZone3,scope.load.zone3Inches);
        scope.load.zone4Inches=422;
        scope.load.zone4Index=calculateIndex(scope.load.totalLoadZone4,scope.load.zone4Inches);
        scope.load.aftInches=466.7;
        scope.load.aftIndex=calculateIndex(scope.load.totalLoadAft,scope.load.aftInches);
        if (scope.load.fuelHaulGallons&&scope.load.fuelHaulGallons>0) scope.load.fuelHaulPounds=scope.load.fuelHaulGallons*6.7+263;
        else scope.load.fuelHaulPounds=0;
        scope.load.fuelHaulInches=288;
        scope.load.fuelHaulIndex=calculateIndex(scope.load.fuelHaulPounds,scope.load.fuelHaulInches);
        scope.load.fuelInches=297.5;
        scope.load.fuelIndex=calculateIndex(scope.load.takeoffFuel,scope.load.fuelInches);
        //calculate cg by adding up all the index parameters
        scope.load.cg=0;
        for (const key of Object.keys(scope.load)) {
          if (key.length>=5&&key.slice(-5)==="Index") {
            scope.load.cg+=scope.load[key];
          }
        }
        
        scope.dirty=false;
      }
      
      scope.$watchGroup([
          'load.captainWeight',     'load.firstOfficerWeight',  'load.fuelPlan',
          'load.fob',                   'load.fuelHaulGallons',
          'load.land',                  'load.mgtowDeparture',
          'load.mgtowDestination',      'load.pallet1',
          'load.pallet10',              'load.pallet11',
          'load.pallet12',              'load.pallet13',
          'load.pallet14',              'load.pallet15',
          'load.pallet16',              'load.pallet17',
          'load.pallet18',              'load.pallet2',
          'load.pallet3',               'load.pallet4',
          'load.pallet5',               'load.pallet6',
          'load.pallet7',               'load.pallet8',
          'load.pallet9',               'jsonData',
          'load.departure', 'load.destination'
      ],function(newValues,oldValues){
        scope.dirty=true;
        calculateDataFields();
      });
    
      scope.save =  ()=>{
        $timeout(()=>{
          if (scope.dirty) return $timeout(()=>{scope.save()},200);
          $http.patch('/api/todaysFlights/'+scope.flight._id,{loadsObject:scope.load})
            .then(res=>{
              console.log('Successful Save');
            });
        },0);
      };
    }
  };
});
