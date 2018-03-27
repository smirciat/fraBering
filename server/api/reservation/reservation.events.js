/**
 * Reservation model events
 */

'use strict';

import {EventEmitter} from 'events';
var Reservation = require('../../sqldb').Reservation;
var ReservationEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
ReservationEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Reservation.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    ReservationEvents.emit(event + ':' + doc._id, doc);
    ReservationEvents.emit(event, doc);
    done(null);
  }
}

export default ReservationEvents;
