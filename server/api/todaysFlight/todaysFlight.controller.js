/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/todaysFlights              ->  index
 * POST    /api/todaysFlights              ->  create
 * GET     /api/todaysFlights/:id          ->  show
 * PUT     /api/todaysFlights/:id          ->  update
 * DELETE  /api/todaysFlights/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import sequelize from 'sequelize';

import {TodaysFlight,AirportRequirement,Airplane,Assessment} from '../../sqldb';
import {quickGrab,firebaseQueryFunction,firebaseLimited,firebaseMin} from '../airplane/airplane.controller.js';
import {getMetar,getMetarAVWX,getMetarSynoptic,getMetarList,parseADDS} from '../airportRequirement/airportRequirement.controller.js';
import localEnv from '../../config/local.env.js';
import fs from 'fs';
import config from '../../config/environment';
const MOBILE_TOKEN=localEnv.MOBILE_TOKEN;
let busy=false;
let bearer='';
let allAirports=[];
let airplanes=[];
let fbAirplanes=[];
let pfrs=[];
let pilots=[];
let flightLog=[];
let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
const baseUrl = 'https://localhost:' + config.port;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});
let stopped=false;
let staleFile=false;
let doubleFail=false;
let equipmentArr=[{id:1,name:"Caravan",short:"C208",wind:35,xwind:25,temp:-50,taxiFuel:35,fuelBurn:400,minFuel:600,ZFW:9062},
       //{id:2,name:"Navajo",wind:40,xwind:30,temp:-40,taxiFuel:35},
       {id:3,name:"Casa",short:"C212",wind:35,xwind:25,temp:-50,taxiFuel:110,fuelBurn:700,minFuel:1323,ZFW:15653},
       {id:4,name:"King Air",short:"BE20",wind:40,xwind:35,temp:-50,taxiFuel:90,maxMain:1293,maxAux:529,fuelBurn:700,minFuel:1500,ZFW:11000},
       {id:5,name:"Beech 1900",short:"B190",wind:40,xwind:35, temp:-50,taxiFuel:110,maxMain:1621,maxAux:621,fuelBurn:800,minFuel:1420,ZFW:15700},
       {id:6,name:"Sky Courier",short:"C408",wind:40,xwind:30,temp:-50,taxiFuel:70,fuelBurn:800,minFuel:1100,ZFW:17900}];

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function saveUpdates(updates) {
  return function(entity) {
    if(entity) {
      return entity.updateAttributes(updates)
        .then(updated => {
          return updated;
        });
    }
  };
}

function removeEntity(res) {
  return function(entity) {
    if (entity) {
      return entity.destroy()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.log(err);
    res.status(statusCode).send(err);
  };
}
function handleErrorMultiple(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.log(err);
  };
}

// Gets a list of TodaysFlights
export function index(req, res) {
  return TodaysFlight.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

//gets the current value of the stopped boolean
export function returnStopped(req,res){
  res.status(200).json({stopped:doubleFail});//staleFile
}

//gets the current value of the stopped boolean
export function returnFail(req,res){
  res.status(401).json({stopped:staleFile});
}

// Gets a list of TodaysFlights
export function dayFlights(req, res) {
  let date=new Date(req.body.dateString).toLocaleDateString();
  return TodaysFlight.findAll({
      where:{
        date:date
      }
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a list of TodaysFlights
export function flightRange(req, res) {
  req.body.startDate=new Date(req.body.startDate);
  req.body.startDate.setHours(0, 0, 0, 0);
  let startDate=req.body.startDate.toISOString();
  req.body.endDate=new Date(req.body.endDate);
  req.body.endDate.setHours(0, 0, 0, 0);
  let endDate=req.body.endDate.toISOString();
  return TodaysFlight.findAll({
      where: {
        dateObject: {
          $between: [startDate,endDate]
        }
      }
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function dayFlightsMobile(req, res) {
  if (!req.body||req.body.token!==MOBILE_TOKEN) return res.status(401).json('Mismatched Token');
  let date=new Date(req.body.dateString).toLocaleDateString();
  return TodaysFlight.findAll({
      where:{
        date:date
      }
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single TodaysFlight from the DB
export function show(req, res) {
  return TodaysFlight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function showMobile(req, res) {
  if (!req.body||req.body.token!==MOBILE_TOKEN) return res.status(401).json('Mismatched Token');
  return TodaysFlight.find({
    where: {
      _id: req.body.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new TodaysFlight in the DB
export function create(req, res) {
  return TodaysFlight.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing TodaysFlight in the DB
export function update(req, res) {
  try {firebaseMin(req.body)}
  catch(err){console.log(err)}
  if (req.body._id) {
    delete req.body._id;
  }
  return TodaysFlight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Updates an existing TodaysFlight in the DB
export function updateMobile(req, res) {
  if (!req.body||req.body.token!==MOBILE_TOKEN) return res.status(401).json('Mismatched Token');
  let id;
  if (req.body.flight) id=req.body.flight._id;
  if (req.body.flight._id) {
    delete req.body.flight._id;
  }
  return TodaysFlight.find({
    where: {
      _id: id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body.flight||req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a TodaysFlight from the DB
export function destroy(req, res) {
  return TodaysFlight.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

export async function recordAssessments(req,res){
  try{
    let instance=await TodaysFlight.findAll({
       where:{
          date:new Date().toLocaleDateString()
        }
    });
    let todaysFlights=[];
    instance.forEach(i=>{
      if (i.dataValues) todaysFlights.push(i.dataValues);
    });
    let date=new Date();
    if (date.getSeconds()<10||date.getSeconds()>50) date.setSeconds(date.getSeconds()+30);
    let date2=new Date(date);
    date2.setMinutes(date2.getMinutes()+1);
    date2.setSeconds(date2.getSeconds()+2);
    date.setSeconds(date.getSeconds()-2);
    let flights=todaysFlights.filter(flight=>{return flight.active==="true"});
    let flightArr=[];
    flights.forEach((flight)=>{
      if (!flight.departTimes||flight.departTimes.length<1) return;
      let depart=flight.departTimes[0];
      let dDate=new Date();
      if (depart) {
        depart=depart.split(':');
        if (depart.length===3) {
          dDate.setHours(depart[0],depart[1],depart[2]);
          if (dDate<=date2&&dDate>=date) {
            let pilot=flight.pilot;
            if (flight.pilotObject) pilot=flight.pilotObject.displayName;
            //record assessment
            let dataObject={date:date,airportObjs:flight.airportObjs,pilot:pilot,flight:flight.flightNum,
                   equipment:flight.aircraft,color:flight.color};
            flightArr.push(dataObject);
          }
        }
      }  
    });
    for (const flight of flightArr) {
      try {
        let res=await Assessment.create(flight);
        console.log('Assessment Recorded for Flight# ' + flight.flightNum);
        //console.log(res.data);
      }
      catch(err){console.log(err);}
    }
    console.log('Assessment Function run successfully');
    res.status(200).json('Record Assessment success');
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to run record Assessments');
  }
}

function getDistance(airportName1,airportName2){//lat1, lon1, lat2, lon2) {
  let index1=allAirports.map(e=>e.name).indexOf(airportName1);
  let index2=allAirports.map(e=>e.name).indexOf(airportName2);
  if (index1<0||index2<0) return 0;
  const lat1=allAirports[index1].latitude;
  const lon1=allAirports[index1].longitude;
  const lat2=allAirports[index2].latitude;
  const lon2=allAirports[index2].longitude;
  const R = 3443.8;//in NM 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in NM
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

async function log(){
  let file="log.csv";
  let data=fs.readFileSync(__dirname+'/../../fileserver/'+file, 'utf-8');
  let arr=data.split('\r\n');
  let headers=arr.shift().split(',');
  let statusIndex=30;
  let tempIndex=headers.indexOf('Flight Status');
  if (tempIndex>-1) statusIndex=tempIndex;
  let flightLog=[];
  arr.forEach(a=>{
    let line=a.split(',');
    if (!line[0]||!line[statusIndex-1]) return;
    let obj={
      aircraft:line[4],
      flightStatus:line[statusIndex],
      arrTime:line[16],
      flightNum:line[3],
      takeoffTime:line[13],
      flightId:line[1],
      date:new Date(line[0]).toLocaleDateString(),
      departTime:line[11]
    };
    //console.log(obj.flightStatus);
    //headers.forEach((h,index)=>{
    //  obj[h]=line[index];
    //});
    flightLog.push(obj);
  });
  for (let flight of flightLog){
    let sameFlights=flightLog.filter(f=>{return f.flightNum.split('.')[0]===flight.flightNum.split('.')[0]&&f.date===flight.date&&f.flightStatus});
    if (sameFlights.length>0&&!flight.flightStatus) flight.flightStatus=sameFlights[0].flightStatus;
  }
  //console.log(flightLog);
  return flightLog.sort((a,b)=>{
    return a.flightNum-b.flightNum||new Date("1970-01-01T" + a.departTime)-new Date("1970-01-01T" + b.departTime);
  });
}

export async function tf(req,res) {
  if (busy) {
    busy=false;
    //if (res) return res.status(500).json('tf module is busy');
    //else return;
  }
  busy=true;
  const memoryUsage = process.memoryUsage();
  console.log('Memory Usage:');
  console.log(`RSS: ${memoryUsage.rss / (1024 * 1024)} MB`);
  console.log(`Heap Total: ${memoryUsage.heapTotal / (1024 * 1024)} MB`);
  console.log(`Heap Used: ${memoryUsage.heapUsed / (1024 * 1024)} MB`);
  console.log(`External: ${memoryUsage.external / (1024 * 1024)} MB`);
  console.log(`Array Buffers: ${memoryUsage.arrayBuffers / (1024 * 1024)} MB`);
  try {
    doubleFail=false;
    let file="current.csv";
    let data=fs.readFileSync(__dirname+'/../../fileserver/'+file, 'utf-8');
    let stats=fs.statSync(__dirname+'/../../fileserver/'+file, 'utf-8');
    console.log('Timestamp of current.csv is: ' + new Date(stats.mtimeMs).toLocaleString());
    const tenMinutesAgo = new Date(new Date().getTime() - 10 * 60 * 1000); // 10 minutes in milliseconds
    const hour=new Date().getHours();
    const minutes=new Date().getMinutes();
    if ((hour===23&&minutes>55)||(hour===0&&minutes<5)) return;
    if (stats.mtimeMs < tenMinutesAgo) {
      staleFile=true;
    }
    else {
      stopped=false;
      staleFile=false;
    }
    console.log('Stopped value is: ' + staleFile.toString());
    staleFile=true;
    //let flightLog=await log();
    if (true) {//(!allAirports||allAirports.length===0) {
      allAirports=[];
      let instance=await AirportRequirement.findAll({});
      instance.forEach(i=>{
        if (i.dataValues) allAirports.push(i.dataValues);
      });
    }
    if (true){//!airplanes||airplanes.length===0) {
      airplanes=[];
      let instance=await Airplane.findAll({});
      instance.forEach(i=>{
        if (i.dataValues) airplanes.push(i.dataValues);
      });
    }
    let qGrab=quickGrab();
    fbAirplanes=qGrab.aircraft;
    pilots=qGrab.pilots;
    let todaysPfrs=qGrab.flights;
    //firebaseQueryFunction(collection,limit,parameter,operator,value,timestampBoolean)
    let d=new Date();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    let year = String(d.getFullYear()).slice(-2);
    let dateString=month+'/'+day+'/'+year;
    pfrs=await firebaseLimited({body:{collection:'flights',limit:200}});//'flights',200,'dateString','==',dateString,false);
    //let formattedDate=new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    //.filter(pfr=>{return pfr.dateString===formattedDate});  
  
    let date=new Date();
    let date2=new Date(date);
    date2.setDate(date2.getDate()+1);
    date2=date2.toLocaleDateString();
    date=date.toLocaleDateString();
    let flights=[];
      
      
    //let arr=data.split('\r\n');
    //if (!arr[1]) {
      //console.log('failed to load csv file');
      //res.status(404).json('failure');
      //eturn;
    //}
    //let dateArr=arr[1].split(' ');
    //let reportDate=new Date(dateArr[2]+' '+dateArr[3]+' '+dateArr[4]);
    //if (reportDate.toLocaleDateString()!==new Date().toLocaleDateString()) staleFile=true;
      
      
    if (staleFile){
      let resp=await getManifests();
      if (!resp||!resp.flights){
        console.log('TakeFlite API has failed to retrieve Flights!');
        doubleFail=true;
        if (hour>=7&&hour<22&&!stopped) {//only text me during waking hours, and only do it once, then turn stopped variable to true to prevent future texts
          let r=await axios.post(baseUrl + '/api/monitors/twilio',{to:"+19073992019",body:"Takeflite updating has stopped"}, { httpsAgent: agent });
          if (r) stopped=true;
          console.log('Twilio message sent');
          busy=false;
          return res.status(500).json('Takeflite Fail');
        }
        else {
          busy=false;
          return res.status(500).json('Takeflite Fail');
        }
      }
      let manifests=resp.flights;
      for (let flight of manifests){
        if (flight.flightLegs[0]&&flight.flightLegs[0].crew.length===0&&flight.flightLegs[1]&&flight.flightLegs[1].crew.length>0){
          flight.flightLegs=flight.flightLegs.filter((leg,i)=>{return (leg.crew&&leg.crew.length>0)||i===flight.flightLegs.length-1});//weird empty routing from api on 4/13/25 for 844 and 846
        }
        if (flight.flightLegs[0].crew&&flight.flightLegs[0].crew.length>0) {
          if (flight.flightLegs[0].crew[0].position==="First Officer") flight.flightLegs[0].crew.reverse();
          flight.pilot=flight.flightLegs[0].crew[0].name;
        }
        if (flight.flightLegs[0].crew&&flight.flightLegs[0].crew.length>1) flight.coPilot=flight.flightLegs[0].crew[1].name;
        else flight.coPilot="";
        //flight.aircraft=??????
        flight.flightStatus=null;
        flight.aircraft=null;
        flight.tfliteDepart=null;
        flight.active=true;
        flight.date=new Date(flight.departureDate).toLocaleDateString();
        flight.flightNum=flight.flightNumber;
        flight.operation=flight.type;
        for (let line of flightLog){
          if (!line.flightNum||!line.date) continue;
          //let flightNumArr=line.flightNum.split('.');
          //if (flightNumArr.length>0&&flightNumArr[0]===flight.flightNum&&line.date===flight.date){
            //if (line.aircraft) flight.aircraft=line.aircraft;
            //if (line.flightStatus) flight.flightStatus=line.flightStatus;
            //if (line.takeoffTime&&!flight.tfliteDepart) flight.tfliteDepart=line.takeoffTime;
          //} 
        }
        flight.departTimes=[];
        flight.arriveTimes=[];
        flight.airports=[];
        flight.flightLegs.forEach((leg,i)=>{
          if (!flight.flightNum&&leg.id) flight.flightNum=leg.id;
          if (!flight.flightId&&leg.id) flight.flightId=leg.id;
          if (leg.flightStatus) flight.flightStatus=leg.flightStatus;
          if (leg.registration) flight.aircraft=leg.registration;
          flight.departTimes.push(new Date(leg.departureTime).toTimeString().slice(0,8));
          flight.arriveTimes.push(new Date(leg.arrivalTime).toTimeString().slice(0,8));
          flight.airports.push(leg.origin.name);
          if (i===flight.flightLegs.length-1) {
            //add final destination to flight.airports
            flight.airports.push(leg.destination.name);
            //calculate last time for flight.departTImes (need aircraft type first!)
            let speed=160;
            let airplanesIndex=airplanes.map(e=>e.registration).indexOf(flight.aircraft);
            if (airplanesIndex>-1) {
              speed=250;
              flight.status=airplanes[airplanesIndex].status;
            }
            else flight.status="NORM";
            let flightTime=60*getDistance(flight.airports[flight.airports.length-2],flight.airports[flight.airports.length-1])/speed + 10;//est flight time in minutes
            let lastTime=new Date(flight.date);
            let timeArr=flight.departTimes[flight.departTimes.length-1].split(':');
            if (timeArr.length>1) lastTime.setHours(timeArr[0],timeArr[1],0);
            else lastTime=new Date(flight.departTimes[flight.departTimes.length-1]);
            lastTime.setMinutes(lastTime.getMinutes()+flightTime);
            lastTime=lastTime.toTimeString().slice(0,8);
            if (lastTime.substring(0,7)==="Invalid") lastTime=undefined;
            //if (lastTime) flight.departTimes.push(lastTime);
            flight.departTimes.push(flight.arriveTimes[flight.arriveTimes.length-1]);
          }
          
        });
        let tempArr=flightLog.filter(log=>{
          let logArr=log.departureDate.split('T');
          if (logArr.length<2) return false;
          let logDate=logArr[0].split('-');
          logDate=new Date(logDate[1]+'/'+logDate[2]+'/'+logDate[0]).toLocaleDateString();
          let logTime=logArr[1];
          if (logTime) logTime=logTime.substring(0,8);
          //if (log.registration==="N241BA") console.log(logTime)
          //log.departureDate must equal flight.departimes[0] converted to timestamp format
          return log.registration===flight.aircraft&&logDate===flight.date&&logTime===flight.departTimes[0]&&log.takeOff;
        });
        if (tempArr.length>0&&tempArr[0].takeOff.split('T').length>1) flight.tfliteDepart=tempArr[0].takeOff.split('T')[1].substring(0,5);
        
        //if (flight.flightNum==='812') {
          //console.log(tempArr);
          //console.log(flight.aircraft)
          //console.log(flight.date)
          //console.log(flight.departTimes[0])
        //}
        //if (tempArr.length>1) console.log(tempArr);
        //if (tempArr.length===1) console.log(flight.tfliteDepart);
      }
      //console.log(manifests[7])
      flights=manifests;
    }  
  
  
    if (!staleFile){
      
      arr.splice(0,8);
      let currentFlights=[];
      let pilot="No Pilot Assigned";
      let index=0;
      arr.forEach((a)=>{
        if (!a||typeof a!=='string') return;
        let temp=a.split(',');
        if (!temp[2]) return;
        let obj={};
        if (temp[0]) {
          pilot=temp[0];
        }
        obj.pilot=pilot;
        obj.date=new Date(temp[2]).toLocaleDateString();
        if (obj.date==='Invalid Date') {
          console.log(a);
          return;
        }
        obj.departTime=new Date(temp[2]).toTimeString().slice(0,8);
        obj.coPilot=temp[3];
        obj.aircraft=temp[4];
        obj.operation=temp[5];
        obj.from=temp[6];
        obj.to=temp[7];
        obj.flightNum=temp[8];
        obj.flightId=temp[temp.length-1];
        if (index>0&&!temp[8]&&obj.flightId===currentFlights[index-1].flightId) obj.flightNum=currentFlights[index-1].flightNum;
        if (obj.operation==='Ferry'||obj.operation==='Training'||obj.operation==='Test') obj.nonRevFlight=true;
        if (!obj.flightNum||obj.flightNum==='Ferry'||obj.flightNum==='Training'||obj.flightNum==='Test') obj.flightNum=obj.flightId;
        if (obj.flightNum.split('.').length>1) obj.flightNum=obj.flightNum.split('.')[0];
        currentFlights.push(obj);
        index++;
      });
      
      
      //I now have currentFlights with either a flightNum or FlightId in the flightNum attribute.  Before the sort, maybe run through it once to make sure its right?
      //let tempFlights=JSON.parse(JSON.stringify(currentFlights));
      currentFlights.forEach((flight,index)=>{
        if (flight.flightNum.length>4||flight.flightNum.length<3) {
          let sameId=currentFlights.filter(f=>{return f.flightId===flight.flightId});
          sameId.forEach(f=>{
            if (f.flightNum.length<=4&&f.flightNum.length>=3) flight.flightNum=f.flightNum;
          });
        }
      });
      currentFlights.sort((a,b)=>{
        let aDate=new Date(a.date);
        let bDate=new Date(b.date);
        let aArr=a.departTime.split(':');
        let bArr=b.departTime.split(':');
        if (aArr.length>1) aDate.setHours(aArr[0],aArr[1],0);
        if (bArr.length>1) bDate.setHours(bArr[0],bArr[1],0);
        return a.pilot.localeCompare(b.pilot)||new Date(a.date)-new Date(b.date)||a.flightNum.localeCompare(b.flightNum)||aDate-bDate;
      });
      let departTimes=[];
      let airports=[];
      //let flights=[];
      let flight;
      currentFlights.push({departTime:'00:00:00',from:'here',to:'there',flightNum:'000',flightId:'000'});
      currentFlights.forEach((f,index)=>{
        //still same flight
        if (index>0&&f.flightNum===currentFlights[index-1].flightNum&&f.date===currentFlights[index-1].date){
          airports.push(f.from);
          departTimes.push(f.departTime);
        }
        //new flight
        if (index===0||f.flightNum!==currentFlights[index-1].flightNum||index===currentFlights.length-1||f.date!==currentFlights[index-1].date) { 
          //close out previous flight
          if (index>0) {
            //if (index>=currentFlights.length-1) airports.push(currentFlights[index].to);
            airports.push(currentFlights[index-1].to);
            flight.airports=airports;
            //calculate flight time for last leg here---------------------------------------------------------------------------
            let speed=160;
            let airplanesIndex=airplanes.map(e=>e.registration).indexOf(flight.aircraft);
            if (airplanesIndex>-1) {
              flight.status=airplanes[airplanesIndex].status;
            }
            else flight.status="NORM";
            let flightTime=60*getDistance(currentFlights[index-1].to,currentFlights[index-1].from)/speed + 10;//est flight time in minutes
            let lastTime=new Date(currentFlights[index-1].date);
            let timeArr=currentFlights[index-1].departTime.split(':');
            if (false){//(index>=currentFlights.length-1) {
              flightTime=60*getDistance(currentFlights[index].to,currentFlights[index].from)/speed + 10;
              lastTime=new Date(currentFlights[index].date);
              timeArr=currentFlights[index].departTime.split(':');
            }
            if (timeArr.length>1) lastTime.setHours(timeArr[0],timeArr[1],0);
            else lastTime=new Date(currentFlights[index-1].departTime);
            //if (f.pilot==='sgordon') console.log(lastTime.toLocaleString());
            lastTime.setMinutes(lastTime.getMinutes()+flightTime);
            lastTime=lastTime.toTimeString().slice(0,8);
            if (lastTime.substring(0,7)==="Invalid") lastTime=undefined;
            if (lastTime) departTimes.push(lastTime);
            flight.departTimes=departTimes;
            delete flight.departTime;
            delete flight.to;
            delete flight.from;
            flights.push(flight);
          }
          //initialize new flight
          flight=f;
          airports=[f.from];
          //airports.push(f.from);
          departTimes=[f.departTime];
          //departTimes.push(f.departTime);
        }
      });    
    }  
  
    let instance=await TodaysFlight.findAll({
      order: [['_id', 'DESC']],
      limit: 3000
    });
    let todaysFlights=[];
    let allFlights=[];
    instance.forEach(i=>{
      if (i.dataValues&&(i.dataValues.date===date||i.dataValues.date===date2)) todaysFlights.push(i.dataValues);
      if (i.dataValues) allFlights.push(i.dataValues);
    });
    let updated=[];
    for (let f of todaysFlights) {
      let fa=flights.filter(x=>{
        return f.date===x.date;
      });
      if (fa.length===0) return;
      let matchedArr=fa.filter(e=>{
        if (!e.flightNum||!f.flightNum) return false;
        return e.flightNum.toString()==f.flightNum.toString();
      });//map(e=>e.flightNum).indexOf(f.flightNum);
      let active=f.active;
      if (matchedArr.length===0) {
        active="false";
        //if (!f.nonRevFlight) active="false";
        //else {
        //  if (!staleFile) active="false";
        //  else active="true";
        //}
      }
      else active="true";
      if (active!==f.active) {
        f.active=active;
        console.log(f._id+' active');
        updated.push(f._id);
      }
      //return;
    }
  
  
  
    for (let [flightIndex, flight] of flights.entries()){
      if (!flight) return;
      //flight.tfliteDepart=null;
      //check flightLog for flight status (remove section when reverting to tflite api)
      //for (let line of flightLog){
        //if (!line.flightNum||!line.date) continue;
        //let flightNumArr=line.flightNum.split('.');
        //if (flightNumArr.length>0&&flightNumArr[0]===flight.flightNum&&line.date===flight.date){
          //if (line.aircraft) flight.aircraft=line.aircraft;
          //if (!staleFile) flight.flightStatus=line.flightStatus;
          //if (line.takeoffTime&&!flight.tfliteDepart) flight.tfliteDepart=line.takeoffTime;
        //} 
      //}
      //update weather per destination via airportObjs
      flight.airportObjs=[];
      for (const element of flight.airports) {
        let a=JSON.parse(JSON.stringify(element));
        let airport={name:a, threeLetter:a, metarObj:{airport:{name:a,threeLetter:a}}};
        if (!a) {
          flight.airportObjs.push({airport:airport});
          return;
        }
        if (a&&typeof a === "string"&&a.substring(0,9)==="Fairbanks") a="Fairbanks";
        if (a&&typeof a === "string"&&a.substring(0,9)==="Anchorage") a="Anchorage";
        let i=allAirports.map(e=>e.name).indexOf(a);
        if (i>-1) {
          airport=JSON.parse(JSON.stringify(allAirports[i]));
          let taf='';
          let TAF={};
          if (airport.currentTaf) taf=airport.currentTaf;
          taf=airport.currentTaf;
          if (airport.currentTafObject) TAF=airport.currentTafObject;
          //if (airport.metarObj&&(!taf||taf==='')) taf=airport.metarObj.taf;
          if (!airport.metarObj) {
            if (airport.currentMetar) airport.metarObj={metar:airport.currentMetar};
            else airport.metarObj={};
          }
          airport.metarObj.airport=JSON.parse(JSON.stringify(airport));
          airport.metarObj.aircraft=flight.aircraft;
          airport.metarObj.color=overallRiskClass(airport.metarObj);
          airport.metarObj.usingManual=false;
          if (airport.metarObj.color===' airport-blue'||airport.metarObj.color===' airport-purple') {
            if (airport.manualObs&&airport.manualTimestamp&&isLessThanOneHourAgo(new Date(airport.manualTimestamp))){
              if (typeof airport.metarObj!=='object') airport.metarObj={};
              if (!airport.metarObj['Raw-Report']) {
                let obs="UNOFFICIAL: ";
                if (airport.manualObs.isOfficial) obs="OFFICIAL OBSERVATION: ";
                if (airport.manualObs.windSpeed&&airport.manualObs.windDirection) obs=obs + "Wind " + airport.manualObs.windDirection + "@" + airport.manualObs.windSpeed + "kts";
                if (airport.manualObs.visibility) obs=obs + ", Visibility " + airport.manualObs.visibility;
                if (airport.manualObs.ceiling) obs=obs + ", Ceiling " + airport.manualObs.ceiling;
                if (airport.manualObs.altimeter) obs=obs + ", Altimeter " + airport.manualObs.altimeter;
                airport.metarObj['Raw-Report']=obs;
              }
              airport.metarObj.Visibility=airport.manualObs.visibility;
              airport.metarObj.Ceiling=airport.manualObs.ceiling;
              airport.metarObj['Wind-Gust']=airport.manualObs.windSpeed;
              airport.metarObj['Wind-Direction']=airport.manualObs.windDirection;
              airport.metarObj.altimeter=airport.manualObs.altimeter;
              airport.metarObj.isOfficial=airport.manualObs.isOfficial;
              airport.metarObj.usingManual=true;
              airport.metarObj.manualObs-airport.manualObs;
              airport.metarObj.manualTimestamp-airport.manualTimestamp;
              airport.metarObj.color=overallRiskClass(airport.metarObj);
              if (airport.manualObs.webcam) airport.metarObj['Raw-Report']="WebCam Observation, VFR Only";
              if (airport.manualObs.webcamIFR) airport.metarObj['Raw-Report']="Official WebCam Observation";
              if (!airport.metarObj.isOfficial&&airport.metarObj.usingManual) airport.metarObj.color=airport.metarObj.color+" unofficial";
            }
          }
          
          airport.metarObj.taf=taf;
          airport.metarObj.TAF=TAF;
        }
        else {
          //airport name not found in database, look it up on avwx
          airport=await airportNameToMetar(airport);
          //if we didn't find it, punt
          if (airport.metarObj&&airport.metarObj['Raw-Report']) {
            airport.metarObj.airport=JSON.parse(JSON.stringify(airport));
            airport.metarObj.aircraft=flight.aircraft;
            airport.metarObj.color=overallRiskClass(airport.metarObj);
          }  
          else {
            airport.metarObj={airport:JSON.parse(JSON.stringify(airport))};
            airport.metarObj.aircraft=flight.aircraft;
            airport.metarObj.color=overallRiskClass(airport.metarObj);
          }
        }
        
        flight.airportObjs.push(airport.metarObj);
        
      }
      if (flight.airportObjs) {
        flight.color=flightRiskClass(JSON.parse(JSON.stringify(flight.airportObjs)));
        //if (flight.ocRelease) flight.color+=' oc';
      }
      else console.log('No airportObjs?');
      
      let fbIndex=fbAirplanes.map(e=>e._id).indexOf(flight.aircraft);
      if (fbIndex>-1) flight.airplaneObj=fbAirplanes[fbIndex];
      let eqIndex=-1;
      if (fbIndex>-1&&fbAirplanes[fbIndex]) {
        if (fbAirplanes[fbIndex].acftType.trim()==="Courier") fbAirplanes[fbIndex].acftType="Sky Courier";
        eqIndex=equipmentArr.map(e=>e.name).indexOf(fbAirplanes[fbIndex].acftType.trim());
        if (eqIndex>-1) {
          flight.equipment=equipmentArr[eqIndex];
          flight.taxiFuel=equipmentArr[eqIndex].taxiFuel;
        }
      }
      let acPfrs=pfrs.filter((pfr)=>{return pfr.acftNumber===flight.aircraft});
      if (acPfrs.length>0){
        acPfrs.sort((a,b)=>{
          let aTime, bTime;
          if (!a.legArray[a.legArray.length-1]) aTime='1/1/1979';
          else aTime=a.legArray[a.legArray.length-1].onTime||'1/1/1979';
          if (!b.legArray[b.legArray.length-1]) bTime='1/1/1979';
          else bTime=b.legArray[b.legArray.length-1].onTime||'1/1/1979';
          return new Date(aTime)-new Date(bTime);
        });
        acPfrs=acPfrs.filter(pfr=>{return pfr.legArray&&pfr.legArray[pfr.legArray.length-1]&&pfr.legArray[pfr.legArray.length-1].onTime&&pfr.legArray[pfr.legArray.length-1].onTime._seconds});
        if (acPfrs&&acPfrs[0]){
          flight.autoOnboard=acPfrs[0].legArray[acPfrs[0].legArray.length-1].fuel-acPfrs[0].legArray[acPfrs[0].legArray.length-1].burn;
        }
      }
      
     //map flights array(from getManifests API) to todaysFlights array (from postgresql database)
      //let faIndex=fa.map(e=>e.flightNum).indexOf(flight.flightNum);
      let matchedFA=todaysFlights.filter(f=>{return flight.date===f.date&&f.flightNum===flight.flightNum}).sort((a,b)=>{return b._id-a._id});
      for (let x=1;x<matchedFA.length;x++){
        let i=todaysFlights.map(e=>e._id).indexOf(matchedFA[x]._id);
        if (i>-1) todaysFlights.splice(i,1);
        if (matchedFA[x].pilotAgree||matchedFA[x].ocRelease||matchedFA[x].dispatchRelease){
          console.log('Deletion Reprieve for flight ' + matchedFA[x].flightNum + ' ' + matchedFA[x].date );
        }
        else {
          let entity=await TodaysFlight.find({where: {_id:matchedFA[x]._id}});
          await entity.destroy();
          console.log('destroyed duplicate flight ' + matchedFA[x].flightNum + ' ' + matchedFA[x].date );
        }
      }
      let fa=todaysFlights.filter(f=>{
        if (!f.date||!f.flightNum) return false;
        return flight.date.toString()===f.date.toString()&&flight.flightNum.toString()===f.flightNum.toString();
      });
      //let faIndex=fa.map(e=>e.flightNum).indexOf(flight.flightNum);
      if (fa.length>1) console.log('More than one Flight matching ' + flight.flightNum)
      if (fa.length===0) {
          flight.colorPatch='false';
          console.log('creating flight:' + flight.flightNum + ' ' + flight.date);
          //console.log(flight);
          flight.dateObject=new Date(flight.date).toISOString();
          TodaysFlight.create(flight);
      }
      else {
        updated.push(fa[0]._id);
        let index=todaysFlights.map(e=>e._id).indexOf(fa[0]._id);
        if (index<0) {
          console.log('**********************');
          console.log('Missing flight '+flight.flightNum);
          return;
        }
        let lastFlights=[];
        let instance;
        if (todaysFlights[index].aircraft&&todaysFlights[index].equipment&&todaysFlights[index].equipment.name==="Caravan") {
          instance=await TodaysFlight.findAll({
                                        where: {
                                          aircraft: todaysFlights[index].aircraft
                                        },
                                        limit:10,
                                        order: [['_id','DESC']]
          });
        }
        if (instance) instance.forEach(i=>{
                        if (i.dataValues) lastFlights.push(i.dataValues);
                      });
        lastFlights.sort((a,b)=>{
          return new Date(b.date)-new Date(a.date);
        });
        //let temp=lastFlights.map(e=>{return {date:e.date,flightNum:e.flightNum,bew:e.bew}});
        //if (todaysFlights[index].flightNum==='840') console.log(temp); 
        for (let f of lastFlights){//f.pfr&&f.pfr.legArray[f.pfr.legArray.length-1].onTime&&
          if (f.bew&&f.bew.tks&&!todaysFlights[index].bew&&flight.date===new Date().toLocaleDateString()){
            todaysFlights[index].bew={tks:f.bew.tks};
            break;
          }
        }
        let lookupObj=lookupPilotObjects(flight);
        todaysFlights[index].pilotObject=lookupObj.pilotObject;
        todaysFlights[index].coPilotObject=lookupObj.coPilotObject;
        if (!todaysFlights[index].pilot) {
          todaysFlights[index].pilotObject=null;
          todaysFlights[index].pilot=null;
        }
        if (!todaysFlights[index].coPilot) {
          todaysFlights[index].coPilotObject=null;
          todaysFlights[index].coPilot=null;
        }
        todaysFlights[index].nonRevFlight=flight.nonRevFlight;
        todaysFlights[index].runScroll=false;
        todaysFlights[index].status=flight.status;
        todaysFlights[index].color=flight.color;
        todaysFlights[index].airplaneObj=flight.airplaneObj;
        todaysFlights[index].equipment=flight.equipment;
        todaysFlights[index].autoOnboard=flight.autoOnboard;
        todaysFlights[index].operation=flight.operation;
        todaysFlights[index].flightLegs=flight.flightLegs;
        //find arrival time if same depart and dest
        if (flight.airports[0]===flight.airports[1]&&flight.departTimes.length===2){
          let i=flightLog.map(e=>e.flightId).indexOf(flight.flightNum);
          if (i>-1) flight.departTimes[1]=flightLog[i].arrTime;
        }
        //if (flight.flightStatus&&todaysFlights[index].flightStatus!==flight.flightStatus) {
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' date'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].flightStatus=flight.flightStatus;
          todaysFlights[index].tfliteDepart=flight.tfliteDepart;
        //}
        if (todaysFlights[index].date!==flight.date) {
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' date'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].date=flight.date;
        }
        if (todaysFlights[index].flightNum!==flight.flightNum) {
          //console.log(todaysFlights[index]._id+' flightNum'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].flightNum=flight.flightNum;
        }
        if (todaysFlights[index].pilot!==flight.pilot){
          //console.log(todaysFlights[index]._id+' pilot'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].pilot=flight.pilot;
        }
        if (todaysFlights[index].coPilot!==flight.coPilot){
          //console.log(todaysFlights[index]._id+' copilot'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].coPilot=flight.coPilot;
        }
        if (todaysFlights[index].aircraft!==flight.aircraft){
          //console.log(todaysFlights[index]._id+' aircraft'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].aircraft=flight.aircraft;
        }
        if (flight.arriveTimes) {
          todaysFlights[index].arriveTimes=flight.arriveTimes;
          //if (todaysFlights[index].departTimes.length-todaysFlights[index].arriveTimes.length===1){
          //  todaysFlights[index].departTimes[todaysFlights[index].departTimes.length-1]=todaysFlights[index].arriveTimes[todaysFlights[index].arriveTimes.length-1];
          //}
        }
        if (todaysFlights[index].departTimes[0]!==flight.departTimes[0]){
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' departTimes'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (todaysFlights[index].departTimes.length!==flight.departTimes.length){
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' departTimes'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (todaysFlights[index].departTimes[todaysFlights[index].departTimes.length-1]!==flight.departTimes[flight.departTimes.length-1]){
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' departTimes'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        todaysFlights[index].departTimesZulu=JSON.parse(JSON.stringify(todaysFlights[index].departTimes));
        todaysFlights[index].departTimes.forEach((t,i)=>{
                  let timeString=t.toString();
                  let d=new Date();
                  let [hours, minutes, seconds] = timeString.split(":").map(Number);
                  if (!seconds) seconds=0;
                  d.setHours(hours, minutes, seconds);
                  let resp=d.toISOString();
                  if (resp.split('T').length>0) {
                    resp=resp.split('T')[1];
                    todaysFlights[index].departTimesZulu[i]=resp;
                    if (resp.split(':').length>1){
                      todaysFlights[index].departTimesZulu[i]='('+resp.split(':')[0]+':'+resp.split(':')[1]+'Z)';
                    } 
                  }
        });
        //if (JSON.stringify(todaysFlights[index].airports)!==JSON.stringify(flight.airports)){
          //console.log(todaysFlights[index]._id+' airports'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].airports=flight.airports;
          todaysFlights[index].departTimes=flight.departTimes;
        //}
        todaysFlights[index].airportObjs=flight.airportObjs;
        if (!todaysFlights[index].pilotAgree||(!todaysFlights[index].ocRelease&&!todaysFlights[index].dispatchRelease)) {
          todaysFlights[index].airportObjsLocked=JSON.parse(JSON.stringify(todaysFlights[index].airportObjs));
        }
        if (flightIndex>=flights.length-1) todaysFlights[index].runScroll=true;
      }
    }
    if (updated.length>0) {
      updated = [...new Set(updated)];//removes duplicates
      updated.forEach(u=>{
        let index=todaysFlights.map(e=>e._id).indexOf(u);
        let flight=todaysFlights[index];
        if (!flight) return;
        flight.colorPatch='false';
        //flight.pfr=undefined;
        //let pfrMap=[];//pfrIndex=-1;
        if (flight.date===new Date(dateString).toLocaleDateString()) {
          let pfrMap=todaysPfrs.filter(pfr=>{
            let matchFlightNum=pfr.flightNumber===flight.flightNum;
            if (pfr.flightNumber&&pfr.flightNumber.substring(0,1)==='9'&&(flight.operation==='Training'||flight.operation==='Test'||flight.operation==='Ferry')) matchFlightNum=true;
            let ds=new Date(flight.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
            if (!flight.pilotObject) flight.pilotObject={};//pfr.pilot===flight.pilotObject.displayName&&
            return !pfr.isArchived&&pfr.dateString===ds&&matchFlightNum&&pfr.pilot===flight.pilotObject.displayName&&pfr.acftNumber===flight.aircraft;
          });
          if (pfrMap.length>0&&pfrMap[0].dateString) {
            flight.pfr=pfrMap[0];
          }
          if (flight.pfr&&!flight.pfr.dateString) console.log(flight.flightNum);
          //if (flight.flightNum.length>4&&flight.pfr&&flight.pfr.flightNumber) flight.flightNum=flight.pfr.flightNumber;
        }
        //console.log('Updating Flight ID: ' + todaysFlights[index].flightId);
        //console.log(todaysFlights[index]);
        
        delete flight._id;
        delete flight.pilotAgree;
        delete flight.ocRelease;
        delete flight.dispatchRelease;
        delete flight.releaseTimestamp;
        delete flight.ocReleaseTimestamp;
        delete flight.dispatchReleaseTimestamp;
        delete flight.knownIce;
        delete flight.fueled;
        delete flight.fueledBy;
        delete flight.fueledTimestamp;
        delete flight.truck;
        delete flight.startFuel;
        delete flight.stopFuel;
        delete flight.gallonsUplifted;
        
        
        TodaysFlight.find({
          where: {
            _id: u
          }
        }).then(saveUpdates(flight))
          .catch(handleErrorMultiple(res));
      });
    }
    busy=false;
    res.status(200).json('success');
  }
  catch(err){
    busy=false;
    console.log(err);
    res.status(404).json("Failure");
  }
}

function overallRiskClass(metarObj){
  let airport=metarObj.airport;
    let returnString="";
    //if (!metarObj) metarObj={};
    //if (metarObj.night) returnString+=' night';
    let color="airport-green";
    let tempColor="airport-green";
    //webcam obs
    if (metarObj.usingManual&&airport.manualObs&&airport.manualTimestamp&&isLessThanOneHourAgo(new Date(airport.manualTimestamp))){
      if (airport.manualObs.webcam) return color; 
      if (airport.manualObs.webcamIFR) return 'airport-orange';
    }  
    //runway
    //if (!metarObj.airport) return returnString+=' '+color;
    tempColor=returnColor({yellow:3,orange:2,red:1},airport.runwayScore,'above');
    if (airport.openClosed==="Closed") tempColor="airport-pink";
    metarObj.runwayColor=tempColor;
    metarObj.visibilityColor='airport-blue';
    metarObj.ceilingColor='airport-blue';
    metarObj.windColor='airport-blue';
    metarObj.freezingColor='airport-green';
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //if (airport.name==='Gambell') console.log(airport);
    //possibly no metarObj
    if (!metarObj||!metarObj['Raw-Report']) {
      if (color!=='airport-red') {
        color='airport-blue';
      }
      return returnString+=' '+color;
    }
    //icing?
    if (metarObj.Freezing) {
      metarObj.freezingColor='airport-pink';
      color='airport-pink';
    }
    //wind
    tempColor=returnWindColor(metarObj.aircraft,metarObj['Wind-Gust'],metarObj['Wind-Direction'],airport);//this.returnColor({yellow:30,red:35},metarObj["Wind-Gust"],'below');
    metarObj.windColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //Visibility
    if (!metarObj.Visibility||!metarObj.Ceiling||(!metarObj.altimeter&&(!airport.manualObs||(metarObj.usingManual&&airport.manualObs.isOfficial)))||metarObj.Visibility==='99'||metarObj.Ceiling=='9999'||metarObj.Visibility===99||metarObj.Ceiling==9999) {
      //set colors to purple
      metarObj.ceilingColor=metarObj.visibilityColor=tempColor='airport-purple';
      if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
      return returnString+' '+color;
    }
    //visibility
    if (!airport.visibilityRequirement) airport.visibilityRequirement={yellow:3,orange:2,red:1};
    tempColor=returnColor(airport.visibilityRequirement, metarObj.Visibility,'above',airport);
    metarObj.visibilityColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //ceiling
    if (!airport.ceilingRequirement) airport.ceilingRequirement={yellow:1000,orange:500,red:500};
    tempColor=returnColor(airport.ceilingRequirement,metarObj.Ceiling,'above',airport);
    metarObj.ceilingColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //return
    metarObj.color=returnString+' '+color;
    
    return returnString+' '+color;
  }
  
  function returnColor(limitObj,observation,direction,airport){
    if (!observation||observation==="") {
      return '';
      //console.log('returnColor');
      //return 'airport-purple';
    }
    if (!direction) direction="above";
    let color="airport-green";
    if (direction==="above"){
      if ((observation*1)<limitObj.yellow) color="airport-yellow";
      if ((observation*1)<limitObj.orange) color="airport-orange";
      if ((observation*1)<limitObj.red) color="airport-pink";
    }
    else {
      if ((observation*1)>limitObj.yellow) color="airport-yellow";
      if ((observation*1)>limitObj.orange) color="airport-orange";
      if ((observation*1)>limitObj.red) color="airport-pink";
    }
    return color;
  }
  
  function returnWindColor(aircraft,gust,windDirection,airportObj){
    let specialWind={};
    if (airportObj.specialWind) specialWind=JSON.parse(airportObj.specialWind);
    if (!gust||!windDirection||!airportObj) {
      //console.log('windColor');
      return 'airport-green';
    }
    let equipment=JSON.parse(JSON.stringify(equipmentArr[0]));
    if (fbAirplanes) {
      let index=fbAirplanes.map(e=>e._id).indexOf(aircraft);
      if (index>-1&&fbAirplanes[index]) {
        index=equipmentArr.map(e=>e.name).indexOf(fbAirplanes[index].acftType);
        if (index>-1) equipment=JSON.parse(JSON.stringify(equipmentArr[index]));
      }
    }
    if (!airportObj.runways) {
      if (gust>equipment.wind) return 'airport-orange';
      if (gust>equipment.wind-5) return 'airport-yellow';
      return 'airport-green';
    }
    let xwindAngle=0;
    let direction=0;
    let crosswind=0;
    let runways=JSON.parse(JSON.stringify(airportObj.runways));
    if (airportObj.icao==='PAUN'&&(equipment.name==="Beech 1900"||equipment.name==="Sky Courier")) runways=[15,33];
    //if (airportObj.icao==='PAGM') console.log(specialWind);
    //if (airportObj.icao==='PAOM') console.log(airportObj.specialWind);
    if (runways) {
      xwindAngle=90;
      direction=parseInt(windDirection,10);
      runways.forEach(function(runway){
        if (Math.abs(direction-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-runway*10);
        if (Math.abs(direction+360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction+360-runway*10);
        if (Math.abs(direction-360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-360-runway*10);
      });
    }
    crosswind = Math.round(gust*Math.sin(xwindAngle*(Math.PI/180)));
    if (specialWind.directionLow<=direction&&specialWind.directionHigh>=direction) {
      equipment.wind-=specialWind.reduction;
      equipment.xwind-=specialWind.reduction;
    }
    if (false) {//(airportObj.icao==='PAGM'){
      if (direction>=40&&direction<=100){
        equipment.wind-=5;
        equipment.xwind-=10;
      }
    }
    if (airportObj.icao==="PADG") {
     equipment.wind=30;
     equipment.xwind=15;
    }
    //if (aircraft==="N701BA") console.log(equipment.wind+' '+equipment.xwind);
    if (gust>equipment.wind) return 'airport-orange';
    if (crosswind>equipment.xwind) return 'airport-orange';
    if (gust>equipment.wind-5) return 'airport-yellow';
    if (crosswind>equipment.xwind-5) return 'airport-yellow';
    return 'airport-green';
    
  }
  
  function airportClass(airport){
    let score=airport.runwayScore;
    let now=new Date();
    //if airport.timestamp is more than 10 hours old, return blue
    //if (!airport.timestamp||!score) return 'airport-blue';
    const tenHoursAgo = new Date(now.getTime() - (10 * 60 * 60 * 1000)); // 10 hours in milliseconds
    //if (new Date(airport.timestamp) < tenHoursAgo) return 'airport-blue';

    score=parseInt(score,10);
    if (isNaN(score)) return "airport-green";
    if (score<=1) return "airport-pink";
    if (score===2) return "airport-yellow";
    return "airport-green";
  }

function flightRiskClass(airportObjs){
  let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
  let color=colors[0];
  let night=false;
  let colorIndex=0;
  if (!airportObjs) return color;
  for (let i=0;i<airportObjs.length;i++) {
  //airportObjs.forEach(metarObj=>{
    let myClass=overallRiskClass(airportObjs[i]);
    
    let arr=myClass.split(' ');
    arr.forEach(a=>{
      if (a==='night') night=true;
      if (colors.indexOf(a)>colorIndex) {
        color=a;
        colorIndex=colors.indexOf(a);
      }
    });
  }
  if (night) return 'night '+color;
  return color;
}

function isLessThanOneHourAgo(date) {
  let oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 10);
  return date > oneHourAgo;
}

async function airportNameToMetar(airport){
  let icao='';
  if (airport.name==='Barrow') airport.name="PABR";
  let res=await axios.get('https://avwx.rest/api/search/station?text=' + airport.name + '&reporting=true&token=' + process.env.AVWX_TOKEN2);
  if (!res||!res.data||res.data.Error) return airport;
  let foundIndex=-1;
  for (let i=0;i<res.data.length;i++){
    if (foundIndex>-1) break;
    if (res.data[i].country==='US'&&res.data[i].state==='AK') foundIndex=i;
  }
  if (foundIndex<0) {
    if (airport.name==="Kotlik") {
      icao="PFKO";
      airport.threeLetter='2A9';
    }
    else return airport; 
  }
  else {
    icao=res.data[foundIndex].icao;
    airport.threeLetter=res.data[foundIndex].local;
  }
  airport.currentMetarObj = await getMetarSynoptic(icao);
  if (!airport.currentMetarObj||!airport.currentMetarObj.metar) return airport; 
  airport.currentMetar=airport.currentMetarObj.metar;
  let metarDate=new Date(airport.currentMetarObj.date);
  if (metarDate<new Date(new Date().getTime()-120*60*1000)) {
    airport.metarObj={airport:{name:airport.name,icao:icao,threeLetter:airport.threeLetter}};
    airport.currentMetar='missing';
  }
  else {
   airport.metarObj=parseADDS(airport.currentMetarObj.metar);
  }
  return airport;
}

function lookupPilotObjects(flight){
  let displayName,lookupIndex,pilotObject,coPilotObject;
  if (flight.pilot&&flight.pilot!=='No Pilot Assigned') {
    //bmcintosh adjustment
    if (flight.pilot==='bmcintosh') flight.pilot='bmcIntosh';
    if (flight.coPilot==='bmcintosh') flight.coPilot='bmcIntosh';
    //bmcintosh adjustment
    if (flight.pilot==='dwolson') flight.pilot='dolson';
    if (flight.coPilot==='dwolson') flight.coPilot='dolson';
    //m evans adjustment
    if (flight.pilot.substring(0,1)==="m"&&flight.pilot.slice(-5)==="evans") {
      if (flight.pilot.substring(1,2).toUpperCase()==='K') displayName="M. K. Evans";
      else displayName="M. R. Evans";
    }
    else displayName=flight.pilot.substring(0,1).toUpperCase()+'. '+flight.pilot.substring(1,2).toUpperCase()+flight.pilot.slice(2);
    lookupIndex = pilots.map(e => e.displayName).indexOf(displayName);
    if (lookupIndex>-1) pilotObject=pilots[lookupIndex];
  }
  //import coPilot
  if (flight.coPilot) {
    if (flight.coPilot.substring(0,1)==="m"&&flight.coPilot.slice(-5)==="evans") {
      displayName='M. '+flight.coPilot.substring(1,2).toUpperCase()+'. Evans';
    }
    else if (flight.coPilot.substring(0,1)==="k"&&flight.coPilot.slice(-9)==="showalter") {
      displayName='D. Showalter';
    }
    else displayName=flight.coPilot.substring(0,1).toUpperCase()+'. '+flight.coPilot.substring(1,2).toUpperCase()+flight.coPilot.slice(2);
    lookupIndex = pilots.map(e => e.displayName).indexOf(displayName);
    if (lookupIndex>-1) coPilotObject=pilots[lookupIndex];
  }
  return {pilotObject:pilotObject,coPilotObject:coPilotObject};
}

export async function setBearer(){
  let data = JSON.stringify({
    "client_id": localEnv.TF_ID,
    "client_secret": localEnv.TF_SECRET
  });
  let config = {
    method: 'post',
    url: 'https://api.tflite.com/authentication/oauth/token',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json',
      'api-version':'v1'
    },
    data : data
  };
  
  try{
    let response=await axios(config);
    bearer="Bearer "+response.data.access_token;
    //console.log(bearer);
    return "TF Bearer Token Set Successfully";
  }
  catch(err){
    console.log(err);
    return err;
  }
}

// Pad a number to 2 digits
const pad = n => `${Math.floor(Math.abs(n))}`.padStart(2, '0');
const toISOStringWithTimezone = date => {
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds());
};

export async function getFlightLogs(req,res){
  let date=new Date();
  if (req&&req.body&&req.body.date) date=new Date(req.body.date);
  if (req&&!req.body&&!req.headers&&!isNaN(new Date(req))&&new Date(req).toString!=='Invalid Date') date=new Date(req);
  date.setHours(0, 0, 0, 0);
  let startDate=toISOStringWithTimezone(date);
  let day = date.getDate();
  day=day+1;
  date.setDate(day);
  let endDate=toISOStringWithTimezone(date);
  let config = {
    method: 'get',
    url: 'https://api.tflite.com/flightlogs?departureDate.gte='+startDate+'&departureDate.lte='+endDate,
    headers: { 
      'Accept': 'application/json', 
      'api-version': 'v1', 
      'Authorization': bearer
    }
  };
  try {
    let response=await axios(config);
    //console.log(response.data);
    console.log('Setting Flight Log Array');
    flightLog=response.data;
    console.log(flightLog.length);
    if (res) res.status(200).json(response.data);
    return response.data;
  }
  catch(err){
    if (!err.response) err.response={data:err};
    console.log(err.response.data);
    setBearer();
    let secondResponse;
    if (err&&err.response&&err.response.data&&err.response.data.statusCode===401) {
      secondResponse=await getFlightLogs(req);
      flightLog=secondResponse;
      if (!res) return secondResponse;
      else return res.status(200).json(secondResponse);
    }
    if (res) return res.status(500).json(err.response.data);
    return err.response||err;
  }
}

export async function getManifests(req,res){
  let date=new Date();
  if (req&&req.body&&req.body.date) date=new Date(req.body.date);
  if (req&&!req.body&&!req.headers&&!isNaN(new Date(req))&&new Date(req).toString!=='Invalid Date') date=new Date(req);
  date.setHours(0, 0, 0, 0);
  let startDate=date.toISOString();
  let day = date.getDate();
  day=day+2;
  date.setDate(day);
  let endDate=date.toISOString();
  let config = {
    method: 'get',
    url: 'https://api.tflite.com/manifests?departureDate.gte='+startDate+'&departureDate.lte='+endDate,
    headers: { 
      'Accept': 'application/json', 
      'api-version': 'v1', 
      'Authorization': bearer
    }
  };
  try {
    let response=await axios(config);
    //console.log(response.data);
    if (res) res.status(200).json(response.data);
    return response.data;
  }
  catch(err){
    if (!err.response) err.response={data:err};
    console.log(err.response.data);
    setBearer();
    let secondResponse;
    if (err&&err.response&&err.response.data&&err.response.data.statusCode===401) {
      secondResponse=await getManifests(req);
      if (!res) return secondResponse;
      else return res.status(200).json(secondResponse);
    }
    if (res) return res.status(500).json(err.response.data);
    return err.response||err;
  }
}

export async function getManifest(req,res){
  let date=new Date();
  let flightNum='860';
  if (req.body&&req.body.date) {
    date=new Date(req.body.date);
    flightNum=req.body.flightNum||flightNum;
  }
  date.setHours(0, 0, 0, 0);
  let startDate=date.toISOString();
  let config = {
    method: 'get',
    url: 'https://api.tflite.com/manifests/'+startDate+'/'+flightNum+'/:departureAirport',
    headers: { 
      'Accept': 'application/json', 
      'api-version': 'v1', 
      'Authorization': bearer
    }
  };
  try {
    let response=await axios(config);
    console.log(response.data);
    if (res) res.status(200).json(response.data);
    else return response.data;
  }
  catch(err){
    if (!err.response) err.response={data:err};
    console.log(err.response.data);
    setBearer();
    let secondResponse;
    if (err&&err.response&&err.response.data&&err.response.data.statusCode===401) {
      secondResponse=await getManifest(req);
      if (!res) return secondResponse;
      else return res.status(200).json(secondResponse);
    }
    if (res) return res.status(500).json(err.response.data);
    return err.response||err;
  }
}