/**
 * AirportRequirement model events
 */

'use strict';

import {EventEmitter} from 'events';
var AirportRequirement = require('../../sqldb').AirportRequirement;
var AirportRequirementEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
AirportRequirementEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  AirportRequirement.addHook(e, emitEvent(event));
}

function emitEvent(event) {
  return async function(doc, options) {
    AirportRequirementEvents.emit(event + ':' + doc._id, doc);
    AirportRequirementEvents.emit(event, doc);
    //done(null);
  }
}

export default AirportRequirementEvents;
