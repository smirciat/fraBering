'use strict';

/**
 * Compat shim: status-export + per-flight format=takeflite so tf() keeps TF-shaped objects.
 * Preferred cutover mapping is status-export only — see docs/takeflite-resbering-cutover.md.
 */

const axios = require('axios');
import {
  resBeringApiBaseUrl,
  resBeringIntegrationToken,
  useResBeringTakeflite
} from '../../config/takefliteSource.js';

const MANIFEST_CONCURRENCY = 6;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toIsoDateLocal(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** Same window idea as legacy getManifests (departureDate.gte/lte). */
export function resolveManifestRange(req) {
  let date = new Date();
  let range = 3;
  if (req && req.body && req.body.range) range = req.body.range + 2;
  if (req && req.body && req.body.date) date = new Date(req.body.date);
  if (req && !req.body && !req.headers && !isNaN(new Date(req)) && new Date(req).toString() !== 'Invalid Date') {
    date = new Date(req);
  }
  let start = new Date(date);
  let day = start.getDate();
  day = day - 1;
  start.setDate(day);
  start.setHours(23, 0, 0, 0);
  let end = new Date(start);
  day = end.getDate() + range;
  end.setDate(day);
  end.setHours(1, 0, 0, 0);
  return {
    dateFrom: toIsoDateLocal(start),
    dateTo: toIsoDateLocal(end)
  };
}

function integrationAuthHeaders() {
  let token = resBeringIntegrationToken();
  if (!token) {
    throw new Error('resbering_integration_token_missing');
  }
  return {
    Accept: 'application/json',
    Authorization: 'Bearer ' + token
  };
}

async function fetchStatusExport(dateFrom, dateTo) {
  let base = resBeringApiBaseUrl();
  let url = base + '/api/integrations/v1/flights/status-export?dateFrom=' +
    encodeURIComponent(dateFrom) + '&dateTo=' + encodeURIComponent(dateTo);
  let response = await axios.get(url, {headers: integrationAuthHeaders()});
  return response.data || {};
}

async function fetchManifestTakeflite(isoDate, flightNumber) {
  let base = resBeringApiBaseUrl();
  let url = base + '/api/integrations/v1/flights/manifest?date=' +
    encodeURIComponent(isoDate) + '&flightNumber=' + encodeURIComponent(String(flightNumber)) +
    '&format=takeflite';
  let response = await axios.get(url, {headers: integrationAuthHeaders()});
  return response.data;
}

async function mapPool(items, limit, fn) {
  let results = [];
  for (let i = 0; i < items.length; i += limit) {
    let slice = items.slice(i, i + limit);
    let batch = await Promise.all(slice.map(fn));
    results = results.concat(batch);
  }
  return results;
}

function isoDateFromRow(row) {
  if (row && row.date) return String(row.date).slice(0, 10);
  if (row && row.dateString) {
    let parts = String(row.dateString).split('/');
    if (parts.length === 3) {
      let yy = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      return yy + '-' + pad2(parts[0]) + '-' + pad2(parts[1]);
    }
  }
  return null;
}

function manifestLegsToFlightLogs(manifest) {
  let logs = [];
  if (!manifest || !manifest.flightLegs) return logs;
  let reg = manifest.registration || '';
  manifest.flightLegs.forEach(leg => {
    if (!leg) return;
    let dep = leg.departureTime || leg.scheduledDepartureTime;
    if (!dep) return;
    let row = {
      registration: leg.registration || reg,
      departureDate: dep,
      origin: leg.origin,
      destination: leg.destination,
      takeOff: leg.takeOff || leg.wheelsOff || null,
      land: leg.land || leg.wheelsOn || null
    };
    if (leg.legTimes && leg.legTimes.wheelsOff) row.takeOff = leg.legTimes.wheelsOff;
    if (leg.legTimes && leg.legTimes.wheelsOn) row.land = leg.legTimes.wheelsOn;
    logs.push(row);
  });
  return logs;
}

export async function setBearerResBering() {
  if (!useResBeringTakeflite()) return 'TF Bearer Token Set Successfully';
  if (!resBeringIntegrationToken()) {
    console.log('resBering Takeflite flip: RESBERING_INTEGRATION_TOKEN is not set');
    return 'resbering_integration_token_missing';
  }
  return 'resBering integration token configured';
}

export async function getManifestsResBering(req, res) {
  let range = resolveManifestRange(req);
  try {
    let exported = await fetchStatusExport(range.dateFrom, range.dateTo);
    let rows = exported.flights || [];
    let seen = {};
    rows = rows.filter(row => {
      if (!row) return false;
      let iso = isoDateFromRow(row);
      let num = row.flightNumber;
      if (!iso || !num) return true;
      let key = iso + '|' + String(num);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    let flights = await mapPool(rows, MANIFEST_CONCURRENCY, async row => {
      let iso = isoDateFromRow(row);
      let num = row.flightNumber;
      if (!iso || !num) return null;
      try {
        return await fetchManifestTakeflite(iso, num);
      } catch (err) {
        console.log('resBering manifest fetch failed', iso, num, err && err.message);
        return null;
      }
    });
    flights = flights.filter(Boolean);
    let payload = {flights: flights};
    if (res) res.status(200).json(payload);
    return payload;
  } catch (err) {
    if (!err.response) err.response = {data: err};
    console.log(err.response.data || err);
    if (res) return res.status(500).json(err.response.data || {message: String(err.message || err)});
    return err.response || err;
  }
}

export async function getManifestResBering(req, res) {
  let date = new Date();
  let flightNum = '860';
  if (req.body && req.body.date) {
    date = new Date(req.body.date);
    flightNum = req.body.flightNum || flightNum;
  }
  let iso = toIsoDateLocal(date);
  try {
    let manifest = await fetchManifestTakeflite(iso, flightNum);
    if (res) res.status(200).json(manifest);
    return manifest;
  } catch (err) {
    if (!err.response) err.response = {data: err};
    console.log(err.response.data);
    if (res) return res.status(500).json(err.response.data);
    return err.response || err;
  }
}

export async function getFlightLogsResBering(req, res) {
  let date = new Date();
  if (req && req.body && req.body.date) date = new Date(req.body.date);
  if (req && !req.body && !req.headers && !isNaN(new Date(req)) && new Date(req).toString() !== 'Invalid Date') {
    date = new Date(req);
  }
  let iso = toIsoDateLocal(date);
  try {
    let exported = await fetchStatusExport(iso, iso);
    let rows = exported.flights || [];
    let legChunks = await mapPool(rows, MANIFEST_CONCURRENCY, async row => {
      let rowIso = isoDateFromRow(row) || iso;
      let num = row.flightNumber;
      if (!num) return [];
      try {
        let manifest = await fetchManifestTakeflite(rowIso, num);
        return manifestLegsToFlightLogs(manifest);
      } catch (e) {
        console.log('resBering flight log manifest failed', rowIso, num, e && e.message);
        return [];
      }
    });
    let logs = [];
    legChunks.forEach(chunk => {
      if (chunk && chunk.length) logs = logs.concat(chunk);
    });
    console.log('Setting Flight Log Array (resBering)');
    console.log(logs.length);
    if (res) res.status(200).json(logs);
    return logs;
  } catch (err) {
    if (!err.response) err.response = {data: err};
    console.log(err.response.data || err);
    if (res) return res.status(500).json(err.response.data);
    return err.response || err;
  }
}
