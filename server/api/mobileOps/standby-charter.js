'use strict';

const STANDBY_GROUND_MINUTES = 45;

function minutesFromTimeString(time) {
  if (!time) return 0;
  const parts = String(time).trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function minutesToHHMM(totalMinutes) {
  const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function intermediateGroundMinutes(flight, index) {
  const arrive = flight.arriveTimes && flight.arriveTimes[index];
  const depart = flight.departTimes && flight.departTimes[index];
  if (!arrive || !depart) return 0;
  let ground = minutesFromTimeString(depart) - minutesFromTimeString(arrive);
  if (ground < 0) ground += 24 * 60;
  return ground;
}

function isStandbyCharter(flight) {
  const f = flight.dataValues || flight;
  if (!f || !f.operation) return false;
  if (String(f.operation).toLowerCase().indexOf('charter') < 0) return false;
  if (!f.airports || f.airports.length < 3) return false;
  if (!f.departTimes || f.departTimes.length < 2) return false;
  for (let i = 1; i < f.airports.length - 1; i++) {
    if (intermediateGroundMinutes(f, i) >= STANDBY_GROUND_MINUTES) return true;
  }
  return false;
}

function initStandbyLegTimes(flight) {
  const f = flight.dataValues || flight;
  if (!f) return [];
  if (!f.miscObject) f.miscObject = {};
  if (!f.miscObject.standbyLegTimes) f.miscObject.standbyLegTimes = [];
  const airports = f.airports || [];
  for (let i = 1; i < airports.length - 1; i++) {
    const airport = airports[i];
    const qualifies = intermediateGroundMinutes(f, i) >= STANDBY_GROUND_MINUTES;
    let row = f.miscObject.standbyLegTimes.find(e => e.airport === airport);
    const hasData =
      row &&
      ((row.arrival && String(row.arrival).trim()) ||
        (row.departure && String(row.departure).trim()));
    if (!qualifies && !hasData) continue;
    if (!row) {
      row = { airport: airport, arrival: '', departure: '' };
      f.miscObject.standbyLegTimes.push(row);
    }
  }
  f.miscObject.standbyLegTimes = f.miscObject.standbyLegTimes.filter(row => {
    const idx = airports.indexOf(row.airport);
    if (idx < 1 || idx >= airports.length - 1) return false;
    if (intermediateGroundMinutes(f, idx) >= STANDBY_GROUND_MINUTES) return true;
    return (
      (row.arrival && String(row.arrival).trim()) ||
      (row.departure && String(row.departure).trim())
    );
  });
  return f.miscObject.standbyLegTimes;
}

function plannedFinalEta(flight) {
  const f = flight.dataValues || flight;
  if (!f) return '';
  const times =
    f.arriveTimes && f.arriveTimes.length ? f.arriveTimes : f.departTimes;
  if (!times || !times.length) return '';
  const t = times[times.length - 1];
  if (!t) return '';
  return String(t).substring(0, 5);
}

function createEtaFromActualDepart(flight) {
  const f = flight.dataValues || flight;
  if (!f || !f.tfliteDepart || !f.departTimes || !f.departTimes.length) return '';
  const start = f.departTimes[0];
  const end = f.departTimes[f.departTimes.length - 1];
  let diff = minutesFromTimeString(end) - minutesFromTimeString(start);
  if (diff < 0) diff += 24 * 60;
  const finalMin = minutesFromTimeString(f.tfliteDepart) + diff;
  return minutesToHHMM(finalMin);
}

function displayFinalEta(flight) {
  const f = flight.dataValues || flight;
  if (!f) return '';
  if (
    f.miscObject &&
    f.miscObject.updatedEta &&
    String(f.miscObject.updatedEta).trim()
  ) {
    return String(f.miscObject.updatedEta).trim();
  }
  if (f.tfliteArrive && String(f.tfliteArrive).trim()) {
    return String(f.tfliteArrive).trim();
  }
  if (f.tfliteDepart) {
    const fromOff = createEtaFromActualDepart(flight);
    if (fromOff) return fromOff;
  }
  if (f.pfr && f.pfr.legArray && f.pfr.legArray.length) {
    const leg = f.pfr.legArray[f.pfr.legArray.length - 1];
    if (leg && leg.onTimeString) return leg.onTimeString;
  }
  return '';
}

function releaseEtaDisplay(flight) {
  const effective = displayFinalEta(flight);
  if (effective && String(effective).trim()) return String(effective).trim();
  return plannedFinalEta(flight);
}

function buildAmendmentsView(flight) {
  const f = flight.dataValues || flight;
  if (!f.miscObject) f.miscObject = {};
  if (f.miscObject.updatedEta === undefined) f.miscObject.updatedEta = '';
  const standby = isStandbyCharter(flight);
  const legs = standby ? initStandbyLegTimes(flight) : [];
  const dispatchOrOc = Boolean(f.dispatchRelease || f.ocRelease);
  const planned = plannedFinalEta(flight);
  const releaseEta = releaseEtaDisplay(flight);

  return {
    enrouteChanges: f.enrouteChanges == null ? '' : String(f.enrouteChanges),
    flightCompleted: f.flightStatus === 'Completed',
    standbyLegTimesDisabled: f.active === 'false',
    standbyCharter: standby,
    showStandbyLegTimes: standby && dispatchOrOc,
    standbyLegTimes: legs.map(row => ({
      airport: row.airport == null ? '' : String(row.airport),
      arrival: row.arrival == null ? '' : String(row.arrival),
      departure: row.departure == null ? '' : String(row.departure),
    })),
    updatedEta:
      f.miscObject.updatedEta == null ? '' : String(f.miscObject.updatedEta),
    releaseEtaDisplay: releaseEta,
    plannedFinalEta: planned,
  };
}

function applyStandbyLegTimesPatch(flight, rows) {
  if (!Array.isArray(rows)) return false;
  const f = flight.dataValues || flight;
  if (!f.miscObject) f.miscObject = {};
  if (!f.miscObject.standbyLegTimes) f.miscObject.standbyLegTimes = [];
  let changed = false;
  rows.forEach(incoming => {
    if (!incoming || !incoming.airport) return;
    const airport = String(incoming.airport);
    let row = f.miscObject.standbyLegTimes.find(e => e.airport === airport);
    if (!row) {
      row = { airport: airport, arrival: '', departure: '' };
      f.miscObject.standbyLegTimes.push(row);
    }
    if (Object.prototype.hasOwnProperty.call(incoming, 'arrival')) {
      const next = incoming.arrival == null ? '' : String(incoming.arrival);
      if (row.arrival !== next) {
        row.arrival = next;
        changed = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(incoming, 'departure')) {
      const next = incoming.departure == null ? '' : String(incoming.departure);
      if (row.departure !== next) {
        row.departure = next;
        changed = true;
      }
    }
  });
  if (changed) flight.changed('miscObject', true);
  return changed;
}

module.exports = {
  STANDBY_GROUND_MINUTES,
  isStandbyCharter,
  initStandbyLegTimes,
  buildAmendmentsView,
  applyStandbyLegTimesPatch,
};
