'use strict';

import { EventEmitter } from 'events';

const RosterCalendarRequestEvents = new EventEmitter();
RosterCalendarRequestEvents.setMaxListeners(0);

function emitCalendarRequestChange(payload) {
  if (!payload || !payload.monthKey || !payload.base) return;
  RosterCalendarRequestEvents.emit('change', payload);
}

function emitCalendarRequestBulkChange(payload) {
  if (!payload || !payload.monthKey) return;
  RosterCalendarRequestEvents.emit('bulk', payload);
}

export {
  emitCalendarRequestChange,
  emitCalendarRequestBulkChange
};

export default RosterCalendarRequestEvents;
