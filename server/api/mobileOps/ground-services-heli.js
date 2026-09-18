'use strict';

const fuelDisplay = require('./ground-services-fuel-display.js');

function airplaneModule() {
  return require('../airplane/airplane.controller.js');
}

const HELI_TYPE_KEYWORDS = [
  'Robinson',
  'Astar',
  'AStar',
  'R-44',
  'R44',
  'UH-1H',
  'Huey',
  'MD500',
  'MD 500',
  'Bell',
  'EC130',
  'H125',
  '407',
];

const HUB_BASES = ['OME', 'OTZ', 'UNK'];

function isHeliType(acftType) {
  if (!acftType) return false;
  const t = String(acftType).trim();
  for (let i = 0; i < HELI_TYPE_KEYWORDS.length; i++) {
    if (t.indexOf(HELI_TYPE_KEYWORDS[i]) > -1) return true;
  }
  return false;
}

function normalizeHeliDeparture(dep) {
  if (!dep) return '';
  let s = String(dep).trim().toUpperCase();
  s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+AK$/, '').trim();
  return s;
}

function heliDepartureHubAliases() {
  return {
    OME: ['OME', 'PAOM', 'NOME', 'NOME AIRPORT', 'NOME FIELD', 'OMEBA'],
    OTZ: [
      'OTZ',
      'PAOT',
      'KOTZEBUE',
      'KOTZ',
      'KOTZEBUE AK',
      'KOTZEBUE AIRPORT',
      'OTZBA',
      'RALPH WIEN',
      'RALPH WIEN MEMORIAL',
      'RALPH WIEN MEM AIRPORT',
      'KOTZEBUE, AK',
    ],
    UNK: ['UNK', 'PAUN', 'UNALAKLEET', 'UNALAKLEET AIRPORT'],
  };
}

function heliDepartureMatchesHub(dep, hubBase) {
  if (!hubBase || hubBase === 'HEL') return true;
  const norm = normalizeHeliDeparture(dep);
  if (!norm) return false;
  const aliases = heliDepartureHubAliases()[hubBase];
  if (!aliases) return false;
  for (let i = 0; i < aliases.length; i++) {
    const alias = aliases[i];
    if (norm === alias) return true;
    if (norm.indexOf(alias) > -1) return true;
  }
  return false;
}

function normalizeHeliDepTime(depTime) {
  if (!depTime) return '99:99';
  let t = String(depTime).trim();
  if (t.indexOf(':') > -1) {
    const parts = t.split(':');
    return (
      String(parts[0]).padStart(2, '0') +
      ':' +
      String(parts[1] || '0').padStart(2, '0')
    );
  }
  if (t.length === 3) t = '0' + t;
  if (t.length === 4) return t.substring(0, 2) + ':' + t.substring(2);
  return t;
}

function heliDepartureFromFlight(heli) {
  if (!heli) return '';
  if (heli.fltPlan && heli.fltPlan.dep) return heli.fltPlan.dep;
  if (heli.legArray && heli.legArray[0]) {
    if (heli.legArray[0].dep) return heli.legArray[0].dep;
    if (heli.legArray[0].from) return heli.legArray[0].from;
  }
  if (heli.departure) return heli.departure;
  return '';
}

function isHeliInactive(flight) {
  return !!(flight && (flight.inactive === true || flight.inactive === 'true'));
}

function dedupeHeliList(flights) {
  const byId = {};
  const byMission = {};
  const out = [];
  (flights || []).forEach(flight => {
    if (!flight || !flight._id || byId[flight._id]) return;
    const depTime =
      flight.fltPlan && flight.fltPlan.depTime ? flight.fltPlan.depTime : '';
    const missionKey =
      (flight.acftNumber || '') + '|' + (flight.dateString || '') + '|' + depTime;
    if (byMission[missionKey]) return;
    byId[flight._id] = true;
    byMission[missionKey] = true;
    out.push(flight);
  });
  return out;
}

function parseIsoDate(iso) {
  const trimmed = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date();
  const parts = trimmed.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function heliMatchesBaseFilter(heli, base, allBases) {
  const dep = heliDepartureFromFlight(heli);
  if (base === 'HEL') return true;
  if (allBases) {
    return HUB_BASES.some(hub => heliDepartureMatchesHub(dep, hub));
  }
  return heliDepartureMatchesHub(dep, base);
}

function heliFillToGal(heli) {
  if (!heli) return 0;
  if (heli.legArray && heli.legArray[0] && heli.legArray[0].fuel) {
    return heli.legArray[0].fuel * 1;
  }
  if (
    heli.pfr &&
    heli.pfr.legArray &&
    heli.pfr.legArray[0] &&
    heli.pfr.legArray[0].fuel
  ) {
    return heli.pfr.legArray[0].fuel * 1;
  }
  return 0;
}

function heliFirestoreSeconds(ts) {
  if (ts === undefined || ts === null || ts === '') return 0;
  if (typeof ts === 'number' && isFinite(ts)) {
    if (ts > 1e12) return ts / 1000;
    if (ts > 1e9) return ts;
    return 0;
  }
  if (ts && typeof ts.toDate === 'function') {
    const d = ts.toDate();
    if (d && !isNaN(d.getTime())) return d.getTime() / 1000;
  }
  if (ts && typeof ts._seconds === 'number') return ts._seconds;
  if (ts && typeof ts.seconds === 'number') return ts.seconds;
  if (ts instanceof Date && !isNaN(ts.getTime())) return ts.getTime() / 1000;
  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) return parsed.getTime() / 1000;
  return 0;
}

function heliTimeStringSeconds(dateString, timeStr) {
  if (!dateString || !timeStr) return 0;
  let t = String(timeStr).trim();
  if (t.length === 3) t = '0' + t;
  if (t.length === 4 && t.indexOf(':') < 0) {
    t = t.substring(0, 2) + ':' + t.substring(2);
  }
  const d = new Date(dateString + ' ' + t);
  if (isNaN(d.getTime())) return 0;
  return d.getTime() / 1000;
}

function heliFlightSchedSeconds(heli) {
  if (!heli || !heli.dateString) return 0;
  const depTime = heli.fltPlan && heli.fltPlan.depTime;
  if (!depTime) return 0;
  return heliTimeStringSeconds(
    heli.dateString,
    normalizeHeliDepTime(depTime)
  );
}

function heliPfrLastOnSeconds(pfr) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) {
    if (pfr && pfr.release && pfr.release[0] && pfr.release[0].onAt) {
      return heliTimeStringSeconds(pfr.dateString, pfr.release[0].onAt);
    }
    return 0;
  }
  const last = pfr.legArray[pfr.legArray.length - 1];
  let sec = heliFirestoreSeconds(last && last.onTime);
  if (sec) return sec;
  if (last && last.onTimeString && pfr.dateString) {
    return heliTimeStringSeconds(pfr.dateString, last.onTimeString);
  }
  if (pfr.release && pfr.release[0] && pfr.release[0].onAt) {
    return heliTimeStringSeconds(pfr.dateString, pfr.release[0].onAt);
  }
  return 0;
}

function heliPfrIsComplete(pfr) {
  if (!pfr) return false;
  if (heliPfrLastOnSeconds(pfr) > 0) return true;
  if (pfr.release && pfr.release[0] && pfr.release[0].onAt) return true;
  if (pfr.legArray && pfr.legArray.length) {
    const last = pfr.legArray[pfr.legArray.length - 1];
    if (last && last.onTimeString) return true;
  }
  return false;
}

function heliPfrHasBurn(pfr) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return false;
  const last = pfr.legArray[pfr.legArray.length - 1];
  if (!last) return false;
  const burn = last.burn;
  if (burn === undefined || burn === null || String(burn).trim() === '') {
    return false;
  }
  return isFinite(Number(burn));
}

function heliPfrRemainingFuelGal(pfr) {
  if (!pfr || !pfr.legArray || !pfr.legArray.length) return null;
  const last = pfr.legArray[pfr.legArray.length - 1];
  if (!last) return null;
  if (!heliPfrHasBurn(pfr)) return null;
  const fuel = Number(last.fuel);
  const burn = Number(last.burn);
  if (!isFinite(fuel)) return null;
  const remain = Math.round((fuel - burn) * 10) / 10;
  if (remain < 0 || remain > 500) return null;
  return remain;
}

function heliReportedFobGal(heli) {
  if (!heli) return null;
  const leg = heli.legArray && heli.legArray[0];
  const candidates = [
    leg && leg.fob,
    leg && leg.FOB,
    leg && leg.fuelOnBoard,
    leg && leg.fuelPreviouslyOnboard,
    heli.fob,
    heli.FOB,
    heli.fuelOnBoard,
    heli.fuelPreviouslyOnboard,
    heli.pfr &&
      heli.pfr.legArray &&
      heli.pfr.legArray[0] &&
      heli.pfr.legArray[0].fob,
  ];
  for (let i = 0; i < candidates.length; i++) {
    const v = candidates[i];
    if (
      v !== undefined &&
      v !== null &&
      String(v).trim() !== '' &&
      !isNaN(parseFloat(v))
    ) {
      return Math.round(parseFloat(v) * 10) / 10;
    }
  }
  return null;
}

function buildPfrPool(todaysFlights) {
  const previousPfrs = airplaneModule().previousPfrs || [];
  const pool = previousPfrs.slice();
  const seen = {};
  pool.forEach(pfr => {
    if (pfr && pfr._id) seen[pfr._id] = true;
  });
  (todaysFlights || []).forEach(pfr => {
    if (!pfr || !pfr._id || seen[pfr._id]) return;
    seen[pfr._id] = true;
    pool.push(pfr);
  });
  return pool;
}

function heliPreviousEndFuelGal(heli, pfrPool) {
  if (!heli || !heli.acftNumber) return null;
  const cutoff = heliFlightSchedSeconds(heli);
  let bestOn = 0;
  let bestRemain = null;
  for (let i = 0; i < pfrPool.length; i++) {
    const pfr = pfrPool[i];
    if (!pfr || String(pfr.acftNumber) !== String(heli.acftNumber)) continue;
    if (pfr._id && heli._id && String(pfr._id) === String(heli._id)) continue;
    if (!heliPfrIsComplete(pfr)) continue;
    const onSec = heliPfrLastOnSeconds(pfr);
    if (!onSec || onSec >= cutoff) continue;
    if (onSec < bestOn) continue;
    const remain = heliPfrRemainingFuelGal(pfr);
    if (remain === null) continue;
    bestOn = onSec;
    bestRemain = remain;
  }
  return bestRemain;
}

function heliFobInfo(heli, pfrPool) {
  const reported = heliReportedFobGal(heli);
  if (reported !== null) return { value: reported, hint: 'Flight Report' };
  const previous = heliPreviousEndFuelGal(heli, pfrPool);
  if (previous !== null) return { value: previous, hint: 'previous block in' };
  return null;
}

function heliTwinTankLimits(heli) {
  if (!heli) return null;
  const type = String(heli.acftType || '').toUpperCase();
  if (type.indexOf('R44') > -1 || type.indexOf('R-44') > -1) {
    return { maxMain: 29, maxAux: 17, galFactor: 1 };
  }
  if (type.indexOf('MD500') > -1 || type.indexOf('MD 500') > -1) {
    return { maxMain: 64, maxAux: 31, galFactor: 1 };
  }
  if (
    type.indexOf('UH-1') > -1 ||
    type.indexOf('UH1') > -1 ||
    type.indexOf('HUEY') > -1
  ) {
    return { maxMain: 100, maxAux: 45, galFactor: 1 };
  }
  return null;
}

function heliFuelReady(heli) {
  if (!heli) return false;
  if (heli.fuelRequestString && String(heli.fuelRequestString).trim()) {
    return true;
  }
  if (heliFillToGal(heli) > 0) return true;
  const hrs = heli.fltPlan && heli.fltPlan.fuel;
  return hrs !== undefined && hrs !== null && String(hrs).trim() !== '';
}

function computeHeliFuelDisplay(heli, pfrPool) {
  if (!heliFuelReady(heli)) return { ready: false };
  if (heli.fuelRequestString) {
    return {
      ready: true,
      rows: [
        {
          label: 'Fuel',
          value: heli.fuelRequestString,
          multiline: true,
        },
      ],
    };
  }
  const fillTo = Math.round(heliFillToGal(heli));
  if (fillTo > 0) {
    const rows = [];
    const fobInfo = heliFobInfo(heli, pfrPool);
    if (fobInfo !== null) {
      rows.push({
        label: 'FOB',
        value: `${fobInfo.value} gal`,
        hint: fobInfo.hint,
      });
    } else {
      rows.push({
        label: 'FOB',
        value: 'missing',
        hint: 'no prior burn or Flight Report entry',
        error: true,
      });
    }
    rows.push({
      label: 'Fill To',
      value: `${fillTo} gal`,
      highlight: true,
      hint: 'Flight Report start fuel',
    });
    if (fobInfo !== null) {
      const twinLimits = heliTwinTankLimits(heli);
      if (twinLimits) {
        const addResult = fuelDisplay.computeTwinTankAdd(
          fillTo,
          fobInfo.value,
          twinLimits.maxMain,
          twinLimits.maxAux,
          twinLimits.galFactor
        );
        if (addResult.error) {
          rows.push({ label: '', value: addResult.error, error: true });
        } else {
          rows.push({
            label: 'ADD',
            value: fuelDisplay.formatTwinTankAddValue(addResult),
            highlight: true,
          });
        }
      } else {
        const add = Math.round((fillTo - fobInfo.value) * 10) / 10;
        rows.push({ label: 'ADD', value: `${add} gal`, highlight: true });
      }
    }
    return { ready: true, rows };
  }
  const hrs = heli.fltPlan && heli.fltPlan.fuel;
  return {
    ready: true,
    rows: [
      {
        label: 'Fuel',
        value: `${String(hrs).trim()} hrs (flight plan)`,
        highlight: true,
      },
    ],
  };
}

function heliLocalStatus(heli) {
  const rel = heli.release && heli.release[0] ? heli.release[0] : {};
  if (rel.onAt) return 'Completed';
  if (rel.offAt) return 'En Route';
  return 'Planned';
}

function toHeliGroundEntry(heli, pfrPool) {
  const depTime = normalizeHeliDepTime(heli.fltPlan && heli.fltPlan.depTime);
  const rel = heli.release && heli.release[0] ? heli.release[0] : {};
  const dep = heli.fltPlan && heli.fltPlan.dep ? heli.fltPlan.dep : '';
  const arr = heli.fltPlan && heli.fltPlan.arr ? heli.fltPlan.arr : '';
  const plain = {
    isHeli: true,
    heliSource: heli,
    _id: `heli-${heli._id}`,
    flightNum: heli.flightNumber || heli.acftNumber,
    aircraft: heli.acftNumber || '',
    fuelRequestString: heli.fuelRequestString,
    fltPlan: heli.fltPlan,
  };
  const gsFuelDisplay = computeHeliFuelDisplay(heli, pfrPool);
  return {
    _id: plain._id,
    isHeli: true,
    displayFlightNum: heli.acftNumber || heli.flightNumber || 'HELI',
    registration: heli.acftNumber || '',
    airports: [dep, arr].filter(Boolean),
    departTimes: depTime ? [depTime] : [],
    flightStatus: heliLocalStatus(heli),
    pilotName: heli.pilot || '',
    coPilotName: '',
    equipmentName: heli.acftType || '',
    truck: null,
    startFuel: null,
    stopFuel: null,
    gallonsUplifted: null,
    fueled: rel.fueled === true,
    fueledBy: rel.fueledBy || '',
    fueledTimestamp: rel.fueledTimestamp || '',
    gsFuelDisplay,
    gsLoadAvailable: null,
    fuelSortTime: depTime,
    pfrReady: heliFuelReady(heli),
  };
}

async function buildHeliEntries(params) {
  const { dateIso, base, allBases } = params;
  if (base === 'HEL' && !allBases) {
    // Crew app does not use HEL chip; keep parity with web HEL base = all helis.
  }
  const date = parseIsoDate(dateIso);
  let todays = [];
  try {
    todays =
      (await airplaneModule().getCollectionDateWithSub('flights', 300, date)) ||
      [];
  } catch (err) {
    console.error('[mobileOps] heli ground-services load', err);
    return [];
  }
  const pfrPool = buildPfrPool(todays);
  const firebaseDate = todays[0] && todays[0].dateString;
  const filtered = dedupeHeliList(
    todays.filter(flight => {
      if (!isHeliType(flight.acftType)) return false;
      if (!flight.acftNumber) return false;
      if (String(flight.acftNumber).substring(0, 1).toUpperCase() !== 'N') {
        return false;
      }
      if (isHeliInactive(flight)) return false;
      if (firebaseDate && flight.dateString && flight.dateString !== firebaseDate) {
        // getCollectionDateWithSub already scoped by dateString
      }
      return heliMatchesBaseFilter(flight, base, allBases);
    })
  ).sort((a, b) => {
    const ta =
      a.fltPlan && a.fltPlan.depTime
        ? normalizeHeliDepTime(a.fltPlan.depTime)
        : '99:99';
    const tb =
      b.fltPlan && b.fltPlan.depTime
        ? normalizeHeliDepTime(b.fltPlan.depTime)
        : '99:99';
    return ta.localeCompare(tb);
  });

  return filtered.map(heli => toHeliGroundEntry(heli, pfrPool));
}

function parseHeliPatchId(paramId) {
  const raw = String(paramId || '').trim();
  if (raw.startsWith('heli-')) return raw.slice(5);
  return null;
}

async function patchHeliFuelFromMobile(paramId, body, displayName) {
  const docId = parseHeliPatchId(paramId);
  if (!docId) return null;
  if (!Object.prototype.hasOwnProperty.call(body, 'fueled')) {
    return {
      status: 400,
      body: { message: 'Helicopter fuel updates support fueled only.' },
    };
  }
  const fueled = body.fueled === true || body.fueled === 'true';
  const patch = { fueled };
  if (!fueled) {
    patch.fueledBy = null;
    patch.fueledTimestamp = null;
  } else {
    patch.fueledBy = displayName || '';
    patch.fueledTimestamp = new Date().toLocaleTimeString('en-US', {
      timeStyle: 'short',
    });
  }
  const ok = await airplaneModule().patchHeliGroundFuel(docId, patch);
  if (!ok) {
    return { status: 500, body: { message: 'Helicopter fuel update failed.' } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      _id: `heli-${docId}`,
      fueled: patch.fueled,
      fueledBy: patch.fueledBy || '',
      fueledTimestamp: patch.fueledTimestamp || '',
    },
  };
}

module.exports = {
  buildHeliEntries,
  parseHeliPatchId,
  patchHeliFuelFromMobile,
  heliFuelReady,
};
