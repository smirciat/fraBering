'use strict';

import RosterCalendarRequestEvents from './rosterCalendarRequest.events';

const events = ['change', 'bulk'];

export function register(socket) {
  for (let i = 0, eventsLength = events.length; i < eventsLength; i++) {
    const event = events[i];
    const listener = createListener('rosterCalendarRequest:' + event, socket);

    RosterCalendarRequestEvents.on(event, listener);
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
    RosterCalendarRequestEvents.removeListener(event, listener);
  };
}
