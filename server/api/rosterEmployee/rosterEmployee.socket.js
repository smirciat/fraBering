'use strict';

import RosterEmployeeEvents from './rosterEmployee.events';

const events = ['save', 'remove', 'bulk'];

export function register(socket) {
  for (let i = 0, eventsLength = events.length; i < eventsLength; i++) {
    const event = events[i];
    const listener = createListener('rosterEmployee:' + event, socket);

    RosterEmployeeEvents.on(event, listener);
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
    RosterEmployeeEvents.removeListener(event, listener);
  };
}
