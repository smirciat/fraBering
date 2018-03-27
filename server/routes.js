/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';

export default function(app) {
  // Insert routes below
  app.use('/api/timesheets', require('./api/timesheet'));
  app.use('/api/manifests', require('./api/manifest'));
  app.use('/api/pfrs', require('./api/pfr'));
  app.use('/api/reservations', require('./api/reservation'));
  app.use('/api/airportRequirements', require('./api/airportRequirement'));
  app.use('/api/notifications', require('./api/notification'));
  app.use('/api/hazardReports', require('./api/hazardReport'));
  app.use('/api/flights', require('./api/flight'));
  app.use('/api/pilots', require('./api/pilot'));
  app.use('/api/assessments', require('./api/assessment'));
  app.use('/api/users', require('./api/user'));

  app.use('/auth', require('./auth').default);

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
    });
}
