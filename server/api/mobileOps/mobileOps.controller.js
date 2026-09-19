'use strict';

import { Op } from 'sequelize';
import config from '../../config/environment';
import { User, TodaysFlight, AirportRequirement } from '../../sqldb';
import { signToken } from '../../auth/auth.service';
import localEnv from '../../config/local.env.js';
import {runFlightUpdateSideEffects} from '../todaysFlight/todaysFlight.controller.js';

const { buildReleaseModalView } = require('./release-modal-view.js');
const standbyCharter = require('./standby-charter.js');
const applyStandbyLegTimesPatch = standbyCharter.applyStandbyLegTimesPatch;
const fuelDisplay = require('./ground-services-fuel-display.js');
const heliGround = require('./ground-services-heli.js');

/** Board row times — fallbacks if standby-charter.js on server is older than controller. */
function boardFormatTime(time) {
  if (typeof standbyCharter.formatBoardTime === 'function') {
    return standbyCharter.formatBoardTime(time);
  }
  if (!time) return '';
  const s = String(time).trim();
  if (!s) return '';
  return s.length >= 5 ? s.substring(0, 5) : s;
}

function boardPlannedFinalEta(flight) {
  if (typeof standbyCharter.plannedFinalEta === 'function') {
    return standbyCharter.plannedFinalEta(flight) || '';
  }
  const f = flight.dataValues || flight;
  const times =
    f.arriveTimes && f.arriveTimes.length ? f.arriveTimes : f.departTimes;
  if (!times || !times.length) return '';
  const t = times[times.length - 1];
  return t ? String(t).substring(0, 5) : '';
}

function boardReleaseEtaDisplay(flight) {
  if (typeof standbyCharter.releaseEtaDisplay === 'function') {
    return standbyCharter.releaseEtaDisplay(flight) || '';
  }
  return boardPlannedFinalEta(flight);
}

function boardRowTimeFields(flight, f) {
  try {
    return {
      scheduledDeparture: boardFormatTime((f.departTimes || [])[0]),
      scheduledArrival: boardPlannedFinalEta(flight),
      actualDepart: boardFormatTime(f.tfliteDepart),
      displayEta: boardReleaseEtaDisplay(flight),
    };
  } catch (err) {
    console.error('[mobileOps] board row time fields', err);
    return {
      scheduledDeparture: '',
      scheduledArrival: '',
      actualDepart: '',
      displayEta: '',
    };
  }
}

const MOBILE_BOARD_ATTRS = [
  '_id',
  'active',
  'date',
  'flightNum',
  'aircraft',
  'airports',
  'departTimes',
  'flightStatus',
  'color',
  'colorLock',
  'dispatchRelease',
  'ocRelease',
  'pilotAgree',
  'pilotObject',
  'equipment',
  'tfliteDepart',
  'tfliteArrive',
  'arriveTimes',
  'miscObject',
  'airportObjs',
  'airportObjsLocked',
  'knownIce',
  'fueled',
];

const MOBILE_RELEASE_ATTRS = MOBILE_BOARD_ATTRS.concat([
  'dispatchReleaseTimestamp',
  'ocReleaseTimestamp',
  'releaseTimestamp',
  'pfr',
  'operation',
  'knownIce',
  'airportObjs',
  'airportObjsLocked',
  'pilot',
  'coPilot',
  'coPilotObject',
  'mel',
  'other',
  'bew',
  'alternate',
  'security',
  'fuelPreviouslyOnboard',
  'otherEnvironment',
  'crewId',
  'cockpitInspection',
  'cabinInspection',
  'cargoInspection',
  'wheelWellInspection',
  'departTimesZulu',
  'nonRevFlight',
  'enrouteChanges',
  'miscObject',
  'arriveTimes',
  'active',
  'tfliteDepart',
  'tfliteArrive',
  'jumpseaterObject',
  'altObj',
  'status',
]);

function hasReleaseSignature(flight) {
  const f = flight.dataValues || flight;
  return Boolean(
    (f.dispatchRelease && String(f.dispatchRelease).trim()) ||
      (f.ocRelease && String(f.ocRelease).trim()) ||
      (f.pilotAgree && String(f.pilotAgree).trim())
  );
}

function removeReleaseGate(flight, user) {
  if (!user) {
    return { ok: false, message: 'Not signed in to FRAT.' };
  }
  const f = flight.dataValues || flight;
  if (!hasReleaseSignature(flight)) {
    return { ok: false, message: 'No release signatures on this flight.' };
  }
  if (f.tfliteDepart) {
    return {
      ok: false,
      message: 'Cannot remove a release after flight has taken off',
    };
  }
  const isAdmin = roleIndex(user.role) >= roleIndex('admin');
  if (!isAdmin) {
    return {
      ok: false,
      message: 'Remove release requires dispatch admin role.',
    };
  }
  return { ok: true, message: '' };
}

function opsExportTokenSecret() {
  return process.env.FRAT_OPS_EXPORT_TOKEN || localEnv.FRAT_OPS_EXPORT_TOKEN || '';
}

export function allowOpsExportAccess(req, res, next) {
  const secret = opsExportTokenSecret();
  if (!secret) {
    return res.status(503).json({ message: 'FRAT ops export is not configured' });
  }
  const provided = req.get('x-frat-ops-export-token') || req.query.exportToken;
  if (provided && String(provided) === String(secret)) {
    return next();
  }
  return res.status(401).json({ message: 'Invalid export token' });
}

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

function roleIndex(role) {
  return config.userRoles.indexOf(role);
}

function normalizeFratColorClass(raw) {
  if (!raw) return 'airport-green';
  const tokens = String(raw).trim().split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token.indexOf('airport-') === 0) return token;
  }
  return 'airport-green';
}

const CITY_TO_AIRPORT_CODE = {
  Nome: 'OME',
  Kotzebue: 'OTZ',
  Unalakleet: 'UNK',
};

function airportCodeFromCityName(name, index) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '—';
  if (CITY_TO_AIRPORT_CODE[trimmed]) return CITY_TO_AIRPORT_CODE[trimmed];
  if (/^[A-Z0-9]{3}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.length >= 3 ? trimmed.substring(0, 3).toUpperCase() : trimmed;
}

function toBoardLegs(f) {
  const locked = f.airportObjsLocked;
  const live = f.airportObjs;
  const objs =
    locked && locked.length ? locked : live && live.length ? live : [];
  const colorRaw = String(f.colorLock || f.color || '').trim();
  const flightColor = normalizeFratColorClass(colorRaw);

  if (objs.length) {
    return objs.map(function (leg, index) {
      const airport = leg.airport || {};
      const code = str(airport.threeLetter) || airportCodeFromCityName(
        (f.airports || [])[index],
        index
      );
      return {
        airportCode: code,
        colorClass: normalizeFratColorClass(leg.color || colorRaw),
      };
    });
  }

  return (f.airports || []).map(function (name, index) {
    return {
      airportCode: airportCodeFromCityName(name, index),
      colorClass: flightColor,
    };
  });
}

function str(val) {
  if (val == null) return '';
  return String(val).trim();
}

function toBoardRow(flight) {
  const f = flight.dataValues || flight;
  const colorRaw = String(f.colorLock || f.color || '').trim();
  const times = boardRowTimeFields(flight, f);
  return {
    _id: f._id,
    flightNum: String(f.flightNum || '').trim(),
    airports: f.airports || [],
    legs: toBoardLegs(f),
    departTimes: f.departTimes || [],
    flightStatus: f.flightStatus || '',
    color: normalizeFratColorClass(colorRaw),
    colorRaw,
    dispatchRelease: f.dispatchRelease || '',
    ocRelease: f.ocRelease || '',
    pilotAgree: f.pilotAgree || '',
    pilotLastName:
      f.pilotObject && f.pilotObject.lastName ? f.pilotObject.lastName : '',
    equipmentName:
      f.equipment && f.equipment.name ? f.equipment.name : '',
    registration: f.aircraft || '',
    released: Boolean(
      f.pilotAgree &&
        String(f.pilotAgree).trim() &&
        (f.dispatchRelease || f.ocRelease)
    ),
    knownIce: f.knownIce === true,
    fueled: f.fueled === true,
    scheduledDeparture: times.scheduledDeparture,
    scheduledArrival: times.scheduledArrival,
    actualDepart: times.actualDepart,
    displayEta: times.displayEta,
  };
}

function flightMatchesBase(flight, base) {
  const code = String(base || '').trim().toUpperCase();
  const airports = flight.airports || [];
  if (!airports.length) return false;
  if (code === 'HEL') return false;
  if (code === 'OTZ') {
    return airports.some(function (a) {
      return String(a).trim() === 'Kotzebue';
    });
  }
  if (code === 'UNK') {
    return airports.some(function (a) {
      return String(a).trim() === 'Unalakleet';
    });
  }
  if (code === 'OME') {
    return airports.some(function (a) {
      return String(a).trim() === 'Nome';
    });
  }
  return false;
}

function moreThanOneHourBeforeDepart(flight) {
  const f = flight.dataValues || flight;
  if (!f.date || !f.departTimes || !f.departTimes[0]) return true;
  const targetTime = new Date(f.date);
  const parts = String(f.departTimes[0]).split(':').map(Number);
  targetTime.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0);
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return targetTime >= now;
}

function noPfr(flight) {
  const f = flight.dataValues || flight;
  const op = String(f.operation || '');
  if (op === 'Test' || op === 'Training' || op === 'Ferry') return false;
  return (
    !f.pfr ||
    !f.pfr.legArray ||
    !f.pfr.legArray[0] ||
    !f.pfr.legArray[0].fuel
  );
}

function pilotLastNameMismatch(user, flight) {
  const f = flight.dataValues || flight;
  let userLast = '';
  if (user.name) {
    const parts = String(user.name).trim().split(/\s+/);
    userLast = parts.length ? parts[parts.length - 1] : '';
  }
  if (userLast === 'K.' || userLast === 'R.') userLast = 'Evans';
  const pilotLast =
    f.pilotObject && typeof f.pilotObject.lastName === 'string'
      ? f.pilotObject.lastName
      : '';
  if (!pilotLast) return false;
  return userLast.toLowerCase() !== pilotLast.toLowerCase();
}

const FRAT_RISK_COLORS = [
  'airport-green',
  'airport-blue',
  'airport-purple',
  'airport-yellow',
  'airport-orange',
  'airport-pink',
];

function worstRiskColorIndex(colorStr) {
  if (!colorStr) return 0;
  const tokens = String(colorStr)
    .replace(/\s+unofficial/g, '')
    .split(/\s+/)
    .filter(Boolean);
  let max = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const idx = FRAT_RISK_COLORS.indexOf(tokens[i]);
    if (idx > max) max = idx;
  }
  return max;
}

/** Blue or purple leg — pilot needs OC first (modal.service.js `flightHasBlueOrPurpleLeg`). */
function flightHasBlueOrPurpleLeg(flight) {
  const f = flight.dataValues || flight;
  const legs = f.airportObjs || f.airportObjsLocked || [];
  for (let i = 0; i < legs.length; i += 1) {
    const idx = worstRiskColorIndex(legs[i].color);
    if (idx === 1 || idx === 2) return true;
  }
  return false;
}

function legHasHighRiskColor(flight) {
  const f = flight.dataValues || flight;
  const legs = f.airportObjsLocked || f.airportObjs || [];
  for (let i = 0; i < legs.length; i += 1) {
    const idx = worstRiskColorIndex(legs[i].color);
    if (idx === 1 || idx === 2 || idx === 4 || idx === 5) return true;
  }
  return false;
}

function ocRequired(flight) {
  const f = flight.dataValues || flight;
  if (legHasHighRiskColor(flight)) return true;
  if (
    f.pfr &&
    f.pfr.legArray &&
    f.pfr.legArray[0] &&
    f.equipment &&
    f.pfr.legArray[0].fuel < f.equipment.minFuel
  ) {
    return true;
  }
  if (f.knownIce && f.equipment && f.equipment.name === 'Caravan') return true;
  return false;
}

function signGate(flight, user, as) {
  const f = flight.dataValues || flight;
  const isAdmin = roleIndex(user.role) >= roleIndex('admin');
  const isSuperAdmin = roleIndex(user.role) >= roleIndex('superadmin');
  const allDone =
    (f.dispatchRelease || f.ocRelease) && f.pilotAgree && String(f.pilotAgree).trim();

  if (moreThanOneHourBeforeDepart(flight)) {
    return { ok: false, message: 'Flight is more than one hour before departure.' };
  }
  if (noPfr(flight)) {
    return { ok: false, message: 'PFR with fuel is required before release sign-off.' };
  }
  if (allDone) {
    return { ok: false, message: 'Release is already complete for this flight.' };
  }

  if (as === 'dispatch') {
    if (!isAdmin) {
      return { ok: false, message: 'Dispatch release requires admin role.' };
    }
    if (f.dispatchRelease) {
      return { ok: false, message: 'Dispatch release already signed.' };
    }
    if (ocRequired(flight)) {
      return {
        ok: false,
        message: 'OC release is required for this flight (use OC sign, not dispatch).',
      };
    }
    return { ok: true };
  }

  if (as === 'oc') {
    if (!isSuperAdmin) {
      return { ok: false, message: 'OC release requires superadmin role.' };
    }
    if (!ocRequired(flight)) {
      return { ok: false, message: 'OC release is not required for this flight.' };
    }
    if (f.ocRelease) {
      return { ok: false, message: 'OC release already signed.' };
    }
    return { ok: true };
  }

  if (as === 'pilot') {
    if (String(user.name || '').trim() === 'Bering Air') {
      return { ok: false, message: 'Pilot acceptance cannot be signed as Bering Air.' };
    }
    if (pilotLastNameMismatch(user, flight)) {
      return { ok: false, message: 'Pilot acceptance must be signed by the assigned captain.' };
    }
    if (f.pilotAgree) {
      return { ok: false, message: 'Pilot acceptance already signed.' };
    }
    if (flightHasBlueOrPurpleLeg(flight) && !f.ocRelease) {
      return {
        ok: false,
        message: 'OC must sign before pilot acceptance on blue or purple routes.',
      };
    }
    return { ok: true };
  }

  return { ok: false, message: 'Invalid sign role.' };
}

function releaseFieldsLocked(flight) {
  const f = flight.dataValues || flight;
  return Boolean(
    (f.dispatchRelease || f.ocRelease) &&
      f.pilotAgree &&
      String(f.pilotAgree).trim()
  );
}

const PATCHABLE_STRING_FIELDS = new Set([
  'mel',
  'other',
  'fuelPreviouslyOnboard',
  'otherEnvironment',
  'crewId',
  'security',
]);

function whoCanSign(flight, user) {
  const tryDispatch = signGate(flight, user, 'dispatch');
  const tryOc = signGate(flight, user, 'oc');
  const tryPilot = signGate(flight, user, 'pilot');
  return {
    dispatch: { allowed: tryDispatch.ok, reason: tryDispatch.ok ? '' : tryDispatch.message },
    oc: { allowed: tryOc.ok, reason: tryOc.ok ? '' : tryOc.message },
    pilot: { allowed: tryPilot.ok, reason: tryPilot.ok ? '' : tryPilot.message },
  };
}

function toReleaseDto(flight, user) {
  const f = flight.dataValues || flight;
  const row = toBoardRow(flight);
  let modalView = null;
  try {
    modalView = buildReleaseModalView(flight);
  } catch (modalErr) {
    console.error('[mobileOps] modalView build failed', modalErr);
  }
  const removeGate = user ? removeReleaseGate(flight, user) : { ok: false, message: '' };
  return Object.assign({}, row, {
    dispatchReleaseTimestamp: f.dispatchReleaseTimestamp || null,
    ocReleaseTimestamp: f.ocReleaseTimestamp || null,
    releaseTimestamp: f.releaseTimestamp || null,
    ocRequired: ocRequired(flight),
    whoCanSign: user ? whoCanSign(flight, user) : undefined,
    removeRelease: user
      ? {
          allowed: removeGate.ok,
          reason: removeGate.ok ? '' : removeGate.message,
        }
      : undefined,
    modalView,
  });
}

export function authAssertion(req, res) {
  const emailRaw =
    (req.body && req.body.email) || (req.body && req.body.userEmail) || '';
  const email = String(emailRaw).trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  return User.findOne({
    where: {
      email: { [Op.iLike]: email },
    },
  })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'No FRAT user for that email' });
      }
      const token = signToken(user._id, user.role);
      return res.status(200).json({
        token,
        tokenType: 'Bearer',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    })
    .catch(err => {
      console.error('[mobileOps] assertion', err);
      return res.status(500).json({ message: 'Assertion failed' });
    });
}

export function getBoard(req, res) {
  const date = localeDateFromQuery(req.query.date);
  const rawBase =
    req.query.base == null ? '' : String(req.query.base).trim().toUpperCase();
  const allBases = !rawBase || rawBase === 'ALL';
  const base = allBases ? 'ALL' : rawBase;
  if (!date) {
    return res.status(400).json({ message: 'Query date is required (YYYY-MM-DD)' });
  }
  if (base === 'HEL') {
    return res.status(200).json({ date, base, flights: [], message: 'HEL board read-only — use frat web for v1.2' });
  }

  return TodaysFlight.findAll({
    where: { date, active: 'true' },
    attributes: MOBILE_BOARD_ATTRS,
    order: [['flightNum', 'ASC']],
  })
    .then(rows =>
      rows
        .filter(row => {
          const ac = String(row.aircraft || '');
          return ac.startsWith('N');
        })
        .filter(row => allBases || flightMatchesBase(row, base))
        .map(toBoardRow)
    )
    .then(flights => res.status(200).json({ date, base, flights }))
    .catch(err => {
      console.error('[mobileOps] board', err);
      return res.status(500).json({ message: 'Board load failed' });
    });
}

export function patchFlight(req, res) {
  const id = req.params.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  return TodaysFlight.findOne({ where: { _id: id } })
    .then(flight => {
      if (!flight) return res.status(404).json({ message: 'Flight not found' });
      const locked = releaseFieldsLocked(flight);

      let changed = false;
      if (locked) {
        if (Object.prototype.hasOwnProperty.call(body, 'enrouteChanges')) {
          flight.enrouteChanges =
            body.enrouteChanges == null ? '' : String(body.enrouteChanges);
          changed = true;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'updatedEta')) {
          if (!flight.miscObject || typeof flight.miscObject !== 'object') {
            flight.miscObject = {};
          }
          flight.miscObject.updatedEta =
            body.updatedEta == null ? '' : String(body.updatedEta);
          flight.changed('miscObject', true);
          changed = true;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'standbyLegTimes')) {
          if (applyStandbyLegTimesPatch(flight, body.standbyLegTimes)) {
            changed = true;
          }
        }
        if (!changed) {
          return res.status(403).json({
            message:
              'Release is locked — only enroute amendments (enrouteChanges, updatedEta, standbyLegTimes) can be updated.',
          });
        }
        return flight
          .save()
          .then(saved => res.status(200).json(toReleaseDto(saved, req.user)));
      }

      if (Object.prototype.hasOwnProperty.call(body, 'knownIce')) {
        flight.knownIce = body.knownIce === true || body.knownIce === 'true';
        changed = true;
      }

      PATCHABLE_STRING_FIELDS.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(body, field)) return;
        const value = body[field];
        flight[field] = value == null ? '' : String(value);
        changed = true;
        if (field === 'security') {
          const pfr =
            flight.pfr && typeof flight.pfr === 'object'
              ? Object.assign({}, flight.pfr)
              : {};
          pfr.remarks1 = flight.security;
          flight.pfr = pfr;
          flight.changed('pfr', true);
        }
      });

      if (Object.prototype.hasOwnProperty.call(body, 'enrouteChanges')) {
        flight.enrouteChanges =
          body.enrouteChanges == null ? '' : String(body.enrouteChanges);
        changed = true;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'updatedEta')) {
        if (!flight.miscObject || typeof flight.miscObject !== 'object') {
          flight.miscObject = {};
        }
        flight.miscObject.updatedEta =
          body.updatedEta == null ? '' : String(body.updatedEta);
        flight.changed('miscObject', true);
        changed = true;
      }

      if (Object.prototype.hasOwnProperty.call(body, 'standbyLegTimes')) {
        if (applyStandbyLegTimesPatch(flight, body.standbyLegTimes)) {
          changed = true;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'alternate')) {
        const rawAlt = body.alternate;
        if (
          rawAlt == null ||
          rawAlt === '' ||
          String(rawAlt).trim() === 'None'
        ) {
          flight.alternate = null;
          flight.altObj = null;
        } else {
          flight.alternate = String(rawAlt).trim();
        }
        changed = true;
      }

      if (body.bew && typeof body.bew === 'object') {
        const next = Object.assign({}, flight.bew || {}, body.bew);
        if (Object.prototype.hasOwnProperty.call(body.bew, 'seatsRemoved')) {
          let num = Number(body.bew.seatsRemoved);
          if (!Number.isFinite(num)) num = 0;
          if (num > 9) num = 9;
          next.seatsRemoved = num;
          next.seatWeight = num * 24.5 * -1;
        }
        flight.bew = next;
        flight.changed('bew', true);
        changed = true;
      }

      if (body.jumpseaterObject && typeof body.jumpseaterObject === 'object') {
        flight.jumpseaterObject = Object.assign(
          {},
          flight.jumpseaterObject || {},
          body.jumpseaterObject
        );
        flight.changed('jumpseaterObject', true);
        changed = true;
      }

      if (!changed) {
        return res.status(400).json({
          message:
            'No editable fields in body (mel, other, fuelPreviouslyOnboard, knownIce, otherEnvironment, crewId, security, alternate, bew, jumpseaterObject, enrouteChanges, updatedEta, standbyLegTimes).',
        });
      }

      return flight
        .save()
        .then(saved => {
          runFlightUpdateSideEffects(saved);
          return res.status(200).json(toReleaseDto(saved, req.user));
        });
    })
    .catch(err => {
      console.error('[mobileOps] patch', err);
      return res.status(500).json({ message: 'Flight update failed' });
    });
}

export function getFlight(req, res) {
  const id = req.params.id;
  return TodaysFlight.findOne({
    where: { _id: id },
    attributes: MOBILE_RELEASE_ATTRS,
  })
    .then(flight => {
      if (!flight) return res.status(404).json({ message: 'Flight not found' });
      return res.status(200).json(toReleaseDto(flight, req.user));
    })
    .catch(err => {
      console.error('[mobileOps] flight', err);
      return res.status(500).json({ message: 'Flight load failed' });
    });
}

export function removeReleaseFlight(req, res) {
  const id = req.params.id;

  return TodaysFlight.findOne({ where: { _id: id } })
    .then(flight => {
      if (!flight) return res.status(404).json({ message: 'Flight not found' });
      const gate = removeReleaseGate(flight, req.user);
      if (!gate.ok) {
        return res.status(403).json({ message: gate.message });
      }

      flight.dispatchRelease = null;
      flight.ocRelease = null;
      flight.pilotAgree = null;
      flight.releaseTimestamp = null;
      flight.dispatchReleaseTimestamp = null;
      flight.ocReleaseTimestamp = null;
      flight.colorLock = null;

      return flight
        .save()
        .then(saved => {
          runFlightUpdateSideEffects(saved.get ? saved.get({plain: true}) : saved);
          return res.status(200).json(toReleaseDto(saved, req.user));
        });
    })
    .catch(err => {
      console.error('[mobileOps] removeRelease', err);
      return res.status(500).json({ message: 'Remove release failed' });
    });
}

export function signFlight(req, res) {
  const id = req.params.id;
  const as = String((req.body && req.body.as) || '').trim().toLowerCase();
  if (as !== 'dispatch' && as !== 'oc' && as !== 'pilot') {
    return res.status(400).json({ message: 'Body as must be dispatch, oc, or pilot' });
  }

  return TodaysFlight.findOne({ where: { _id: id } })
    .then(flight => {
      if (!flight) return res.status(404).json({ message: 'Flight not found' });
      const gate = signGate(flight, req.user, as);
      if (!gate.ok) {
        return res.status(403).json({ message: gate.message });
      }

      const now = new Date();
      if (as === 'dispatch') {
        flight.dispatchRelease = req.user.name;
        flight.dispatchReleaseTimestamp = now;
      } else if (as === 'oc') {
        flight.ocRelease = req.user.name;
        flight.ocReleaseTimestamp = now;
      } else if (as === 'pilot') {
        flight.pilotAgree = req.user.name;
        flight.releaseTimestamp = now;
        if (!flight.crewId) flight.crewId = 'checked';
        flight.cockpitInspection = 'secure';
        flight.cabinInspection = 'secure';
        flight.cargoInspection = 'secure';
        flight.wheelWellInspection = 'secure';
      }

      return flight.save().then(saved => {
        const plain = saved.get ? saved.get({plain: true}) : saved;
        if ((plain.ocRelease || plain.dispatchRelease) && plain.pilotAgree && !plain.colorLock) {
          plain.newlyReleased = true;
        }
        runFlightUpdateSideEffects(plain);
        return res.status(200).json(toReleaseDto(saved, req.user));
      });
    })
    .catch(err => {
      console.error('[mobileOps] sign', err);
      return res.status(500).json({ message: 'Sign failed' });
    });
}

const RUNWAY_PATCH_FIELDS = [
  'openClosed',
  'runwayScore',
  'depth',
  'contaminent',
  'percent',
  'comment',
  'pilotComment',
  'officialSource',
  'unOfficialSource',
];

/** Runway conditions only — same store as frat web `PATCH /api/airportRequirements/:id`. METAR/manual obs not exposed on mobile ops. */
export function patchAirportRunway(req, res) {
  const id = req.params.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const userName =
    req.user && req.user.name ? String(req.user.name).trim() : '';

  return AirportRequirement.findByPk(id)
    .then(entity => {
      if (!entity) {
        return res.status(404).json({ message: 'Airport not found' });
      }
      const updates = {};
      RUNWAY_PATCH_FIELDS.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(body, field)) return;
        const value = body[field];
        updates[field] = value == null ? '' : String(value);
      });

      const companyPirepRaw = body.companyPirep;
      if (
        companyPirepRaw != null &&
        String(companyPirepRaw).trim() !== ''
      ) {
        const line =
          new Date().toLocaleString() +
          ' > ' +
          String(companyPirepRaw).trim();
        const list = entity.companyPireps
          ? entity.companyPireps.slice()
          : [];
        list.unshift(line);
        updates.companyPireps = list;
      }

      if (!Object.keys(updates).length && !body.companyPirep) {
        return res.status(400).json({
          message:
            'No runway fields in body (openClosed, runwayScore, depth, contaminent, percent, comment, pilotComment, officialSource, unOfficialSource, companyPirep).',
        });
      }

      updates.signature = userName || entity.signature || '';
      updates.timestamp = new Date();
      updates.runScroll = true;

      return entity.update(updates).then(saved =>
        res.status(200).json({
          ok: true,
          airportRequirementId: saved._id,
        })
      );
    })
    .catch(err => {
      console.error('[mobileOps] airport runway patch', err);
      return res.status(500).json({ message: 'Runway update failed' });
    });
}

export function patchFlightFuel(req, res) {
  const id = req.params.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const displayName =
    (body.employeeDisplayName && String(body.employeeDisplayName).trim()) ||
    (req.user && req.user.name ? String(req.user.name).trim() : '');

  if (heliGround.parseHeliPatchId(id)) {
    return heliGround
      .patchHeliFuelFromMobile(id, body, displayName)
      .then(result => {
        if (!result) {
          return res.status(404).json({ message: 'Flight not found.' });
        }
        return res.status(result.status).json(result.body);
      })
      .catch(err => {
        console.error('[mobileOps] patch heli fuel', err);
        return res.status(500).json({ message: 'Fuel update failed' });
      });
  }

  return TodaysFlight.findOne({ where: { _id: id } })
    .then(flight => {
      if (!flight) return res.status(404).json({ message: 'Flight not found' });

      let changed = false;
      if (Object.prototype.hasOwnProperty.call(body, 'fueled')) {
        flight.fueled = body.fueled === true || body.fueled === 'true';
        changed = true;
        if (!flight.fueled) {
          flight.fueledBy = null;
          flight.fueledTimestamp = null;
          flight.truck = null;
          flight.startFuel = null;
          flight.stopFuel = null;
          flight.gallonsUplifted = null;
        } else {
          flight.fueledBy = displayName || flight.fueledBy;
          flight.fueledTimestamp = new Date().toLocaleTimeString('en-US', {
            timeStyle: 'short',
          });
        }
      }

      ['truck', 'startFuel', 'stopFuel', 'gallonsUplifted'].forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(body, field)) return;
        const value = body[field];
        flight[field] = value == null || value === '' ? null : String(value);
        changed = true;
      });

      if (
        Object.prototype.hasOwnProperty.call(body, 'startFuel') ||
        Object.prototype.hasOwnProperty.call(body, 'stopFuel')
      ) {
        const plain = flight.dataValues || flight;
        fuelDisplay.updateFuelMeterGallons(plain);
        flight.gallonsUplifted = plain.gallonsUplifted;
        changed = true;
      }

      if (!changed) {
        return res.status(400).json({ message: 'No fuel fields in body.' });
      }

      return flight.save().then(saved => {
        runFlightUpdateSideEffects(saved);
        const f = saved.dataValues || saved;
        return res.status(200).json({
          ok: true,
          _id: f._id,
          fueled: f.fueled === true,
          fueledBy: f.fueledBy || '',
          fueledTimestamp: f.fueledTimestamp || '',
          truck: f.truck,
          startFuel: f.startFuel,
          stopFuel: f.stopFuel,
          gallonsUplifted: f.gallonsUplifted,
        });
      });
    })
    .catch(err => {
      console.error('[mobileOps] patch fuel', err);
      return res.status(500).json({ message: 'Fuel update failed' });
    });
}

