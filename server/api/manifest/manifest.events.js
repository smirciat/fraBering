/**
 * Manifest model events
 */

'use strict';

import {EventEmitter} from 'events';
var Manifest = require('../../sqldb').Manifest;
var ManifestEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
ManifestEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Manifest.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    ManifestEvents.emit(event + ':' + doc._id, doc);
    ManifestEvents.emit(event, doc);
    done(null);
  }
}

export default ManifestEvents;
