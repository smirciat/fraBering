'use strict';

import { TodaysFlight } from '../../sqldb';

const fuelDisplay = require('./ground-services-fuel-display.js');

const MOBILE_GROUND_ATTRS = [
  '_id',
  'active',
  'date',
  'flightNum',
  'aircraft',
  'airports',
  'departTimes',
  'flightStatus',
  'pilotObject',
  'coPilotObject',
  'equipment',
  'pfr',
  'fuelPreviouslyOnboard',
  'autoOnboard',
  'truck',
  'startFuel',
  'stopFuel',
  'gallonsUplifted',
  'fueled',
  'fueledBy',
  'fueledTimestamp',
];

function localeDateFromQuery(dateString) {
  if (!dateString) return null;
  const trimmed = String(dateString).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    return new Date(year, month, day).toLocaleDateString();
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function flightMatchesBase(flight, base) {
  const code = String(base || '').trim().toUpperCase();
  const airports = flight.airports || [];
  if (!airports.length) return false;
  if (code === 'HEL') return false;
  if (code === 'OTZ') {
    return airports.some(a => String(a).trim() === 'Kotzebue');
  }
  if (code === 'UNK') {
    return airports.some(a => String(a).trim() === 'Unalakleet');
  }
  if (code === 'OME') {
    return airports.some(a => String(a).trim() === 'Nome');
  }
  return false;
}

function toGroundEntry(flight) {
  const f = flight.dataValues || flight;
  const plain = {
    isHeli: false,
    _id: f._id,
    flightNum: f.flightNum,
    aircraft: f.aircraft,
    airports: f.airports || [],
    departTimes: f.departTimes || [],
    flightStatus: f.flightStatus || '',
    pilotObject: f.pilotObject,
    coPilotObject: f.coPilotObject,
    equipment: f.equipment,
    pfr: f.pfr,
    fuelPreviouslyOnboard: f.fuelPreviouslyOnboard,
    autoOnboard: f.autoOnboard,
    truck: f.truck,
    startFuel: f.startFuel,
    stopFuel: f.stopFuel,
    gallonsUplifted: f.gallonsUplifted,
    fueled: f.fueled === true,
    fueledBy: f.fueledBy || '',
    fueledTimestamp: f.fueledTimestamp || '',
  };
  const gsFuelDisplay = fuelDisplay.computeFuelDisplay(plain);
  const gsLoadAvailable = fuelDisplay.computeLoadAvailable(plain);
  const fuelSortTime =
    f.departTimes && f.departTimes[0]
      ? String(f.departTimes[0]).substring(0, 5)
      : '99:99';
  return {
    _id: f._id,
    displayFlightNum: fuelDisplay.displayFlightNum(plain),
    registration: f.aircraft || '',
    airports: plain.airports,
    departTimes: plain.departTimes,
    flightStatus: plain.flightStatus,
    pilotName: f.pilotObject && f.pilotObject.displayName ? f.pilotObject.displayName : '',
    coPilotName:
      f.coPilotObject && f.coPilotObject.displayName ? f.coPilotObject.displayName : '',
    equipmentName: f.equipment && f.equipment.name ? f.equipment.name : '',
    truck: plain.truck,
    startFuel: plain.startFuel,
    stopFuel: plain.stopFuel,
    gallonsUplifted: plain.gallonsUplifted,
    fueled: plain.fueled,
    fueledBy: plain.fueledBy,
    fueledTimestamp: plain.fueledTimestamp,
    gsFuelDisplay,
    gsLoadAvailable,
    fuelSortTime,
    pfrReady: !!(plain.pfr && plain.pfr.legArray && plain.pfr.legArray[0]),
  };
}

export function getGroundServices(req, res) {
  const date = localeDateFromQuery(req.query.date);
  const rawBase =
    req.query.base == null ? '' : String(req.query.base).trim().toUpperCase();
  const allBases = !rawBase || rawBase === 'ALL';
  const base = allBases ? 'ALL' : rawBase;
  if (!date) {
    return res.status(400).json({ message: 'Query date is required (YYYY-MM-DD)' });
  }
  if (base === 'HEL') {
    return res.status(200).json({
      date,
      base,
      truckOptions: fuelDisplay.fuelTruckOptionsForBase('HEL'),
      entries: [],
      message: 'Helicopter fuel cards use FRAT web for v1 — fixed-wing only on mobile.',
    });
  }

  return TodaysFlight.findAll({
    where: { date, active: 'true' },
    attributes: MOBILE_GROUND_ATTRS,
    order: [['flightNum', 'ASC']],
  })
    .then(rows =>
      rows
        .filter(row => {
          const ac = String(row.aircraft || '');
          return ac.startsWith('N');
        })
        .filter(row => allBases || flightMatchesBase(row, base))
        .map(toGroundEntry)
        .sort((a, b) =>
          String(a.fuelSortTime || '99:99').localeCompare(
            String(b.fuelSortTime || '99:99')
          )
        )
    )
    .then(entries =>
      res.status(200).json({
        date,
        base,
        truckOptions: fuelDisplay.fuelTruckOptionsForBase(
          allBases ? 'OME' : base
        ),
        entries,
      })
    )
    .catch(err => {
      console.error('[mobileOps] ground-services', err);
      return res.status(500).json({ message: 'Ground services load failed' });
    });
}
