/**
 * Main application file
 */

'use strict';

import express from 'express';
import fs from 'fs';
import sqldb from './sqldb';
import config from './config/environment';
import localEnv from './config/local.env.js';
import {setBearer,getManifests} from './api/todaysFlight/todaysFlight.controller.js';
import {setRosterDay} from './api/calendar/calendar.controller.js';
import {observe} from './api/airplane/airplane.controller.js';
import http from 'http';
import https from 'https';
const schedule = require('node-schedule');
const baseUrl = 'https://localhost:' + config.port;
const axios = require("axios");
const agent = new https.Agent({
    rejectUnauthorized: false
});
var privateKey  = fs.readFileSync(localEnv.KEY, 'utf8');
var certificate = fs.readFileSync(localEnv.CERT, 'utf8');
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
  //axios.post(baseUrl + '/api/todaysFlights/record',{dateString:new Date().toLocaleDateString()}, { httpsAgent: agent })
        //.then((response)=>{
          //console.log('recordAssessment function successfully run');
        //})
        //.catch(err=>{console.log(err.response.data)});
};

let metarFunction=()=>{
  axios.post(baseUrl + '/api/airportRequirements/metars',{}, { httpsAgent: agent })
        .then((response)=>{
          console.log('metar interval going at ' +new Date().toLocaleString());
        })
        .catch(err=>{
          if (err.response) console.log(err.response.data)
          else console.log(err);
        });
};

let tafFunction=()=>{
  axios.post(baseUrl + '/api/airportRequirements/tafs',{}, { httpsAgent: agent })
        .then((response)=>{
          console.log('taf interval going at ' +new Date().toLocaleString());
        })
        .catch(err=>{console.log(err)});
};

let observerFunction=()=>{
  let date=new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear()%100;
  let dateString= `${month}/${day}/${year}`;
  observe('flights',dateString);
};

let firebaseFunction=async ()=>{
  return axios.post(baseUrl + '/api/airplanes/firebaseInterval',{}, { httpsAgent: agent })
        .then((response)=>{
          console.log('firebase interval going at ' +new Date().toLocaleString());
          console.log(response.data);
        })
        .catch(err=>{console.log(err)});
};

let updateRoster=async (date)=>{
  if (!date) date=new Date();
  else date=new Date(date);
  let roster=await setRosterDay(date);
  //console.log(roster[10]);
};

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    updateRoster();
    setBearer();
    //callbackFunction();
    observerFunction();
    const job=schedule.scheduleJob('30 0 * * *',observerFunction);
    metarFunction();
    tafFunction();
    firebaseFunction().then(()=>{
      callbackFunction();
    });
    setInterval(firebaseFunction,60*60*1000);
    setInterval(callbackFunction,1*60*1000); 
    setInterval(metarFunction,3*60*1001);  
    setTimeout(()=>{setInterval(tafFunction,(5*60*1000))},2*60*1000);  
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
