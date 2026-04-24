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
  Pfr.addHook(e, emitEvent(event));
}

function emitEvent(event) {
  return async function(doc, options) {
    PfrEvents.emit(event + ':' + doc._id, doc);
    PfrEvents.emit(event, doc);
    //done(null);
  }
}

export default PfrEvents;
