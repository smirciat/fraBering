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

function manualObsRecent(airport) {
  if (!airport || !airport.manualObs || !airport.manualTimestamp) return false;
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 10);
  return new Date(airport.manualTimestamp) > oneHourAgo;
}

/** Read-only parity with modal.service.js enrichMetarWithManualObs. */
function enrichMetarWithManualObs(metarObj) {
  if (!metarObj || !metarObj.airport || !manualObsRecent(metarObj.airport)) return;
  const mo = metarObj.airport.manualObs;
  if (mo.webcam) {
    metarObj['Raw-Report'] = 'WebCam Observation, VFR Only';
    metarObj.usingManual = true;
    return;
  }
  if (mo.webcamIFR) {
    metarObj['Raw-Report'] = 'Official WebCam Observation';
    metarObj.usingManual = true;
    return;
  }
  if (mo.notVfr) {
    metarObj['Raw-Report'] = 'Manual Observation: Not VFR';
    metarObj.usingManual = true;
    return;
  }
  const priorColor = String(metarObj.color || '');
  const needsManual =
    !metarObj['Raw-Report'] ||
    priorColor.indexOf('airport-blue') > -1 ||
    priorColor.indexOf('airport-purple') > -1;
  if (!needsManual) return;
  let obs = 'UNOFFICIAL: ';
  if (mo.isOfficial) obs = 'OFFICIAL OBSERVATION: ';
  if (mo.windSpeed && mo.windDirection) {
    obs = obs + 'Wind ' + mo.windDirection + '@' + mo.windSpeed + 'kts';
  }
  if (mo.visibility) obs = obs + ', Visibility ' + mo.visibility;
  if (mo.ceiling) obs = obs + ', Ceiling ' + mo.ceiling;
  if (mo.altimeter) obs = obs + ', Altimeter ' + mo.altimeter;
  metarObj['Raw-Report'] = obs;
  metarObj.Visibility = mo.visibility;
  metarObj.Ceiling = mo.ceiling;
  metarObj['Wind-Gust'] = mo.windSpeed;
  metarObj['Wind-Direction'] = mo.windDirection;
  metarObj.altimeter = mo.altimeter;
  metarObj.usingManual = true;
}

function formatManualObsSummary(airport) {
  if (!airport || !airport.manualObs || !manualObsRecent(airport)) {
    return { hasRecentManual: false, lines: [], signature: '', timestamp: '' };
  }
  const mo = airport.manualObs;
  const lines = [];
  if (mo.webcam) lines.push('WebCam observation — VFR only');
  else if (mo.webcamIFR) lines.push('Official WebCam observation (IFR)');
  else if (mo.notVfr) lines.push('Manual observation: not VFR');
  else {
    if (mo.windDirection || mo.windSpeed) {
      lines.push(
        'Wind ' +
          str(mo.windDirection) +
          '@' +
          str(mo.windSpeed) +
          ' kts'
      );
    }
    if (mo.visibility) lines.push('Visibility ' + str(mo.visibility));
    if (mo.ceiling) lines.push('Ceiling ' + str(mo.ceiling));
    if (mo.altimeter) lines.push('Altimeter ' + str(mo.altimeter));
    if (mo.isOfficial) lines.unshift('Official manual observation');
    else lines.unshift('Unofficial manual observation');
  }
  return {
    hasRecentManual: true,
    lines: lines,
    signature: str(mo.signature),
    timestamp: airport.manualTimestamp
      ? String(airport.manualTimestamp)
      : '',
  };
}

function metarTrendList(metarObj) {
  const seen = new Set();
  const out = [];
  function push(raw) {
    const line = str(raw);
    if (!line || seen.has(line)) return;
    seen.add(line);
    out.push(line);
  }
  const trend = metarObj.metars;
  if (Array.isArray(trend)) trend.forEach(push);
  const airport = metarObj.airport || {};
  const history = airport.currentMetarArray;
  if (Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i -= 1) push(history[i]);
  }
  const current = str(airport.currentMetar);
  if (current) push(current);
  return out;
}

function weatherSnapshot(metarObj) {
  const windGust = str(metarObj['Wind-Gust']);
  const windDir = str(metarObj['Wind-Direction']);
  const wind =
    windDir || windGust
      ? windGust + (metarObj.xwind ? ' / xwind ' + str(metarObj.xwind) : '')
      : str(metarObj.wind);
  return {
    visibility: str(metarObj.Visibility),
    ceiling: str(metarObj.Ceiling),
    wind: wind,
    windDirection: windDir,
    windGust: windGust,
    xwind: str(metarObj.xwind),
    altimeter: str(metarObj.altimeter),
    freezing: str(metarObj.Freezing),
  };
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
    const automatedMetar = str(metarObj['Raw-Report']);
    let displayMetar = metarObj;
    try {
      displayMetar = JSON.parse(JSON.stringify(metarObj));
      enrichMetarWithManualObs(displayMetar);
    } catch (e) {
      displayMetar = metarObj;
    }
    const manual = formatManualObsSummary(airport);
    const trend = metarTrendList(metarObj);
    const weather = weatherSnapshot(displayMetar);
    return {
      airportCode: str(airport.threeLetter),
      legType: legDestinationType(index, count),
      colorClass: str(metarObj.color),
      departZulu: zulu[index] != null ? String(zulu[index]) : '',
      rawReport: str(displayMetar['Raw-Report']) || automatedMetar,
      automatedMetar: automatedMetar,
      usingManual: displayMetar.usingManual === true,
      adjacentMetar: str(metarObj.adjacentMetar),
      taf: str(metarObj.taf),
      runwayNote: runwayLine(airport),
      weather: weather,
      metarTrend: trend,
      manualObs: manual,
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
      weightSummary.push({
        title: 'Actual Load (Flight Report)',
        value: String(l0.totalLoad),
        hint: Number(l0.totalLoad) === 0
          ? 'From iPad Flight Report weights, not Takeflite manifest.'
          : 'From iPad Flight Report load plan (not Takeflite manifest).',
      });
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
