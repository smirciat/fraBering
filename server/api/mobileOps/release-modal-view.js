'use strict';

const { buildAmendmentsView } = require('./standby-charter.js');

const ALTERNATE_CHOICES = [
  'None',
  'PAOM',
  'PAOT',
  'PAUN',
  'PABE',
  'PAGA',
  'PAFA',
  'PANC',
];

const JUMPSEAT_REASONS = [
  'No Reason',
  'BA Employee',
  'BA Pilot',
  'Non-Company Handler',
  'Other Airline Pilot',
  'FAA',
  'DOD',
];

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

function pfrAirportCount(f) {
  const objs = asLegArray(f.airportObjsLocked).length
    ? asLegArray(f.airportObjsLocked)
    : asLegArray(f.airportObjs);
  if (objs.length) return objs.length;
  if (f.airports && f.airports.length) return f.airports.length;
  return 0;
}

function pfrLegPlannedBurnLbs(leg, legIndex) {
  if (!leg) return 0;
  const legNum = (legIndex != null ? legIndex : 0) + 1;
  const burnKey = 'fuelBurn' + legNum;
  if (leg[burnKey] != null && leg[burnKey] !== '') {
    const b = Number(leg[burnKey]);
    if (Number.isFinite(b) && b >= 0) return b;
  }
  const burn = Number(leg.fuelBurn);
  return Number.isFinite(burn) && burn >= 0 ? burn : 0;
}

function pfrLegEndingFuelLbs(leg, legIndex) {
  if (!leg) return null;
  const legNum = (legIndex != null ? legIndex : 0) + 1;
  const remainKey = 'fuelRemain' + legNum;
  if (leg[remainKey] != null && leg[remainKey] !== '') {
    const remain = Number(leg[remainKey]);
    if (Number.isFinite(remain) && remain >= 0 && remain <= 15000) {
      return Math.round(remain);
    }
  }
  let fuel = Number(leg.takeoffFuel);
  if (!Number.isFinite(fuel) || fuel <= 0) fuel = Number(leg.fuel);
  if (!Number.isFinite(fuel) || fuel <= 0) return null;
  const end = Math.round(fuel - pfrLegPlannedBurnLbs(leg, legIndex));
  if (end < 0 || end > 15000) return null;
  return end;
}

function pfrTakeoffFuelForAirportIndex(f, airportIndex, airportCount) {
  const pfr = f.pfr;
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  if (airportIndex !== 0) return null;
  const leg0 = pfr.legArray[0];
  let fuel = Number(leg0.takeoffFuel);
  if (!Number.isFinite(fuel) || fuel <= 0) fuel = Number(leg0.fuel);
  if (!Number.isFinite(fuel) || fuel <= 0) return null;
  return Math.round(fuel);
}

function pfrEndingFuelForAirportIndex(f, airportIndex, airportCount) {
  const pfr = f.pfr;
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  if (!airportCount || airportIndex <= 0 || airportIndex >= airportCount) {
    return null;
  }
  const legs = pfr.legArray;
  let legIdx = airportIndex - 1;
  if (airportIndex === airportCount - 1) {
    legIdx = legs.length - 1;
  }
  if (legIdx < 0 || legIdx >= legs.length) return null;
  return pfrLegEndingFuelLbs(legs[legIdx], legIdx);
}

function calcSeatWeightLbs(seatsRemoved) {
  let num = Number(seatsRemoved);
  if (!Number.isFinite(num) || num < 0) num = 0;
  if (num > 9) num = 9;
  return Math.round(num * 24.5 * -1);
}

function tksFromPfr(f) {
  const l0 = leg0(f);
  let gals = 0;
  if (l0 && l0.tksGallons != null) {
    gals = Number(l0.tksGallons) * 1;
    if (!Number.isFinite(gals) || gals < 0) gals = 0;
  }
  return { gals: gals, lbs: Math.round(gals * 9.2308) };
}

function calculatedOweLbs(f) {
  const bew = f.bew && typeof f.bew === 'object' ? f.bew : {};
  const jump =
    f.jumpseaterObject && typeof f.jumpseaterObject === 'object'
      ? f.jumpseaterObject
      : {};
  const seat = Number(bew.seatWeight);
  const base = Number(bew.bew);
  const equip = Number(bew.equipment);
  const cap = Number(bew.captain);
  const fo = Number(bew.fo);
  const bag = Number(jump.bagWt);
  const body = Number(jump.bodyWt);
  return Math.round(
    (Number.isFinite(seat) ? seat : 0) +
      (Number.isFinite(base) ? base : 0) +
      (Number.isFinite(equip) ? equip : 0) +
      (Number.isFinite(cap) ? cap : 0) +
      (Number.isFinite(fo) ? fo : 0) +
      (Number.isFinite(bag) ? bag : 0) +
      (Number.isFinite(body) ? body : 0)
  );
}

function buildLoadSheetView(f) {
  const bew = f.bew && typeof f.bew === 'object' ? f.bew : {};
  const jump =
    f.jumpseaterObject && typeof f.jumpseaterObject === 'object'
      ? f.jumpseaterObject
      : {};
  const equipment = f.equipment || {};
  const tks = tksFromPfr(f);
  const seatsRemoved =
    bew.seatsRemoved != null && bew.seatsRemoved !== ''
      ? String(bew.seatsRemoved)
      : '';
  return {
    isCaravan: str(equipment.name) === 'Caravan',
    bewAsWeighed: str(bew.bew),
    seatsRemoved: seatsRemoved,
    seatWeightLbs: String(calcSeatWeightLbs(bew.seatsRemoved)),
    equipmentLbs: str(bew.equipment),
    captainLbs: str(bew.captain),
    foLbs: str(bew.fo),
    tksGallons: String(tks.gals),
    tksLbs: String(tks.lbs),
    calculatedOweLbs: String(calculatedOweLbs(f)),
    jumpseaterName: str(jump.name),
    jumpseaterReason: str(jump.reason) || 'No Reason',
    jumpseaterBagWt: str(jump.bagWt),
    jumpseaterBodyWt: str(jump.bodyWt),
    jumpseatReasons: JUMPSEAT_REASONS,
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
  const airportCount = pfrAirportCount(f);
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
      pfrTakeoffFuelLbs: pfrTakeoffFuelForAirportIndex(f, index, airportCount),
      pfrEndingFuelLbs: pfrEndingFuelForAirportIndex(f, index, airportCount),
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
  const minFuel =
    equipment.minFuel != null ? Number(equipment.minFuel) : null;
  const fuelBurn =
    equipment.fuelBurn != null ? Number(equipment.fuelBurn) : null;
  let fuelEnduranceHours = null;
  if (takeoffFuel != null && fuelBurn != null && fuelBurn > 0) {
    fuelEnduranceHours = Number((takeoffFuel / fuelBurn).toFixed(1));
  }
  const fobRaw = f.fuelPreviouslyOnboard;
  const fobNum =
    fobRaw != null && String(fobRaw).trim() !== '' ? Number(fobRaw) : null;
  let fuelRequestGalPerSide = null;
  let fuelRequestGalTotal = null;
  if (
    takeoffFuel != null &&
    fobNum != null &&
    Number.isFinite(fobNum) &&
    Number.isFinite(takeoffFuel)
  ) {
    const main = (takeoffFuel - fobNum) / 2;
    const galSide = Math.floor(main / 6.7);
    fuelRequestGalPerSide = galSide;
    fuelRequestGalTotal = galSide * 2;
  }

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
  if (f.pfr && f.pfr.pfrNum != null && String(f.pfr.pfrNum).trim()) {
    flightInfo.push({
      title: 'PFR #',
      value: String(f.pfr.pfrNum).trim(),
    });
  }
  if (str(f.status)) {
    flightInfo.push({ title: 'Status', value: str(f.status) });
  }

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
      status: str(f.status),
    },
    fuel: {
      fuelPreviouslyOnboard: str(f.fuelPreviouslyOnboard),
      takeoffFuelLbs: takeoffFuel,
      fillPerSideLbs:
        takeoffFuel != null && Number.isFinite(takeoffFuel)
          ? takeoffFuel / 2
          : null,
      fuelEnduranceHours: fuelEnduranceHours,
      fuelRequestGalPerSide: fuelRequestGalPerSide,
      fuelRequestGalTotal: fuelRequestGalTotal,
      minFuelLbs: minFuel,
      belowMinFuel:
        takeoffFuel != null &&
        minFuel != null &&
        Number.isFinite(minFuel) &&
        takeoffFuel < minFuel,
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
    alternateChoices: ALTERNATE_CHOICES,
    alternateSelected: str(f.alternate) || 'None',
    loadSheet: buildLoadSheetView(f),
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
