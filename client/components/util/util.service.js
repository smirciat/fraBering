'use strict';

(function() {

  /**
   * The Util service is for thin, globally reusable, utility functions
   */
  function UtilService($window) {
    var Util = {
      /**
       * Return a callback or noop function
       *
       * @param  {Function|*} cb - a 'potential' function
       * @return {Function}
       */
      safeCb(cb) {
        return angular.isFunction(cb) ? cb : angular.noop;
      },

      /**
       * Parse a given url with the use of an anchor element
       *
       * @param  {String} url - the url to parse
       * @return {Object}     - the parsed url, anchor element
       */
      urlParse(url) {
        var a = document.createElement('a');
        a.href = url;

        // Special treatment for IE, see http://stackoverflow.com/a/13405933 for details
        if (a.host === '') {
          a.href = a.href;
        }

        return a;
      },

      /**
       * Test whether or not a given url is same origin
       *
       * @param  {String}           url       - url to test
       * @param  {String|String[]}  [origins] - additional origins to test against
       * @return {Boolean}                    - true if url is same origin
       */
      isSameOrigin(url, origins) {
        url = Util.urlParse(url);
        origins = origins && [].concat(origins) || [];
        origins = origins.map(Util.urlParse);
        origins.push($window.location);
        origins = origins.filter(function(o) {
          let hostnameCheck = url.hostname === o.hostname;
          let protocolCheck = url.protocol === o.protocol;
          // 2nd part of the special treatment for IE fix (see above):  
          // This part is when using well-known ports 80 or 443 with IE,
          // when $window.location.port==='' instead of the real port number.
          // Probably the same cause as this IE bug: https://goo.gl/J9hRta
          let portCheck = url.port === o.port || o.port === '' && (url.port === '80' || url
            .port === '443');
          return hostnameCheck && protocolCheck && portCheck;
        });
        return origins.length >= 1;
      },

      /**
       * Firebase pilot record: empNumber, or _id if empNumber missing (both strings).
       */
      pilotEmpNumber(pilotObject) {
        if (!pilotObject) {
          return '';
        }
        if (pilotObject.empNumber != null && String(pilotObject.empNumber) !== '') {
          return String(pilotObject.empNumber);
        }
        if (pilotObject._id != null && String(pilotObject._id) !== '') {
          return String(pilotObject._id);
        }
        return '';
      },

      /**
       * Red Dog (PADG) directional wind limits — dispatch vs OC release (kts, magnetic).
       */
      redDogWindLimitsForDirection(direction) {
        let d = parseInt(direction, 10);
        if (isNaN(d)) return { dispatch: 25, oc: 30 };
        if (d >= 330 || d <= 90) return { dispatch: 25, oc: 30 };
        if (d >= 91 && d <= 150) return { dispatch: 15, oc: 20 };
        if (d >= 151 && d <= 270) return { dispatch: 25, oc: 30 };
        if (d >= 271 && d <= 329) return { dispatch: 15, oc: 20 };
        return { dispatch: 25, oc: 30 };
      },

      /** Gambell (PAGM) Casa crosswind limits (kts). */
      gambellCasaCrosswindLimits() {
        return { yellow: 20, orange: 25 };
      },

      /** Match Firebase flight dateString field (MM/DD/YY). */
      formatFirebaseDate(date) {
        let d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return mm + '/' + dd + '/' + yy;
      },

      /**
       * Normalize helicopter departure text for hub matching.
       * Pilots use OME, Nome, PAOM, Nome AK, etc. interchangeably.
       */
      normalizeHeliDeparture(dep) {
        if (!dep) return '';
        let s = String(dep).trim().toUpperCase();
        s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        s = s.replace(/\s+AK$/, '').trim();
        return s;
      },

      /** Accepted spellings per fuel-page hub (OME / OTZ / UNK). */
      heliDepartureHubAliases() {
        return {
          OME: ['OME', 'PAOM', 'NOME', 'NOME AIRPORT', 'NOME FIELD','OMEBA'],
          OTZ: ['OTZ', 'PAOT', 'KOTZEBUE', 'KOTZ', 'KOTZEBUE AK', 'KOTZEBUE AIRPORT', 'OTZBA', 'RALPH WIEN', 'RALPH WIEN MEMORIAL', 'RALPH WIEN MEM AIRPORT', 'KOTZEBUE, AK'],
          UNK: ['UNK', 'PAUN', 'UNALAKLEET', 'UNALAKLEET AIRPORT']
        };
      },

      heliDepartureMatchesHub(dep, hubBase) {
        if (!hubBase || hubBase === 'HEL') return true;
        let norm = Util.normalizeHeliDeparture(dep);
        if (!norm) return false;
        let aliases = Util.heliDepartureHubAliases()[hubBase];
        if (!aliases) return false;
        for (let i = 0; i < aliases.length; i++) {
          let alias = aliases[i];
          if (norm === alias) return true;
          if (norm.indexOf(alias) > -1) return true;
        }
        return false;
      },

      cruiseSpeedKts(equipmentName) {
        if (!equipmentName) return 160;
        if (equipmentName === 'King Air' || equipmentName === 'Beech 1900') return 250;
        if (equipmentName === 'Casa') return 200;
        if (equipmentName === 'Sky Courier') return 200;
        return 160;
      },

      minutesFromTimeString(timeStr) {
        if (!timeStr) return 0;
        let parts = String(timeStr).trim().split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      },

      scheduledBlockMinutes(flight) {
        if (!flight || !flight.departTimes || !flight.departTimes.length) return 0;
        let start = Util.minutesFromTimeString(flight.departTimes[0]);
        let end = Util.minutesFromTimeString(flight.departTimes[flight.departTimes.length - 1]);
        let mins = end - start;
        if (mins < 0) mins += 24 * 60;
        return mins;
      },

      haversineNm(lat1, lon1, lat2, lon2) {
        let R = 3443.8;
        let dLat = (lat2 - lat1) * Math.PI / 180;
        let dLon = (lon2 - lon1) * Math.PI / 180;
        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      },

      findAirportCoords(airportName, flight) {
        if (!airportName || !flight) return null;
        let objs = flight.airportObjs || flight.airportObjsLocked || [];
        let target = String(airportName).trim().toUpperCase();
        for (let i = 0; i < objs.length; i++) {
          let ap = objs[i].airport;
          if (!ap) continue;
          let name = String(ap.name || '').toUpperCase();
          let three = String(ap.threeLetter || '').toUpperCase();
          if (name === target || three === target || name.indexOf(target) > -1 || target.indexOf(name) > -1) {
            let lat = parseFloat(ap.latitude);
            let lon = parseFloat(ap.longitude);
            if (!isNaN(lat) && !isNaN(lon)) return { lat: lat, lon: lon };
          }
        }
        return null;
      },

      estimatedRouteMinutes(flight) {
        if (!flight || !flight.airports || flight.airports.length < 2) return 0;
        let speed = Util.cruiseSpeedKts(flight.equipment && flight.equipment.name);
        let total = 0;
        for (let i = 0; i < flight.airports.length - 1; i++) {
          let c1 = Util.findAirportCoords(flight.airports[i], flight);
          let c2 = Util.findAirportCoords(flight.airports[i + 1], flight);
          if (!c1 || !c2) continue;
          total += 60 * Util.haversineNm(c1.lat, c1.lon, c2.lat, c2.lon) / speed + 10;
        }
        return Math.round(total);
      },

      isStandbyCharter(flight) {
        if (!flight || !flight.operation) return false;
        if (String(flight.operation).toLowerCase().indexOf('charter') < 0) return false;
        let airports = flight.airports || [];
        let legCount = airports.length > 0 ? airports.length - 1 : 0;
        if (legCount < 2) return false;
        let standbyAllowance = legCount * 30;
        let scheduled = Util.scheduledBlockMinutes(flight);
        let routeMins = Util.estimatedRouteMinutes(flight);
        if (!routeMins) {
          routeMins = legCount * 45;
        }
        return scheduled > routeMins + standbyAllowance;
      },

      operationDisplay(flight) {
        if (!flight || !flight.operation) return '';
        if (Util.isStandbyCharter(flight)) return 'Standby Charter';
        return flight.operation;
      },

      initStandbyLegTimes(flight) {
        if (!flight) return [];
        if (!flight.miscObject) flight.miscObject = {};
        if (!flight.miscObject.standbyLegTimes) flight.miscObject.standbyLegTimes = [];
        let airports = flight.airports || [];
        for (let i = 1; i < airports.length - 1; i++) {
          let airport = airports[i];
          let row = flight.miscObject.standbyLegTimes.find(e => e.airport === airport);
          if (!row) {
            row = { airport: airport, arrival: '', departure: '' };
            flight.miscObject.standbyLegTimes.push(row);
          }
        }
        return flight.miscObject.standbyLegTimes;
      },

      initFlightEtaFields(flight) {
        if (!flight) return;
        if (!flight.miscObject) flight.miscObject = {};
        let m = flight.miscObject;
        if (m.updatedEta === undefined) m.updatedEta = '';
        if (m.terminatedAwayFromBase === undefined) m.terminatedAwayFromBase = false;
        if (m.terminationLocation === undefined) m.terminationLocation = '';
        if (m.terminationCompletionTime === undefined) m.terminationCompletionTime = '';
        if (m.terminationReason === undefined) m.terminationReason = '';
      },

      plannedFinalEta(flight) {
        if (!flight) return '';
        let times = flight.arriveTimes && flight.arriveTimes.length ? flight.arriveTimes : flight.departTimes;
        if (!times || !times.length) return '';
        let t = times[times.length - 1];
        if (!t) return '';
        return String(t).substring(0, 5);
      },

      minutesNowLocal() {
        let d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      },

      minutesToHHMM(totalMinutes) {
        let mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
        let h = Math.floor(mins / 60);
        let m = mins % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      },

      actualDepartOffsetMinutes(flight) {
        if (!flight || !flight.tfliteDepart || !flight.departTimes || !flight.departTimes.length) return 0;
        return Util.minutesFromTimeString(flight.tfliteDepart) - Util.minutesFromTimeString(flight.departTimes[0]);
      },

      /** Standby intermediate times overdue by 30+ min (actual depart vs plan). */
      standbyIntermediateNags(flight) {
        let nags = [];
        if (!Util.isStandbyCharter(flight)) return nags;
        if (!flight.tfliteDepart) return nags;
        if (!(flight.dispatchRelease || flight.ocRelease)) return nags;
        if (!flight.airports || flight.airports.length < 3) return nags;
        let offset = Util.actualDepartOffsetMinutes(flight);
        let now = Util.minutesNowLocal();
        Util.initStandbyLegTimes(flight);
        let rows = flight.miscObject.standbyLegTimes || [];
        for (let i = 1; i < flight.airports.length - 1; i++) {
          let airport = flight.airports[i];
          let row = rows.find(e => e.airport === airport) || { airport: airport, arrival: '', departure: '' };
          let planArrive = Util.minutesFromTimeString((flight.arriveTimes && flight.arriveTimes[i]) || flight.departTimes[i]);
          let planDepart = Util.minutesFromTimeString(flight.departTimes[i]);
          let estArrive = planArrive + offset;
          let estDepart = planDepart + offset;
          if ((!row.arrival || !String(row.arrival).trim()) && now > estArrive + 30) {
            nags.push({
              airport: airport,
              field: 'arrival',
              planTime: Util.minutesToHHMM(estArrive),
              flightNum: flight.flightNum,
              aircraft: flight.aircraft
            });
          }
          if ((!row.departure || !String(row.departure).trim()) && now > estDepart + 30) {
            nags.push({
              airport: airport,
              field: 'departure',
              planTime: Util.minutesToHHMM(estDepart),
              flightNum: flight.flightNum,
              aircraft: flight.aircraft
            });
          }
        }
        return nags;
      }
    };

    return Util;
  }

  angular.module('workspaceApp.util')
    .factory('Util', UtilService);
})();
