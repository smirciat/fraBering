'use strict';

import { EventEmitter } from 'events';

const RosterEmployeeEvents = new EventEmitter();
RosterEmployeeEvents.setMaxListeners(0);

function emitEmployeeSave(employee) {
  if (!employee || !employee._id) return;
  RosterEmployeeEvents.emit('save', employee);
}

function emitEmployeeRemove(employee) {
  if (!employee || !employee._id) return;
  RosterEmployeeEvents.emit('remove', employee);
}

function emitEmployeeBulkChange(payload) {
  RosterEmployeeEvents.emit('bulk', payload || {});
}

export {
  emitEmployeeSave,
  emitEmployeeRemove,
  emitEmployeeBulkChange
};

export default RosterEmployeeEvents;
