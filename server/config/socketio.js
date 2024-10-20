/**
 * Socket.io configuration
 */
'use strict';

import config from './environment';

// When the user disconnects.. perform this
function onDisconnect(socket) {
}

// When the user connects.. perform this
function onConnect(socket) {
  // When the client emits 'info', this listens and executes
  socket.on('info', data => {
    socket.log(JSON.stringify(data, null, 2));
  });

  // Insert sockets below
  require('../api/todaysFlight/todaysFlight.socket').register(socket);
  require('../api/calendar/calendar.socket').register(socket);
  require('../api/airplane/airplane.socket').register(socket);
  require('../api/monitor/monitor.socket').register(socket);
  require('../api/timesheet/timesheet.socket').register(socket);
  require('../api/manifest/manifest.socket').register(socket);
  require('../api/pfr/pfr.socket').register(socket);
  require('../api/reservation/reservation.socket').register(socket);
  require('../api/airportRequirement/airportRequirement.socket').register(socket);
  require('../api/notification/notification.socket').register(socket);
  require('../api/hazardReport/hazardReport.socket').register(socket);
  require('../api/flight/flight.socket').register(socket);
  require('../api/pilot/pilot.socket').register(socket);
  require('../api/assessment/assessment.socket').register(socket);

}

export default function(socketio) {
  // socket.io (v1.x.x) is powered by debug.
  // In order to see all the debug output, set DEBUG (in server/config/local.env.js) to including the desired scope.
  //
  // ex: DEBUG: "http*,socket.io:socket"

  // We can authenticate socket.io users and access their token through socket.decoded_token
  //
  // 1. You will need to send the token in `client/components/socket/socket.service.js`
  //
  // 2. Require authentication here:
  // socketio.use(require('socketio-jwt').authorize({
  //   secret: config.secrets.session,
  //   handshake: true
  // }));

  socketio.on('connection', function(socket) {
    socket.setMaxListeners(50); 
    socket.address = socket.request.connection.remoteAddress +
      ':' + socket.request.connection.remotePort;

    socket.connectedAt = new Date();

    socket.log = function(...data) {
      console.log(`SocketIO ${socket.nsp.name} [${socket.address}]`, ...data);
    };

    // Call onDisconnect.
    socket.on('disconnect', () => {
      onDisconnect(socket);
      socket.log('DISCONNECTED');
    });

    // Call onConnect.
    onConnect(socket);
    socket.log('CONNECTED');
  });
}
