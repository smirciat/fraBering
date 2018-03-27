/**
 * Pfr model events
 */

'use strict';

import {EventEmitter} from 'events';
var Pfr = require('../../sqldb').Pfr;
var PfrEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
PfrEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Pfr.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    PfrEvents.emit(event + ':' + doc._id, doc);
    PfrEvents.emit(event, doc);
    done(null);
  }
}

export default PfrEvents;
