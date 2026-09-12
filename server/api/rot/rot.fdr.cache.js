'use strict';

const HOURS_TTL_MS = 45 * 60 * 1000;
/** Bump when aggregation rules change so old in-memory caches are ignored. */
export const FDR_HOURS_CACHE_VERSION = 4;
const hoursByYear = {};
const computeInFlight = {};

export function getCachedHours(year) {
  let entry = hoursByYear[String(year)];
  if (!entry) return null;
  if (entry.version !== FDR_HOURS_CACHE_VERSION || Date.now() - entry.ts > HOURS_TTL_MS) {
    delete hoursByYear[String(year)];
    return null;
  }
  return entry.byEmployee;
}

export function setCachedHours(year, byEmployee) {
  hoursByYear[String(year)] = {
    ts: Date.now(),
    version: FDR_HOURS_CACHE_VERSION,
    byEmployee
  };
}

export function bustHoursCache(year) {
  delete hoursByYear[String(year)];
}

export function runComputeOnce(year, fn, keySuffix) {
  let key = String(year);
  if (keySuffix) key = key + ':' + keySuffix;
  if (computeInFlight[key]) return computeInFlight[key];
  computeInFlight[key] = fn().then(result => {
    delete computeInFlight[key];
    return result;
  }, err => {
    delete computeInFlight[key];
    throw err;
  });
  return computeInFlight[key];
}
