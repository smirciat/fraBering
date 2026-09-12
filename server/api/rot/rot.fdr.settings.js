'use strict';

import {FdrYearSettings} from '../../sqldb';

export async function loadFdrYearSettings(year) {
  if (!FdrYearSettings) {
    return {hoursLocked: false, lockedAt: null, lockedBy: null};
  }
  let row = await FdrYearSettings.findByPk(year);
  if (!row) {
    return {hoursLocked: false, lockedAt: null, lockedBy: null};
  }
  return {
    hoursLocked: !!row.hoursLocked,
    lockedAt: row.lockedAt || null,
    lockedBy: row.lockedBy || null
  };
}

export async function setFdrYearHoursLocked(year, hoursLocked, lockedBy) {
  if (!FdrYearSettings) {
    throw new Error('year_settings_unavailable');
  }
  let locked = !!hoursLocked;
  let row = await FdrYearSettings.findByPk(year);
  if (locked) {
    let payload = {
      hoursLocked: true,
      lockedAt: new Date(),
      lockedBy: lockedBy || ''
    };
    if (row) {
      await row.update(payload);
    } else {
      await FdrYearSettings.create({
        year: year,
        hoursLocked: payload.hoursLocked,
        lockedAt: payload.lockedAt,
        lockedBy: payload.lockedBy
      });
    }
  } else if (row) {
    await row.update({
      hoursLocked: false,
      lockedAt: null,
      lockedBy: null
    });
  }
  return loadFdrYearSettings(year);
}
