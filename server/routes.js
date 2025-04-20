/**
 * Main application routes
 */

'use strict';

import errors from './components/errors';
import path from 'path';
import lusca from 'lusca';
import * as auth from './auth/auth.service';

export default function(app) {
  
  //app.use('/api/airportRequirements/mobile', require('./api/airportRequirement/mobile'));
  //app.use('/api/notifications/mobile', require('./api/notification/mobile'));
  //app.use('/api/hazardReports/mobile', require('./api/hazardReport/mobile'));
  //app.use('/api/flights/mobile', require('./api/flight/mobile'));
  //app.use('/api/pilots/mobile', require('./api/pilot/mobile'));
  //app.use('/api/assessments/mobile', require('./api/assessment/mobile'));
  //app.use('/api/users/mobile', require('./api/user/mobile'));

  //app.use('/auth/mobile', require('./auth/mobile').default);
  app.use('/auth', require('./auth').default);
  
  //
  // Insert routes below
  app.use('/api/signatures', require('./api/signature'));
  app.use('/api/snapshots', require('./api/snapshot'));
  app.use('/api/todaysFlights', require('./api/todaysFlight'));
  app.use('/api/airportRequirements', require('./api/airportRequirement'));
  app.use('/api/monitors', require('./api/monitor'));
  app.use('/api/airplanes', require('./api/airplane'));
  app.use(lusca.csrf({angular:true}));
  app.get('/fileserver', function(req, res){
    if (req.query) res.sendFile("./fileserver/" + req.query.filename, {root: __dirname});
    else res.status(500);
  });
  app.use('/api/calendar', require('./api/calendar'));
  app.use('/api/timesheets', require('./api/timesheet'));
  app.use('/api/manifests', require('./api/manifest'));
  app.use('/api/pfrs', require('./api/pfr'));
  app.use('/api/reservations', require('./api/reservation'));
  app.use('/api/notifications', require('./api/notification'));
  app.use('/api/hazardReports', require('./api/hazardReport'));
  app.use('/api/flights', require('./api/flight'));
  app.use('/api/pilots', require('./api/pilot'));
  app.use('/api/assessments', require('./api/assessment'));
  //app.use(lusca.csrf({angular:true}));
  app.use('/api/users', require('./api/user'));


  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    //.get(errors[404]);
    .get((req, res) => {
      res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
    });
}
