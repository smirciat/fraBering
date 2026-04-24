/**
 * Sequelize initialization module
 */

'use strict';

import path from 'path';
import config from '../config/environment';
import Sequelize from 'sequelize';

var db = {
  Sequelize,
  sequelize: new Sequelize(config.sequelize.uri, config.sequelize.options)
};

// Insert models below
db.Sm = require('../api/sm/sm.model').default(db.sequelize, Sequelize.DataTypes);
db.Signature = require('../api/signature/signature.model').default(db.sequelize, Sequelize.DataTypes);
db.Snapshot = require('../api/snapshot/snapshot.model').default(db.sequelize, Sequelize.DataTypes);
db.TodaysFlight = require('../api/todaysFlight/todaysFlight.model').default(db.sequelize, Sequelize.DataTypes);
db.Calendar = require('../api/calendar/calendar.model').default(db.sequelize, Sequelize.DataTypes);
db.Airplane = require('../api/airplane/airplane.model').default(db.sequelize, Sequelize.DataTypes);
db.Monitor = require('../api/monitor/monitor.model').default(db.sequelize, Sequelize.DataTypes);
db.Timesheet = require('../api/timesheet/timesheet.model').default(db.sequelize, Sequelize.DataTypes);
db.Manifest = require('../api/manifest/manifest.model').default(db.sequelize, Sequelize.DataTypes);
db.Pfr = require('../api/pfr/pfr.model').default(db.sequelize, Sequelize.DataTypes);
db.Reservation = require('../api/reservation/reservation.model').default(db.sequelize, Sequelize.DataTypes);
db.AirportRequirement = require('../api/airportRequirement/airportRequirement.model').default(db.sequelize, Sequelize.DataTypes);
db.Notification = require('../api/notification/notification.model').default(db.sequelize, Sequelize.DataTypes);
db.HazardReport = require('../api/hazardReport/hazardReport.model').default(db.sequelize, Sequelize.DataTypes);
db.Flight = require('../api/flight/flight.model').default(db.sequelize, Sequelize.DataTypes);
db.Pilot = require('../api/pilot/pilot.model').default(db.sequelize, Sequelize.DataTypes);
db.Assessment = require('../api/assessment/assessment.model').default(db.sequelize, Sequelize.DataTypes);
db.User = require('../api/user/user.model')(db.sequelize, Sequelize.DataTypes);

module.exports = db;
