'use strict';

angular.module('workspaceApp')
  .factory('RotPilotContext', function($http, $q) {
    let state = {
      pilots: [],
      chosenPilot: null,
      loadPromise: null
    };

    function filterPilots(pilots) {
      return pilots.filter(pilot => {
        return pilot.name && pilot.name !== '' &&
          (pilot.isActive === undefined || pilot.isActive) &&
          pilot.pilotBase && pilot.pilotBase !== 'none';
      }).sort((a, b) => a.name.localeCompare(b.name));
    }

    function defaultPilot() {
      let index = state.pilots.map(e => e.displayName).indexOf('K. Janke');
      if (index > -1) return state.pilots[index];
      return state.pilots.length ? state.pilots[0] : null;
    }

    function loadPilots() {
      if (state.loadPromise) return state.loadPromise;
      state.loadPromise = $http.post('/api/rot/firebase', {collection: 'pilots'}).then(res => {
        state.pilots = filterPilots(res.data);
        if (!state.chosenPilot) state.chosenPilot = defaultPilot();
        return state.pilots;
      }).catch(err => {
        state.loadPromise = null;
        return $q.reject(err);
      });
      return state.loadPromise;
    }

    return {
      loadPilots: loadPilots,
      getPilots: function() { return state.pilots; },
      getChosenPilot: function() { return state.chosenPilot; },
      setChosenPilot: function(pilot) { state.chosenPilot = pilot; },
      getEmployeeId: function() {
        if (!state.chosenPilot || state.chosenPilot._id === undefined || state.chosenPilot._id === null) return null;
        return String(state.chosenPilot._id);
      }
    };
  });
