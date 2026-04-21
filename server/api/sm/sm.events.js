/**
 * Sm model events
 */

'use strict';

import {EventEmitter} from 'events';
var Sm = require('../../sqldb').Sm;
var SmEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
SmEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Sm.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    SmEvents.emit(event + ':' + doc._id, doc);
    SmEvents.emit(event, doc);
    done(null);
  }
}

export default SmEvents;
