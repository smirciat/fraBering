'use strict';

import { RosterMonthMeta } from '../../sqldb';

export async function getMonthMeta(monthKey) {
  const row = await RosterMonthMeta.findByPk(monthKey);
  if (!row) return { locked: false };
  return {
    locked: !!row.locked,
    lockedAt: row.lockedAt || null,
    lockedBy: row.lockedBy || null,
    updatedAt: row.updatedAt || null
  };
}

export async function setMonthLock(monthKey, locked, lockedBy) {
  const now = new Date();
  const payload = {
    monthKey,
    locked: locked === true,
    lockedAt: locked ? now : null,
    lockedBy: locked ? (lockedBy || null) : null,
    updatedAt: now
  };
  const existing = await RosterMonthMeta.findByPk(monthKey);
  if (existing) {
    await existing.update(payload);
  } else {
    await RosterMonthMeta.create(payload);
  }
  return {
    monthKey,
    locked: payload.locked,
    lockedAt: payload.lockedAt,
    lockedBy: payload.lockedBy
  };
}
