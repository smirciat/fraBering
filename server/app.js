/**
 * Main application file
 */

'use strict';

import express from 'express';
import fs from 'fs';
import sqldb from './sqldb';
import config from './config/environment';
import https from 'https';
const baseUrl = 'https://localhost:' + config.port;
const axios = require("axios");
const agent = new https.Agent({
    rejectUnauthorized: false
});
var privateKey  = fs.readFileSync('/etc/letsencrypt/live/bering.ddns.net/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/bering.ddns.net/fullchain.pem', 'utf8');
var credentials = {key: privateKey, cert: certificate};
// Populate databases with sample data
if (config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();

var cors = require('cors');
app.use(cors());
app.options('*', cors());
//var server = http.createServer(app);
var server = https.createServer(credentials,app);
var socketio = require('socket.io')(server, {
  serveClient: config.env !== 'production',
  path: '/socket.io-client'
});
require('./config/socketio').default(socketio);
require('./config/express').default(app);
require('./routes').default(app);

let callbackFunction=()=>{
  axios.post(baseUrl + '/api/todaysFlights/tf',{dateString:new Date().toLocaleDateString()}, { httpsAgent: agent })
        .then((response)=>{
          console.log('interval going');
        })
        .catch(err=>{console.log(err.response.data)});
};

let metarFunction=()=>{
  axios.post(baseUrl + '/api/airportRequirements/metars',{}, { httpsAgent: agent })
        .then((response)=>{
          console.log('metar interval going at ' +new Date().toLocaleString());
        })
        .catch(err=>{console.log(err.response.data)});
};

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    callbackFunction();
    metarFunction();
    setInterval(callbackFunction,1*60*1000); 
    setInterval(metarFunction,5*60*1001);  
  });
}

sqldb.sequelize.sync()
  .then(startServer)
  .catch(function(err) {
    console.log('Server failed to start due to error: %s', err);
    startServer();
  });

// Expose app
exports = module.exports = app;
