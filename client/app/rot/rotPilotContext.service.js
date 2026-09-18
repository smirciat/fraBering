'use strict';

angular.module('workspaceApp')
  .factory('RotPilotContext', function($http, $q) {
    let state = {
      allPilots: [],
      pilots: [],
      chosenPilot: null,
      loadPromise: null,
      showArchived: false
    };

    function pilotLegalName(pilot) {
      if (!pilot) return '';
      let legal = pilot.legalName && String(pilot.legalName).trim();
      if (legal) return legal;
      let payroll = pilot.payrollName && String(pilot.payrollName).trim();
      if (payroll) return payroll;
      return pilot.name || pilot.displayName || '';
    }

    function isRotPilotCandidate(pilot) {
      return pilot && pilot.name && pilot.name !== '' &&
        pilot.pilotBase && pilot.pilotBase !== 'none';
    }

    /** #43 — archived pilots hidden from ROT lists unless “show archived” is on. */
    function isPilotArchived(pilot) {
      if (!pilot) return false;
      if (pilot.rotArchived === true) return true;
      if (pilot.isActive === false) return true;
      return false;
    }

    function sortPilots(pilots) {
      return pilots.sort((a, b) => pilotLegalName(a).localeCompare(pilotLegalName(b)));
    }

    function applyVisiblePilotList() {
      state.pilots = sortPilots(state.allPilots.filter(pilot => {
        if (!isRotPilotCandidate(pilot)) return false;
        if (!state.showArchived && isPilotArchived(pilot)) return false;
        return true;
      }));
      if (state.chosenPilot && !state.showArchived && isPilotArchived(state.chosenPilot)) {
        state.chosenPilot = defaultPilot();
      } else if (state.chosenPilot) {
        let idx = state.pilots.map(e => e._id).indexOf(state.chosenPilot._id);
        if (idx > -1) state.chosenPilot = state.pilots[idx];
        else if (!state.showArchived) state.chosenPilot = defaultPilot();
      }
      if (!state.chosenPilot && state.pilots.length) state.chosenPilot = defaultPilot();
    }

    function defaultPilot() {
      let index = state.pilots.map(e => e.displayName).indexOf('K. Janke');
      if (index > -1) return state.pilots[index];
      return state.pilots.length ? state.pilots[0] : null;
    }

    function loadPilots() {
      if (state.loadPromise) return state.loadPromise;
      state.loadPromise = $http.post('/api/rot/firebase', {collection: 'pilots'}).then(res => {
        state.allPilots = (res.data || []).filter(isRotPilotCandidate);
        applyVisiblePilotList();
        if (!state.chosenPilot) state.chosenPilot = defaultPilot();
        return state.pilots;
      }).catch(err => {
        state.loadPromise = null;
        return $q.reject(err);
      });
      return state.loadPromise;
    }

    function mergePilotDoc(doc) {
      if (!doc || doc._id === undefined || doc._id === null) return;
      let idx = state.allPilots.map(e => e._id).indexOf(doc._id);
      if (idx > -1) Object.assign(state.allPilots[idx], doc);
      else state.allPilots.push(doc);
      applyVisiblePilotList();
    }

    return {
      loadPilots: loadPilots,
      pilotLegalName: pilotLegalName,
      isPilotArchived: isPilotArchived,
      getPilots: function() { return state.pilots; },
      getAllPilots: function() { return state.allPilots; },
      getChosenPilot: function() { return state.chosenPilot; },
      setChosenPilot: function(pilot) { state.chosenPilot = pilot; },
      getShowArchived: function() { return state.showArchived; },
      setShowArchived: function(show) {
        state.showArchived = !!show;
        applyVisiblePilotList();
        return state.pilots;
      },
      mergePilotDoc: mergePilotDoc,
      refreshPilotLists: applyVisiblePilotList,
      getEmployeeId: function() {
        if (!state.chosenPilot || state.chosenPilot._id === undefined || state.chosenPilot._id === null) return null;
        return String(state.chosenPilot._id);
      }
    };
  });
