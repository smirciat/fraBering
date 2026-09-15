'use strict';

const { buildAmendmentsView } = require('./standby-charter.js');

function str(val) {
  if (val == null) return '';
  return String(val).trim();
}

function leg0(f) {
  return f.pfr && f.pfr.legArray && f.pfr.legArray[0] ? f.pfr.legArray[0] : null;
}

function originCode(f) {
  const legs = f.airportObjs || [];
  if (legs[0] && legs[0].airport && legs[0].airport.threeLetter) {
    return legs[0].airport.threeLetter;
  }
  if (f.airports && f.airports[0]) return String(f.airports[0]);
  if (f.pfr && f.pfr.flightOrigin) return String(f.pfr.flightOrigin);
  return '';
}

function operationLabel(f) {
  const op = str(f.operation);
  if (!op) return '';
  if (f.nonRevFlight) return op + ' (Non-rev)';
  return op;
}

function pilotEmp(pilotObject) {
  if (!pilotObject || pilotObject._id == null) return '';
  return String(pilotObject._id);
}

function runwayLine(airport) {
  if (!airport) return '';
  const icao = str(airport.icao);
  const openClosed = str(airport.openClosed);
  const score = airport.runwayScore != null ? String(airport.runwayScore) : '';
  const comment = str(airport.comment);
  const pilotComment = str(airport.pilotComment);
  return ['RUNWAY', icao, openClosed, score, comment, pilotComment]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function legDestinationType(index, airportCount) {
  if (index === 0) return 'Departure';
  if (index === airportCount - 1) return 'Destination';
  return 'Enroute';
}

function asLegArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function mapLegCards(f) {
  const objs = asLegArray(f.airportObjsLocked).length
    ? asLegArray(f.airportObjsLocked)
    : asLegArray(f.airportObjs);
  const zulu = f.departTimesZulu && typeof f.departTimesZulu === 'object'
    ? f.departTimesZulu
    : {};
  const count = objs.length;
  return objs.map(function (metarObj, index) {
    const airport = metarObj.airport || {};
    const pireps = airport.pireps || [];
    const companyPireps = airport.companyPireps || [];
    return {
      airportCode: str(airport.threeLetter),
      legType: legDestinationType(index, count),
      colorClass: str(metarObj.color),
      departZulu: zulu[index] != null ? String(zulu[index]) : '',
      rawReport: str(metarObj['Raw-Report']),
      adjacentMetar: str(metarObj.adjacentMetar),
      taf: str(metarObj.taf),
      runwayNote: runwayLine(airport),
      companyPireps: companyPireps.filter(Boolean).slice(0, 4),
      icingPireps: pireps
        .map(function (p) {
          if (!p || !p.raw) return '';
          const sev =
            p.icing && p.icing.severity ? 'Icing: ' + p.icing.severity + ' ' : '';
          return sev + p.raw;
        })
        .filter(Boolean),
    };
  });
}

/**
 * Read-only Flight Release modal payload for bering_crew (slice 2+).
 */
function buildReleaseModalView(flight) {
  const f = flight.dataValues || flight;
  const l0 = leg0(f);
  const timeFirst =
    f.departTimes && f.departTimes[0]
      ? String(f.departTimes[0]).substring(0, 5)
      : '';
  const timeLast =
    f.departTimes && f.departTimes.length
      ? String(f.departTimes[f.departTimes.length - 1]).substring(0, 5)
      : '';

  const takeoffFuel = l0 && l0.fuel != null ? Number(l0.fuel) : null;
  const equipment = f.equipment || {};

  const flightInfo = [
    { title: 'Origin', value: originCode(f) },
    { title: 'Date', value: str(f.date) },
    {
      title: 'Time',
      value: timeFirst && timeLast ? timeFirst + ' - ' + timeLast : timeFirst,
    },
    { title: 'Est Flight Time', value: str(f.block || (f.pfr && f.pfr.block)) },
    { title: 'Flight ID', value: 'BRG' + str(f.flightNum) },
    { title: 'Operation', value: operationLabel(f) },
    { title: 'Rule', value: 'VFR/IFR. Altitude per GOM 06.19' },
    { title: 'Route', value: (f.airports || []).join(', ') },
  ];

  const weightSummary = [];
  if (l0) {
    if (equipment.ZFW != null) {
      weightSummary.push({ title: 'MaxZFW', value: String(equipment.ZFW) });
    }
    if (takeoffFuel != null) {
      weightSummary.push({ title: 'Takeoff Fuel', value: String(takeoffFuel) });
    }
    if (l0.mgtow != null) {
      weightSummary.push({ title: 'MGTOW', value: String(l0.mgtow) });
    }
    if (l0.operatingWeightEmpty != null) {
      weightSummary.push({ title: 'OWE', value: String(l0.operatingWeightEmpty) });
    }
    if (l0.totalLoad != null) {
      weightSummary.push({ title: 'Actual Load', value: String(l0.totalLoad) });
    }
    if (l0.tow != null) {
      weightSummary.push({ title: 'TOW', value: String(Math.round(l0.tow)) });
    }
  }

  const pilotObj = f.pilotObject || {};
  const coObj = f.coPilotObject || {};

  return {
    flightInfo,
    aircraft: {
      registration: str(f.aircraft),
      type: str(equipment.name),
      mel: str(f.mel),
      other: str(f.other),
    },
    fuel: {
      fuelPreviouslyOnboard: str(f.fuelPreviouslyOnboard),
      takeoffFuelLbs: takeoffFuel,
      fillPerSideLbs:
        takeoffFuel != null && Number.isFinite(takeoffFuel)
          ? takeoffFuel / 2
          : null,
    },
    weightSummary,
    crew: {
      pilotName: str(pilotObj.displayName || f.pilot),
      coPilotName: str(coObj.displayName || f.coPilot),
      pilotEmp: pilotEmp(pilotObj),
      coPilotEmp: pilotEmp(coObj),
      crewId: str(f.crewId),
    },
    environment: {
      knownIce: f.knownIce === true,
      otherEnvironment: str(f.otherEnvironment),
    },
    legs: mapLegCards(f),
    alternate: str(f.alternate),
    pfrRemark: str((f.pfr && f.pfr.remarks1) || f.security),
    inspections: {
      cockpit: str(f.cockpitInspection),
      cabin: str(f.cabinInspection),
      cargo: str(f.cargoInspection),
      wheelWell: str(f.wheelWellInspection),
    },
    allDisabled: Boolean(
      (f.dispatchRelease || f.ocRelease) && f.pilotAgree && str(f.pilotAgree)
    ),
    amendments: buildAmendmentsView(flight),
  };
}

module.exports = { buildReleaseModalView };
