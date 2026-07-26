'use strict';

import IssueEvents from './issue.events';

var events = ['save', 'remove'];

export function register(socket) {
  for (var i = 0, eventsLength = events.length; i < eventsLength; i++) {
    var event = events[i];
    var listener = createListener('issue:' + event, socket);

    IssueEvents.on(event, listener);
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
    IssueEvents.removeListener(event, listener);
  };
}
