/**
 * Airplane model events
 */

'use strict';

import {EventEmitter} from 'events';
var Airplane = require('../../sqldb').Airplane;
var AirplaneEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
AirplaneEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Airplane.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    AirplaneEvents.emit(event + ':' + doc._id, doc);
    AirplaneEvents.emit(event, doc);
    done(null);
  }
}

export default AirplaneEvents;
