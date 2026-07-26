'use strict';

import {EventEmitter} from 'events';
var Issue = require('../../sqldb').Issue;
var IssueEvents = new EventEmitter();

IssueEvents.setMaxListeners(0);

var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

for (var e in events) {
  var event = events[e];
  Issue.addHook(e, emitEvent(event));
}

function emitEvent(event) {
  return async function(doc) {
    IssueEvents.emit(event + ':' + doc._id, doc);
    IssueEvents.emit(event, doc);
  };
}

export default IssueEvents;
