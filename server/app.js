/**
 * Main application file
 */

'use strict';

import express from 'express';
import fs from 'fs';
import sqldb from './sqldb';
import config from './config/environment';
import localEnv from './config/local.env.js';
import {charterInterval} from './api/futureCharter/futureCharter.controller.js';
import {tf,setBearer,getFlightLogs,invalidateAirportCache} from './api/todaysFlight/todaysFlight.controller.js';
import {setRosterDay} from './api/calendar/calendar.controller.js';
import {setupSocket,observe,observePilots,setPreviousPfrs,firebaseInterval, quickGrab} from './api/airplane/airplane.controller.js';
import {metars,tafs,syncPireps} from './api/airportRequirement/airportRequirement.controller.js';

//import https from 'https';
import http from 'http';
const schedule = require('node-schedule');
const helmet = require("helmet");
//var privateKey  = fs.readFileSync(localEnv.KEY, 'utf8');
//var certificate = fs.readFileSync(localEnv.CERT, 'utf8');
//var credentials = {key: privateKey, cert: certificate};
// Populate databases with sample data
if (config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();

var cors = require('cors');
app.use(cors());
app.options('*', cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        frameAncestors: [
          'https://www.beringair.com',
          'https://www.iframe-generator.com',
          'https://smircich.ddns.net:58785'
        ],
    
        defaultSrc: ["'self'"],
    
        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com"
        ],
    
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https:'
        ],
    
        imgSrc: [
          "'self'",
          'data:',
          'blob:'
        ],

        frameSrc: [
          "'self'",
          'blob:'
        ],
    
        fontSrc: [
          "'self'",
          'https:',
          'data:'
        ],
    
        connectSrc: [
          "'self'",
          'ws:',
          'wss:'
        ],
    
        objectSrc: ["'none'"]
      }
    },
    // It's often recommended to disable frameguard when using frame-ancestors
    // as frame-ancestors offers more granular control.
    frameguard: false, 
  })
);
var server = http.createServer(app);
//var server = https.createServer(credentials,app);
var socketio = require('socket.io')(server, {
  serveClient: config.env !== 'production',
  path: '/socket.io-client'
});
require('./config/socketio').default(socketio);
require('./config/express').default(app);
require('./routes').default(app);
setupSocket(socketio);

let callbackRunning=false;
let callbackFunction=async ()=>{
  if (callbackRunning) {
    console.log('TF Function skipped; previous run still going');
    return;
  }
  callbackRunning=true;
  let timed=false;
  try {
    await getFlightLogs();
    console.time('TF Function');
    timed=true;
    console.log(await tf());
  } catch (err) {
    console.log('TF callback failed', err);
  } finally {
    if (timed) console.timeEnd('TF Function');
    callbackRunning=false;
  }
};

let metarRunning=false;
let metarFunction=async ()=>{
  if (metarRunning) {
    console.log('Metar Function skipped; previous run still going');
    return;
  }
  metarRunning=true;
  let timed=false;
  try {
    await syncPireps();
    console.time('Metar Function');
    timed=true;
    console.log(await metars());
    invalidateAirportCache();
  } catch (err) {
    console.log('Metar callback failed', err);
  } finally {
    if (timed) console.timeEnd('Metar Function');
    metarRunning=false;
  }
};

let tafRunning=false;
let tafFunction=async ()=>{
  if (tafRunning) {
    console.log('TAF Function skipped; previous run still going');
    return;
  }
  tafRunning=true;
  let timed=false;
  try {
    console.time('TAF Function');
    timed=true;
    console.log(await tafs());
    invalidateAirportCache();
  } catch (err) {
    console.log('TAF callback failed', err);
  } finally {
    if (timed) console.timeEnd('TAF Function');
    tafRunning=false;
  }
};

let observerFunction=async ()=>{
  await setPreviousPfrs();
  await observe();
  await observePilots();
};

let firebaseFunction=async ()=>{
  console.time('Firebase Interval');
  console.log(await firebaseInterval());
  console.timeEnd('Firebase Interval');
};

let updateRoster=async (date)=>{
  if (!date) date=new Date();
  else date=new Date(date);
  let roster=await setRosterDay(date);
};

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, async function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
    updateRoster();
    setBearer();
    await observerFunction();
    schedule.scheduleJob('30 0 * * *',observerFunction);
    metarFunction();
    tafFunction();
    await firebaseFunction();
    //fs.writeFileSync("output.json", JSON.stringify(quickGrab().pilots));
    callbackFunction();
    setInterval(charterInterval,60*60*1100);
    setInterval(firebaseFunction,60*60*1000);
    setInterval(callbackFunction,1*60*1000); 
    setInterval(metarFunction,3*60*1001);  
    setTimeout(()=>{setInterval(tafFunction,(5*60*1000))},2*60*1000);  
    setTimeout(charterInterval,3*60*1000);  
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
