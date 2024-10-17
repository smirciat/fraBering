/**
 * Calendar model events
 */

'use strict';

import {EventEmitter} from 'events';
var Calendar = require('../../sqldb').Calendar;
var CalendarEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
CalendarEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  Calendar.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    CalendarEvents.emit(event + ':' + doc._id, doc);
    CalendarEvents.emit(event, doc);
    done(null);
  }
}

export default CalendarEvents;
