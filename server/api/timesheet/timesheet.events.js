/**
 * Timesheet model events
 */

'use strict';

import {EventEmitter} from 'events';
var Timesheet = require('../../sqldb').Timesheet;
var TimesheetEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
TimesheetEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Timesheet.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    TimesheetEvents.emit(event + ':' + doc._id, doc);
    TimesheetEvents.emit(event, doc);
    done(null);
  }
}

export default TimesheetEvents;
