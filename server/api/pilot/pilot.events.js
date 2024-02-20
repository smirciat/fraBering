/**
 * Pilot model events
 */

'use strict';

import {EventEmitter} from 'events';
var Pilot = require('../../sqldb').Pilot;
var PilotEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
PilotEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Pilot.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    PilotEvents.emit(event + ':' + doc._id, doc);
    PilotEvents.emit(event, doc);
    done(null);
  }
}

export default PilotEvents;
