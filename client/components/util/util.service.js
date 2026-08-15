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
          OME: ['OME', 'PAOM', 'NOME', 'NOME AIRPORT', 'NOME FIELD'],
          OTZ: ['OTZ', 'PAOT', 'KOTZEBUE', 'KOTZ', 'RALPH WIEN MEMORIAL'],
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
      }
    };

    return Util;
  }

  angular.module('workspaceApp.util')
    .factory('Util', UtilService);
})();
