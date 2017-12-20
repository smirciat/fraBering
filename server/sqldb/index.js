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
db.AirportRequirement = db.sequelize.import('../api/airportRequirement/airportRequirement.model');
db.Notification = db.sequelize.import('../api/notification/notification.model');
db.HazardReport = db.sequelize.import('../api/hazardReport/hazardReport.model');
db.Flight = db.sequelize.import('../api/flight/flight.model');
db.Pilot = db.sequelize.import('../api/pilot/pilot.model');
db.Assessment = db.sequelize.import('../api/assessment/assessment.model');
db.User = db.sequelize.import('../api/user/user.model');

module.exports = db;
