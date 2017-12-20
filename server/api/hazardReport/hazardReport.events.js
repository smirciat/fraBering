/**
 * HazardReport model events
 */

'use strict';

import {EventEmitter} from 'events';
var HazardReport = require('../../sqldb').HazardReport;
var HazardReportEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
HazardReportEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  HazardReport.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    HazardReportEvents.emit(event + ':' + doc._id, doc);
    HazardReportEvents.emit(event, doc);
    done(null);
  }
}

export default HazardReportEvents;
