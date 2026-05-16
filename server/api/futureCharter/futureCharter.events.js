/**
 * FutureCharter model events
 */

'use strict';

import {EventEmitter} from 'events';
var FutureCharter = require('../../sqldb').FutureCharter;
var FutureCharterEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
FutureCharterEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  FutureCharter.addHook(e, emitEvent(event));
}

async function emitEvent(event) {
  return function(doc, options, done) {
    FutureCharterEvents.emit(event + ':' + doc._id, doc);
    FutureCharterEvents.emit(event, doc);
    //done(null);
  }
}

export default FutureCharterEvents;
