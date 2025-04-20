/**
 * Signature model events
 */

'use strict';

import {EventEmitter} from 'events';
var Signature = require('../../sqldb').Signature;
var SignatureEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
SignatureEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Signature.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    SignatureEvents.emit(event + ':' + doc._id, doc);
    SignatureEvents.emit(event, doc);
    done(null);
  }
}

export default SignatureEvents;
