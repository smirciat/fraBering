'use strict';

angular.module('workspaceApp')
  .directive('loads', function($compile, $http, $timeout) {

  var LOAD_SHEET_CONFIGS = {
    C408: {
      templateUrl: 'assets/files/sheet002.html',
      basicDataKey: 'basic408',
      indexDatum: 297,
      indexDivisor: 15000,
      captainInches: 142.2,
      firstOfficerInches: 142.2,
      fuelInches: 297.5,
      fuelHaulInches: 288,
      rampLimit: 19070,
      mgtowLimit: 19000,
      lmgtowLimit: 18819,
      maxLandingWeight: 18600,
      zfwLimit: 17900,
      defaultMgtow: 19000,
      defaultLand: 18600,
      fuelHaulOffset: 263,
      cgChart: {
        cgMultiplier: 15000,
        plotLeft: 64,
        plotTop: 61,
        plotWidth: 154,
        plotHeight: 156,
        cgMin: -22,
        cgMax: -2,
        weightMin: 11000,
        weightMax: 17000
      },
      zones: [
        {totalKey: 'totalLoadNose', pallets: ['pallet1'], inchesKey: 'noseInches', indexKey: 'noseIndex', inches: 68.2},
        {totalKey: 'totalLoadZone1', pallets: ['pallet2', 'pallet3', 'pallet4', 'pallet5'], inchesKey: 'zone1Inches', indexKey: 'zone1Index', inches: 210.5},
        {totalKey: 'totalLoadZone2', pallets: ['pallet6', 'pallet7', 'pallet8', 'pallet9'], inchesKey: 'zone2Inches', indexKey: 'zone2Index', inches: 280.9},
        {totalKey: 'totalLoadZone3', pallets: ['pallet10', 'pallet11', 'pallet12', 'pallet13'], inchesKey: 'zone3Inches', indexKey: 'zone3Index', inches: 351.7},
        {totalKey: 'totalLoadZone4', pallets: ['pallet14', 'pallet15', 'pallet16', 'pallet17'], inchesKey: 'zone4Inches', indexKey: 'zone4Index', inches: 422},
        {totalKey: 'totalLoadAft', pallets: ['pallet18'], inchesKey: 'aftInches', indexKey: 'aftIndex', inches: 466.7}
      ],
      watchKeys: [
        'load.captainWeight', 'load.firstOfficerWeight', 'load.fuelPlan',
        'load.fob', 'load.fuelHaulGallons', 'load.land', 'load.mgtowDeparture',
        'load.mgtowDestination', 'load.pallet1', 'load.pallet10', 'load.pallet11',
        'load.pallet12', 'load.pallet13', 'load.pallet14', 'load.pallet15',
        'load.pallet16', 'load.pallet17', 'load.pallet18', 'load.pallet2',
        'load.pallet3', 'load.pallet4', 'load.pallet5', 'load.pallet6',
        'load.pallet7', 'load.pallet8', 'load.pallet9', 'jsonData',
        'load.departure', 'load.destination'
      ]
    },
    C212: {
      templateUrl: 'assets/files/sheet003.html',
      basicDataKey: 'basic212',
      indexDatum: 246.456,
      indexDivisor: 10000,
      captainInches: 80.7,
      firstOfficerInches: 80.7,
      jumpseatInches: 92.5,
      casaBoxInches: 119.3,
      fuelInches: 229,
      fuelHaulInches: 260,
      rampLimit: 17086,
      mgtowLimit: 16976,
      lmgtowLimit: 16711,
      maxLandingWeight: 16424,
      zfwLimit: 15653,
      defaultMgtow: 16976,
      defaultLand: 16424,
      fuelHaulOffset: 0,
      fuelChartReferenceLbs: 1398,
      fuelChartReferenceCg: -2.3,
      cgChart: {
        plotLeft: 123,
        plotTop: 44,
        plotWidth: 69,
        plotHeight: 240,
        cgMin: -22,
        cgMax: -2,
        weightMin: 10000,
        weightMax: 14000
      },
      zones: [
        {totalKey: 'totalLoadZone1', pallets: ['pallet1'], inchesKey: 'zone1Inches', indexKey: 'zone1Index', inches: 182.7},
        {totalKey: 'totalLoadZone2', pallets: ['pallet2', 'pallet3'], inchesKey: 'zone2Inches', indexKey: 'zone2Index', inches: 218.0},
        {totalKey: 'totalLoadZone3', pallets: ['pallet4', 'pallet5', 'pallet6'], inchesKey: 'zone3Inches', indexKey: 'zone3Index', inches: 256.1},
        {totalKey: 'totalLoadZone4', pallets: ['pallet7', 'pallet8', 'pallet9'], inchesKey: 'zone4Inches', indexKey: 'zone4Index', inches: 301.8},
        {totalKey: 'totalLoadZone5', pallets: ['pallet10', 'pallet11'], inchesKey: 'zone5Inches', indexKey: 'zone5Index', inches: 340.8},
        {totalKey: 'totalLoadZoneA', pallets: ['pallet12', 'pallet13'], inchesKey: 'zoneAInches', indexKey: 'zoneAIndex', inches: 392.9}
      ],
      watchKeys: [
        'load.captainWeight', 'load.firstOfficerWeight', 'load.jumpseatWeight',
        'load.casaBoxWeight', 'load.fuelPlan', 'load.fob', 'load.fuelHaulGallons',
        'load.land', 'load.mgtowDeparture', 'load.mgtowDestination',
        'load.pallet1', 'load.pallet2', 'load.pallet3', 'load.pallet4', 'load.pallet5',
        'load.pallet6', 'load.pallet7', 'load.pallet8', 'load.pallet9', 'load.pallet10',
        'load.pallet11', 'load.pallet12', 'load.pallet13', 'jsonData',
        'load.departure', 'load.destination'
      ]
    }
  };

  function getLoadSheetType(flight) {
    if (!flight || !flight.equipment) return 'C408';
    var shortType = flight.equipment.short;
    var name = flight.equipment.name;
    if (shortType === 'C212' || name === 'Casa') return 'C212';
    if (shortType === 'C408' || name === 'Sky Courier') return 'C408';
    return null;
  }

  function calculateIndex(load, inches, config) {
    return (inches - config.indexDatum) * load / config.indexDivisor;
  }

  function timeFormat(decimalHours) {
    decimalHours = decimalHours * 1;
    var hours = Math.floor(decimalHours);
    var minutes = Math.round((decimalHours - hours) * 60);
    var formattedMinutes = minutes.toString().padStart(2, '0');
    return hours + '+' + formattedMinutes;
  }

  function sumPallets(load, palletKeys) {
    return palletKeys.reduce(function(total, key) {
      return total + (load[key] * 1 || 0);
    }, 0);
  }

  function sumLoadIndexes(load, config) {
    var total = load.aircraftIndex * 1 || 0;
    total += load.captainIndex * 1 || 0;
    total += load.firstOfficerIndex * 1 || 0;
    if (config.jumpseatInches) total += load.jumpseatIndex * 1 || 0;
    if (config.casaBoxInches) total += load.casaBoxIndex * 1 || 0;
    config.zones.forEach(function(zone) {
      total += load[zone.indexKey] * 1 || 0;
    });
    total += load.fuelIndex * 1 || 0;
    total += load.fuelHaulIndex * 1 || 0;
    return total;
  }

  function sumCgIndexes(load, config) {
    var total = load.aircraftIndex * 1 || 0;
    total += load.captainIndex * 1 || 0;
    total += load.firstOfficerIndex * 1 || 0;
    if (config.jumpseatInches) total += load.jumpseatIndex * 1 || 0;
    if (config.casaBoxInches) total += load.casaBoxIndex * 1 || 0;
    config.zones.forEach(function(zone) {
      total += load[zone.indexKey] * 1 || 0;
    });
    return total;
  }

  function calculateChartCg(load, config) {
    var cg = sumCgIndexes(load, config);
    if (config.fuelChartReferenceLbs && load.takeoffFuel) {
      cg += config.fuelChartReferenceCg * (load.takeoffFuel / config.fuelChartReferenceLbs);
    }
    if (load.fuelHaulPounds && load.fuelHaulPounds > 0 && config.fuelChartReferenceLbs) {
      cg += config.fuelChartReferenceCg * (load.fuelHaulPounds / config.fuelChartReferenceLbs);
    }
    return cg;
  }

  function updateCgDotPosition(scope, load, chart) {
    if (!chart || !load) return;
    var cg = load.cg * 1;
    var weight = load.mgtow * 1;
    if (!weight || isNaN(weight)) {
      weight = (load.ow * 1 || 0) + (load.totalLoad * 1 || 0);
    }
    if (!weight || isNaN(weight)) {
      scope.cgDotVisible = false;
      return;
    }
    if (chart.cgMultiplier) {
      cg = cg * chart.cgMultiplier / weight;
    }
    var cgRange = chart.cgMax - chart.cgMin;
    var weightRange = chart.weightMax - chart.weightMin;
    if (!cgRange || !weightRange) {
      scope.cgDotVisible = false;
      return;
    }
    var cgPct = (cg - chart.cgMin) / cgRange;
    var weightPct = (weight - chart.weightMin) / weightRange;
    cgPct = Math.max(0, Math.min(1, cgPct));
    weightPct = Math.max(0, Math.min(1, weightPct));
    scope.cgDotLeft = Math.round(chart.plotLeft + chart.plotWidth * cgPct);
    scope.cgDotTop = Math.round(chart.plotTop + chart.plotHeight * (1 - weightPct));
    scope.cgDotVisible = true;
  }

  function calculateDataFields(scope, config) {
    scope.dirty = true;
    var load = scope.load;
    var i;

    config.zones.forEach(function(zone) {
      load[zone.totalKey] = sumPallets(load, zone.pallets);
      load[zone.inchesKey] = zone.inches;
      load[zone.indexKey] = calculateIndex(load[zone.totalKey], zone.inches, config);
    });

    if (!scope.jsonData) return;

    var distance, ete, fuelRequired, cruiseSpeed, burnRate, extra, legTaxi, firstLegTaxi;
    var minTO, fuelHour, fuel55, fltBO, climbDistance, climbSpeed, climbBurn;

    i = scope.jsonData.distanceNM.map(function(e) { return e.Airport; }).indexOf(load.departure);
    if (i > -1) {
      distance = 1 * (scope.jsonData.distanceNM[i][load.destination]);
      i = scope.jsonData.aircraft.map(function(e) { return e.ID; }).indexOf(scope.flight.aircraft);
      if (i > -1) {
        cruiseSpeed = 1 * scope.jsonData.aircraft[i]['Cruise_Speed'];
        climbDistance = 1 * scope.jsonData.aircraft[i].Dist;
        burnRate = 1 * scope.jsonData.aircraft[i]['Burn Rate'];
        extra = (1 * (scope.jsonData.aircraft[i]['No Alt Res'] || 67)) -
          (1 * (scope.jsonData.aircraft[i]['Low Burn Cruise'] || 0));
        legTaxi = 1 * scope.jsonData.aircraft[i]['Taxi Fuel burn'];
        firstLegTaxi = 1 * scope.jsonData.aircraft[i]['Taxi Fuel'];
        minTO = 1 * scope.jsonData.aircraft[i]['Min TO'];
        fuelHour = 1 * scope.jsonData.aircraft[i]['Low Burn Cruise'];
        fuel55 = 1 * scope.jsonData.aircraft[i].Fuel_55min;
        climbSpeed = 1 * scope.jsonData.aircraft[i]['Climb_Speed'];
        climbBurn = 1 * scope.jsonData.aircraft[i]['Clb Burn'];

        ete = (distance - climbDistance) / cruiseSpeed + climbDistance / climbSpeed;
        fltBO = burnRate * (ete - 0.15) + climbBurn;

        if (load.fuelPlan.label === 'ROUND TRIP NO ALT') {
          fuelRequired = fltBO * 2 + extra + fuelHour + legTaxi;
        }
        if (load.fuelPlan.label === 'ROUND TRIP W/ ALT') {
          fuelRequired = fltBO * 2 + extra + fuelHour + legTaxi + fuel55;
        }
        if (load.fuelPlan.label === 'one way no alt') {
          fuelRequired = fltBO + extra + fuelHour;
        }
        if (load.fuelPlan.label === 'one way w/ alt') {
          fuelRequired = fltBO + extra + fuelHour + fuel55;
        }
        if (!fuelRequired) fuelRequired = 1 * load.fuelPlan.fuel;
        if (fuelRequired < minTO) fuelRequired = minTO;
        load.fuelPlan.fuel = fuelRequired;
      }
    }

    var basicData = scope.jsonData[config.basicDataKey] || [];
    i = basicData.map(function(e) { return e.Aircraft; }).indexOf(load.tailNumber);
    if (i > -1) {
      load.aircraft = basicData[i].longAircraft;
      load.aircraftAsWeighed = basicData[i].Weight * 1;
      load.aircraftInches = basicData[i]['Long Arm'] * 1;
      load.aircraftIndex = calculateIndex(load.aircraftAsWeighed, load.aircraftInches, config);
      load.wbDate = basicData[i].Date;
    }

    load.takeoffFuel = Math.round(load.fuelPlan.fuel);
    load.startFuel = Math.round(load.fuelPlan.fuel + (firstLegTaxi || 0));
    load.fob = load.fob * 1 || 0;
    if (load.startFuel < load.fob) load.requestGallons = 0;
    else load.requestGallons = Math.round(10 * (load.startFuel * 1 - load.fob) / 6.7) / 10;

    if (config.sheetType === 'C212') {
      var startFuelLbs = load.startFuel * 1 || 0;
      var fobLbs = load.fob * 1 || 0;
      var singlePointBase = startFuelLbs > 2479 ? 2479 : startFuelLbs;
      load.singlePointGal = Math.round(10 * (singlePointBase - fobLbs) / 6.7) / 10;
      load.eachOutboardGal = startFuelLbs <= 2479
        ? 0
        : Math.round(10 * (startFuelLbs - 2479) / (6.7 * 2)) / 10;
    }

    if (burnRate) load.fuelHours = timeFormat(load.fuelPlan.fuel / burnRate);
    if (fltBO) {
      load.burnOff1 = Math.round(fltBO);
      load.fuelRemain1 = Math.round(load.fuelPlan.fuel - fltBO);
    }
    if (distance) load.distance = distance;
    if (ete) load.flightTime = timeFormat(ete);
    if (burnRate) load.cruisePPH = burnRate;

    load.captainInches = config.captainInches;
    load.firstOfficerInches = config.firstOfficerInches;
    load.captainIndex = calculateIndex(load.captainWeight, config.captainInches, config);
    load.firstOfficerIndex = calculateIndex(load.firstOfficerWeight, config.firstOfficerInches, config);

    if (config.jumpseatInches) {
      load.jumpseatInches = config.jumpseatInches;
      load.jumpseatIndex = calculateIndex(load.jumpseatWeight, config.jumpseatInches, config);
    }
    if (config.casaBoxInches) {
      load.casaBoxInches = config.casaBoxInches;
      load.casaBoxIndex = calculateIndex(load.casaBoxWeight, config.casaBoxInches, config);
    }

    load.owe = (load.aircraftAsWeighed * 1 || 0) + (load.captainWeight * 1 || 0) + (load.firstOfficerWeight * 1 || 0);
    if (config.sheetType === 'C212') {
      load.owe += (load.jumpseatWeight * 1 || 0) + (load.casaBoxWeight * 1 || 0);
    }

    load.ow = load.owe + load.takeoffFuel;
    load.rampLimit = config.rampLimit;
    load.mgtowLimit = config.mgtowLimit;
    load.lmgtowLimit = config.lmgtowLimit;
    load.maxLandingWeight = config.maxLandingWeight;
    load.zfwLimit = config.zfwLimit;

    load.totalLoad = config.zones.reduce(function(total, zone) {
      return total + (load[zone.totalKey] * 1 || 0);
    }, 0);

    load.mgtow = load.ow + load.totalLoad;
    load.lmgtow = load.mgtow;
    load.rampWeight = load.mgtow + 70;
    load.landingWeight = load.mgtow - Math.round(fltBO || 0);
    load.zfw = load.owe + load.totalLoad;
    load.loadAvailable = load.mgtowLimit - load.ow;
    load.loadRemaining = load.loadAvailable - load.totalLoad;

    if (load.fuelHaulGallons && load.fuelHaulGallons > 0) {
      load.fuelHaulPounds = load.fuelHaulGallons * 6.7 + config.fuelHaulOffset;
    } else load.fuelHaulPounds = 0;

    load.fuelInches = config.fuelInches;
    load.fuelIndex = calculateIndex(load.takeoffFuel, config.fuelInches, config);
    load.fuelHaulInches = config.fuelHaulInches;
    load.fuelHaulIndex = calculateIndex(load.fuelHaulPounds, config.fuelHaulInches, config);

    if (config.fuelChartReferenceLbs) {
      load.cg = calculateChartCg(load, config);
    } else {
      load.cg = sumLoadIndexes(load, config);
    }

    if (config.cgChart) updateCgDotPosition(scope, load, config.cgChart);

    scope.dirty = false;
  }

  function ensureLoadsStylesheet() {
    if (document.querySelector('link[data-loads-stylesheet]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/files/stylesheet.css';
    link.setAttribute('data-loads-stylesheet', 'true');
    document.head.appendChild(link);
  }

  function markLoadSheetStructure(element) {
    var mainTable = element[0].querySelector('table');
    if (!mainTable) return;
    mainTable.classList.add('loads-sheet-main');
    var headerRow = mainTable.querySelector('tbody > tr:nth-child(2)');
    if (!headerRow) return;
    headerRow.classList.add('loads-sheet-header-row');
    var bannerCell = headerRow.querySelector('td[colspan="5"]');
    if (bannerCell) bannerCell.classList.add('loads-sheet-header-banner');
  }

  function setHtml(scope, element) {
    angular.forEach(
      element[0].querySelectorAll('[data-field]'),
      function(td) {
        var field = td.getAttribute('data-field');
        var type = td.getAttribute('data-type');
        var inputType = 'number';
        if (type === 'input') {
          scope.load[field] = scope.load[field] || 0;
          if (field === 'departure' || field === 'destination') inputType = 'text';
          td.innerHTML =
            '<input type="' + inputType + '" ng-blur="save()"' +
            ' class="load-input" ng-model-options="{updateOn:\'blur\'}" ' +
            'ng-model="load.' + field + '">';
        }
        if (type === 'dropdown') {
          td.innerHTML =
            "<ui-select style='line-height:14px;height:14px' ng-model='load." + field + "' theme='selectize' class='shorter-ui-select' on-select='save()'> " +
              "<ui-select-match style='line-height:14px;height:14px' placeholder='None'>{{$select.selected.label}}</ui-select-match> " +
              "<ui-select-choices repeat='choice in " + JSON.stringify(scope.jsonData.choices) + "' > " +
                "<div ng-bind-html='choice.label | highlight: $select.search'></div> " +
              "</ui-select-choices> " +
            "</ui-select>";
        }
        if (type === 'data' || !type) {
          if (field === 'cg' || (field.length >= 5 && field.slice(-5) === 'Index')) {
            td.innerHTML = '{{load.' + field + ' | number : 1}}';
          } else if (field === 'singlePointGal' || field === 'eachOutboardGal') {
            td.innerHTML = '{{load.' + field + ' | number : 1}}';
          } else {
            td.innerHTML = '{{load.' + field + '}}';
          }
        }
        $compile(td)(scope);
      }
    );
  }

  function initLoadSheet(scope, element, config) {
    scope.load = JSON.parse(JSON.stringify(scope.flight.loadsObject || {}));
    scope.load.tailNumber = scope.load.tailNumber || scope.flight.aircraft.replace(/\D/g, '');
    if (scope.flight.pfr && scope.flight.pfr.pilotData && scope.flight.pfr.pilotData.weight) {
      scope.load.captainWeight = scope.load.captainWeight || scope.flight.pfr.pilotData.weight * 1;
    }
    if (scope.flight.pfr && scope.flight.pfr.coPilotData && scope.flight.pfr.coPilotData.weight) {
      scope.load.firstOfficerWeight = scope.load.firstOfficerWeight || scope.flight.pfr.coPilotData.weight * 1;
    }
    if (scope.flight.fuelPreviouslyOnboard) scope.load.fob = scope.load.fob || scope.flight.fuelPreviouslyOnboard * 1;
    if (scope.flight.airportObjs && scope.flight.airportObjs[0] && scope.flight.airportObjs[0].airport && scope.flight.airportObjs[0].airport.threeLetter) {
      scope.load.departure = scope.load.departure || scope.flight.airportObjs[0].airport.threeLetter;
    }
    if (scope.flight.airportObjs && scope.flight.airportObjs[1] && scope.flight.airportObjs[1].airport && scope.flight.airportObjs[1].airport.threeLetter) {
      scope.load.destination = scope.load.destination || scope.flight.airportObjs[1].airport.threeLetter;
    }
    scope.load.date = scope.flight.date;
    scope.load.flightNum = scope.load.flightNum || scope.flight.flightNum;
    scope.load.mgtowDeparture = scope.load.mgtowDeparture || config.defaultMgtow;
    scope.load.mgtowDestination = scope.load.mgtowDestination || config.defaultMgtow;
    scope.load.land = scope.load.land || config.defaultLand;

    scope.dirty = false;
    scope.loadSheetType = config.sheetType;

    $http.get('assets/files/data.json').then(function(res) {
      scope.jsonData = res.data;
      scope.load.fuelPlan = scope.load.fuelPlan || {
        label: 'ROUND TRIP NO ALT',
        fuel: config.sheetType === 'C212' ? '1173' : '1329'
      };
      setHtml(scope, element);
      calculateDataFields(scope, config);
    }).catch(function(err) {
      console.log(err);
    });

    scope.$watchGroup(config.watchKeys, function() {
      scope.dirty = true;
      calculateDataFields(scope, config);
    });

    scope.save = function() {
      $timeout(function() {
        if (scope.dirty) return $timeout(function() { scope.save(); }, 200);
        $http.patch('/api/todaysFlights/' + scope.flight._id, {loadsObject: scope.load})
          .then(function() {
            console.log('Successful Save');
          });
      }, 0);
    };

    scope.printLoadSheet = function() {
      var inputs = element[0].querySelectorAll('.load-input');
      angular.forEach(inputs, function(input) {
        input.blur();
      });
      $timeout(function() {
        if (scope.dirty) return $timeout(scope.printLoadSheet, 200);

        var clone = element[0].cloneNode(true);
        var toolbarEl = clone.querySelector('.loads-print-toolbar');
        if (toolbarEl) toolbarEl.parentNode.removeChild(toolbarEl);

        var originalInputs = element[0].querySelectorAll('input.load-input');
        var cloneInputs = clone.querySelectorAll('input.load-input');
        for (var i = 0; i < originalInputs.length; i++) {
          cloneInputs[i].setAttribute('value', originalInputs[i].value);
        }

        var originalSelects = element[0].querySelectorAll('.shorter-ui-select');
        var cloneSelects = clone.querySelectorAll('.shorter-ui-select');
        for (var j = 0; j < originalSelects.length; j++) {
          var selectInput = originalSelects[j].querySelector('.selectize-input');
          var selectedText = selectInput ? selectInput.textContent.trim() : '';
          var textNode = document.createElement('span');
          textNode.className = 'loads-print-field-text';
          textNode.textContent = selectedText;
          cloneSelects[j].parentNode.replaceChild(textNode, cloneSelects[j]);
        }

        var sheetHtml = clone.innerHTML.replace(/@page\s*\{[^}]*\}/gi, '');
        var pageMarginCss = '1in';
        var printableWidthIn = 6.5;
        var printableHeightIn = 9;
        if (config.sheetType === 'C408') {
          pageMarginCss = '1in 0.85in 1in 0.85in';
          printableWidthIn = 6.8;
        }
        var printBodyClass = 'loads-print-' + config.sheetType.toLowerCase();

        var iframe = document.createElement('iframe');
        iframe.setAttribute(
          'style',
          'position:absolute;left:-10000px;top:0;width:8.5in;height:11in;border:0;visibility:hidden'
        );
        document.body.appendChild(iframe);
        var printWindow = iframe.contentWindow;
        var doc = printWindow.document;

        doc.open();
        doc.write(
          '<!DOCTYPE html><html><head><meta charset="utf-8">' +
          '<link rel="stylesheet" href="assets/files/stylesheet.css">' +
          '<link rel="stylesheet" href="components/loads/loads.css">' +
          '<style>' +
          'html, body { margin: 0; padding: 0; overflow: hidden; }' +
          'body { width: ' + printableWidthIn + 'in; height: ' + printableHeightIn + 'in; }' +
          '.loads-print-scale { width: 526pt; padding-right: 1pt; box-sizing: content-box; overflow-x: clip; overflow-y: hidden; }' +
          '.loads-print-scale table.loads-sheet-main { border-right: 1pt solid windowtext; }' +
          '.loads-print-scale table.loads-sheet-main > tbody > tr > td:last-child { border-right: 1pt solid windowtext; }' +
          '.loads-print-compact table.loads-sheet-main > tbody > tr { height: auto !important; }' +
          '.loads-print-compact table.loads-sheet-main td { line-height: 1.05 !important; padding-top: 0 !important; padding-bottom: 0 !important; }' +
          '.loads-print-compact table.loads-sheet-main .load-chart-overlay { transform: scale(0.94); transform-origin: top left; }' +
          '</style>' +
          '<style>@page { size: letter portrait; margin: ' + pageMarginCss + '; }</style>' +
          '</head><body class="' + printBodyClass + '">' +
          '<div class="loads-sheet-wrap loads-print-scale">' + sheetHtml + '</div>' +
          '</body></html>'
        );
        doc.close();

        var removeIframe = function() {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        };

        var applyZoomAndPrint = function() {
          var wrap = doc.querySelector('.loads-print-scale');
          var body = doc.body;
          if (!wrap || !wrap.offsetWidth || !wrap.offsetHeight) {
            return $timeout(applyZoomAndPrint, 100);
          }

          if (config.sheetType === 'C408') {
            body.classList.add('loads-print-compact');
            void wrap.offsetHeight;
          }

          var printableWidthPx = printableWidthIn * 96;
          var printableHeightPx = printableHeightIn * 96;
          var widthScale = printableWidthPx / wrap.offsetWidth;
          var heightNeeded = wrap.offsetHeight * widthScale;

          if (heightNeeded > printableHeightPx) {
            body.classList.add('loads-print-compact');
            heightNeeded = wrap.offsetHeight * widthScale;
          }

          var printScale = heightNeeded <= printableHeightPx
            ? widthScale
            : (printableHeightPx / wrap.offsetHeight) * 0.995;
          wrap.style.zoom = printScale.toFixed(4);

          printWindow.onafterprint = removeIframe;
          printWindow.focus();
          printWindow.print();
          $timeout(removeIframe, 2000);
        };

        var styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        var stylesPending = styleLinks.length;
        var stylesReady = false;
        var startPrint = function() {
          if (stylesReady) return;
          stylesReady = true;
          $timeout(applyZoomAndPrint, 50);
        };

        if (!stylesPending) {
          $timeout(startPrint, 100);
        } else {
          angular.forEach(styleLinks, function(link) {
            link.addEventListener('load', function() {
              stylesPending--;
              if (stylesPending <= 0) startPrint();
            });
            link.addEventListener('error', function() {
              stylesPending--;
              if (stylesPending <= 0) startPrint();
            });
          });
          $timeout(startPrint, 800);
        }
      }, 100);
    };
  }

  return {
    scope: {
      flight: '=',
      save: '&'
    },
    link: function(scope, element) {
      ensureLoadsStylesheet();
      element.addClass('loads-directive loads-sheet-wrap');
      scope.cgDotVisible = false;
      var sheetType = getLoadSheetType(scope.flight);
      if (!sheetType || !LOAD_SHEET_CONFIGS[sheetType]) {
        element.html('<p class="load-sheet-unsupported">Load sheet is not available for this aircraft type.</p>');
        return;
      }

      var config = angular.copy(LOAD_SHEET_CONFIGS[sheetType]);
      config.sheetType = sheetType;

      $http.get(config.templateUrl).then(function(res) {
        var toolbar = angular.element(
          '<div class="loads-print-toolbar">' +
            '<button type="button" class="btn btn-default btn-sm loads-print-btn" ng-click="printLoadSheet()">' +
              '<i class="fa fa-print" aria-hidden="true"></i> Print Load Sheet' +
            '</button>' +
          '</div>'
        );
        element.append(toolbar);
        var temp = angular.element('<div>').html(res.data);
        element.append(temp.contents());
        markLoadSheetStructure(element);
        $compile(element.contents())(scope);
        initLoadSheet(scope, element, config);
      }).catch(function(err) {
        console.log(err);
        element.html('<p class="load-sheet-unsupported">Unable to load sheet template.</p>');
      });
    }
  };
});
