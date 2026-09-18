'use strict';

angular.module('workspaceApp')
  .factory('rotPilotExpDate', function rotPilotExpDateFactory() {
    const shortMonths = [];
    for (let m = 1; m < 13; m++) {
      shortMonths.push(new Date(m + '/1/2024').toLocaleString('default', {month: 'short'}));
    }

    function parsePilotExpDate(str) {
      if (str === null || str === undefined || str === '') return null;
      const raw = String(str).trim();
      if (!raw) return null;

      const dashParts = raw.split('-');
      if (dashParts.length === 2 && shortMonths.indexOf(dashParts[0]) > -1) {
        let month = shortMonths.indexOf(dashParts[0]) + 1;
        let year = parseInt(dashParts[1], 10);
        if (isNaN(year)) return null;
        if (year < 100) year += 2000;
        return new Date(year, month, 0);
      }

      const parts = raw.split('/');
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        let year = parseInt(parts[1], 10);
        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
        if (year < 100) year += 2000;
        return new Date(year, month, 0);
      }
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (isNaN(year)) return null;
        if (year < 100) year += 2000;
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        if (isNaN(month) || isNaN(day)) return null;
        return new Date(year, month - 1, day);
      }

      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    function formatPilotExpDate(dateOrStr) {
      const d = dateOrStr instanceof Date ? dateOrStr : parsePilotExpDate(dateOrStr);
      if (!d || isNaN(d.getTime())) {
        return dateOrStr === null || dateOrStr === undefined ? null : String(dateOrStr);
      }
      const m = d.getMonth() + 1;
      const yy = d.getFullYear() % 100;
      return m + '/' + yy;
    }

    const api = {parsePilotExpDate, formatPilotExpDate};
    window.rotPilotExpDate = api;
    return api;
  });
