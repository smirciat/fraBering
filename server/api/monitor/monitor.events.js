/**
 * Monitor model events
 */

'use strict';

import {EventEmitter} from 'events';
var Monitor = require('../../sqldb').Monitor;
var MonitorEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
MonitorEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Monitor.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    MonitorEvents.emit(event + ':' + doc._id, doc);
    MonitorEvents.emit(event, doc);
    done(null);
  }
}

export default MonitorEvents;
