/**
 * TodaysFlight model events
 */

'use strict';

import {EventEmitter} from 'events';
var TodaysFlight = require('../../sqldb').TodaysFlight;
var TodaysFlightEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
TodaysFlightEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  TodaysFlight.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    TodaysFlightEvents.emit(event + ':' + doc._id, doc);
    TodaysFlightEvents.emit(event, doc);
    done(null);
  }
}

export default TodaysFlightEvents;
