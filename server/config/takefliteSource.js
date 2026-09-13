'use strict';

import localEnv from './local.env.js';

/**
 * Takeflite data for FRA status sync (manifests + flight logs).
 * Oct 2026 cutover: set TAKEFLITE_DATA_SOURCE=resbering to use resBering integration API (#161).
 */
export function takefliteDataSource() {
  let raw = process.env.TAKEFLITE_DATA_SOURCE || localEnv.TAKEFLITE_DATA_SOURCE || 'takeflite';
  raw = String(raw).trim().toLowerCase();
  if (raw === 'resbering' || raw === 'reservations' || raw === '1' || raw === 'true' || raw === 'on') {
    return 'resbering';
  }
  return 'takeflite';
}

export function useResBeringTakeflite() {
  return takefliteDataSource() === 'resbering';
}

export function resBeringApiBaseUrl() {
  let base = process.env.RESBERING_API_BASE_URL ||
    localEnv.RESBERING_API_BASE_URL ||
    localEnv.RESERVATIONS_API_BASE_URL ||
    'https://reservations.beringair.com';
  return String(base).replace(/\/$/, '');
}

/** Bearer for GET /api/integrations/v1/* — must match resBering RESBERING_INTEGRATION_TOKEN. */
export function resBeringIntegrationToken() {
  return String(
    process.env.RESBERING_INTEGRATION_TOKEN ||
    localEnv.RESBERING_INTEGRATION_TOKEN ||
    ''
  ).trim();
}
