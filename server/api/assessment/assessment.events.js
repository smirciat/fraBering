/**
 * Assessment model events
 */

'use strict';

import {EventEmitter} from 'events';
var Assessment = require('../../sqldb').Assessment;
var AssessmentEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
AssessmentEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Assessment.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    AssessmentEvents.emit(event + ':' + doc._id, doc);
    AssessmentEvents.emit(event, doc);
    done(null);
  }
}

export default AssessmentEvents;
