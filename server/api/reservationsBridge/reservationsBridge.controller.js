'use strict';

import axios from 'axios';
import localEnv from '../../config/local.env.js';

function reservationsApiBaseUrl() {
  return (
    process.env.RESERVATIONS_API_BASE_URL ||
    localEnv.RESERVATIONS_API_BASE_URL ||
    'https://reservations.beringair.com'
  ).replace(/\/$/, '');
}

function actorDisplayName(user) {
  if (!user) return '';
  const name = user.name || user.displayName || '';
  return String(name).trim();
}

function fratOpsExportToken() {
  return (
    process.env.FRAT_OPS_EXPORT_TOKEN ||
    localEnv.FRAT_OPS_EXPORT_TOKEN ||
    ''
  );
}

/**
 * GET /api/reservationsBridge/pending-bulletins
 * Proxy to reservations Safety bulletins pending list for the signed-in FRAT user (#159 slice 4).
 */
export async function pendingBulletins(req, res) {
  const name = actorDisplayName(req.user);
  if (!name) {
    return res.status(400).json({ message: 'Signed-in user name is required.' });
  }

  const url = `${reservationsApiBaseUrl()}/api/safety/bulletins/pending`;
  try {
    const exportToken = fratOpsExportToken();
    const response = await axios.get(url, {
      params: { recipientName: name },
      headers: exportToken
        ? { 'x-frat-ops-export-token': exportToken }
        : undefined,
      timeout: 12000,
      validateStatus: (status) => status < 500,
    });
    if (response.status >= 400) {
      const message =
        (response.data && response.data.message) ||
        'Unable to load pending safety bulletins from Reservations.';
      return res.status(response.status).json({ message, items: [] });
    }
    const items = (response.data && response.data.items) || [];
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('[reservationsBridge] pending-bulletins failed', err.message || err);
    return res.status(502).json({
      message: 'Reservations safety bulletins are temporarily unavailable.',
      items: [],
    });
  }
}
