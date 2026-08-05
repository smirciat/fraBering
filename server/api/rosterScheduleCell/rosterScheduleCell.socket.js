'use strict';

import RosterScheduleCellEvents from './rosterScheduleCell.events';

const events = ['cell', 'bulk'];

export function register(socket) {
  for (let i = 0, eventsLength = events.length; i < eventsLength; i++) {
    const event = events[i];
    const listener = createListener('rosterScheduleCell:' + event, socket);

    RosterScheduleCellEvents.on(event, listener);
    socket.on('disconnect', removeListener(event, listener));
  }
}

function createListener(event, socket) {
  return function(doc) {
    socket.emit(event, doc);
  };
}

function removeListener(event, listener) {
  return function() {
    RosterScheduleCellEvents.removeListener(event, listener);
  };
}
