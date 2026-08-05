'use strict';

import { EventEmitter } from 'events';

const RosterScheduleCellEvents = new EventEmitter();
RosterScheduleCellEvents.setMaxListeners(0);

function emitScheduleCellChange(payload) {
  if (!payload || !payload.monthKey || !payload.rosterId || !payload.day) return;
  RosterScheduleCellEvents.emit('cell', payload);
}

function emitScheduleBulkChange(payload) {
  if (!payload || !payload.monthKey) return;
  RosterScheduleCellEvents.emit('bulk', payload);
}

export {
  emitScheduleCellChange,
  emitScheduleBulkChange
};

export default RosterScheduleCellEvents;
