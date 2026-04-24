/**
 * Snapshot model events
 */

'use strict';

import {EventEmitter} from 'events';
var Snapshot = require('../../sqldb').Snapshot;
var SnapshotEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
SnapshotEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Snapshot.addHook(e, emitEvent(event));
}

function emitEvent(event) {
  return async function(doc, options) {
    SnapshotEvents.emit(event + ':' + doc._id, doc);
    SnapshotEvents.emit(event, doc);
    //done(null);
  }
}

export default SnapshotEvents;
