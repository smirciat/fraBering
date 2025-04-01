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
import {TodaysFlight,AirportRequirement,Airplane,Assessment} from '../../sqldb';
import {quickGrab,firebaseQueryFunction} from '../airplane/airplane.controller.js';
import {getMetar,getMetarList,parseADDS} from '../airportRequirement/airportRequirement.controller.js';
import fs from 'fs';
import config from '../../config/environment';
let allAirports=[];
let airplanes=[];
let fbAirplanes=[];
let pfrs=[];
let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
const baseUrl = 'https://localhost:' + config.port;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});
let stopped=false;
let staleFile=false;
let equipmentArr=[{id:1,name:"Caravan",wind:35,xwind:25,temp:-50,taxiFuel:35,fuelBurn:350,minFuel:800},
       //{id:2,name:"Navajo",wind:40,xwind:30,temp:-40,taxiFuel:35},
       {id:3,name:"Casa",wind:35,xwind:25,temp:-50,taxiFuel:110,fuelBurn:600,minFuel:1323},
       {id:4,name:"King Air",wind:40,xwind:35,temp:-50,taxiFuel:90,maxMain:1293,maxAux:529,fuelBurn:600,minFuel:1500},
       {id:5,name:"Beech 1900",wind:40,xwind:35, temp:-50,taxiFuel:110,maxMain:1621,maxAux:621,fuelBurn:700,minFuel:1420},
       {id:6,name:"Sky Courier",wind:40,xwind:30,temp:-50,taxiFuel:70,fuelBurn:700,minFuel:1100}];

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
  res.status(200).json({stopped:staleFile});
}

// Gets a list of TodaysFlights
export function dayFlights(req, res) {
  let date=req.body.dateString;
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

// Creates a new TodaysFlight in the DB
export function create(req, res) {
  return TodaysFlight.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing TodaysFlight in the DB
export function update(req, res) {
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
    if (!line[0]||!line[line.length-1]) return;
    let obj={
      flightStatus:line[statusIndex],
      flightNum:line[3],
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
  //console.log(flightLog);
  return flightLog.sort((a,b)=>{
    return a.flightNum-b.flightNum||new Date("1970-01-01T" + a.departTime)-new Date("1970-01-01T" + b.departTime);
  });
}

export async function tf(req,res) {
  try {
    let flightLog=await log();
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
    fbAirplanes=await quickGrab().aircraft;
    //firebaseQueryFunction(collection,limit,parameter,operator,value,timestampBoolean)
    let d=new Date();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    let year = String(d.getFullYear()).slice(-2);
    let dateString=month+'/'+day+'/'+year;
    pfrs=await firebaseQueryFunction('flights',200,'dateString','==',dateString,false);
    let formattedDate=new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    let todaysPfrs=pfrs.filter(pfr=>{return pfr.dateString===formattedDate});
    let file="current.csv";
    let data=fs.readFileSync(__dirname+'/../../fileserver/'+file, 'utf-8');
    let stats=fs.statSync(__dirname+'/../../fileserver/'+file, 'utf-8');
    console.log('Timestamp of current.csv is: ' + new Date(stats.mtimeMs).toLocaleString());
    const tenMinutesAgo = new Date(new Date().getTime() - 10 * 60 * 1000); // 10 minutes in milliseconds
    const hour=new Date().getHours();
    if (stats.mtimeMs < tenMinutesAgo) {
      staleFile=true;
      if (hour>=7&&hour<22&&!stopped) {//only text me during waking hours, and only do it once, then turn stopped variable to true to prevent future texts
        
        axios.post(baseUrl + '/api/monitors/twilio',{to:"+19073992019",body:"Takeflite updating has stopped"}, { httpsAgent: agent }).then((res)=>{
                stopped=true;
                console.log('Twilio message sent');
              },function(err){
                console.log(err);
              });
      }
      //console.log('Stopped value is: ' + staleFile.toString());
      //res.status(404).json('Current.csv has stopped updating');
      //return;
    }
    else {
      stopped=false;
      staleFile=false;
    }
    console.log('Stopped value is: ' + staleFile.toString());
    let arr=data.split('\r\n');
    if (!arr[1]) {
      console.log('failed to load csv file');
      res.status(404).json('failure');
      return;
    }
    let dateArr=arr[1].split(' ');
    let date=new Date(dateArr[2]+' '+dateArr[3]+' '+dateArr[4]);
    let date2=new Date(date);
    date2.setDate(date2.getDate()+1);
    date2=date2.toLocaleDateString();
    let date3=new Date(date);
    date3.setDate(date3.getDate()+2);
    date3=date3.toLocaleDateString();
    let date4=new Date(date);
    date4.setDate(date4.getDate()+3);
    date4=date4.toLocaleDateString();
    date=date.toLocaleDateString();
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
      obj.from=temp[6];
      obj.to=temp[7];
      obj.flightNum=temp[8];
      obj.flightId=temp[temp.length-1];
      if (index>0&&!temp[8]&&obj.flightId===currentFlights[index-1].flightId) obj.flightNum=currentFlights[index-1].flightNum;
      if (!obj.flightNum) obj.flightNum=obj.flightId;
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
    let flights=[];
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
            speed=250;
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
    let instance=await TodaysFlight.findAll({
      order: [['_id', 'DESC']],
      limit: 3000
    });
    let todaysFlights=[];
    let allFlights=[];
    instance.forEach(i=>{
      if (i.dataValues&&(i.dataValues.date===date||i.dataValues.date===date2||i.dataValues.date===date3||i.dataValues.date===date4)) todaysFlights.push(i.dataValues);
      if (i.dataValues) allFlights.push(i.dataValues);
    });
    let updated=[];
    for (let f of todaysFlights) {
      let fa=flights.filter(x=>{
        return f.date===x.date;
      });
      if (fa.length===0) return;
      let index=flights.map(e=>e.flightId).indexOf(f.flightId);
      let active=f.active;
      if (index===-1) active="false";
      else active="true";
      if (active!==f.active) {
        f.active=active;
        console.log(f._id+' active');
        updated.push(f._id);
      }
      //return;
    }
    for (let flight of flights){
      if (!flight) return;
      //get current status from flightLog array
      let matchedLog=flightLog.filter(f=>{
        if (!f||!f.flightNum) return false;
        if (f.date!==flight.date) return false;
        return f.flightNum.split('.')[0]===flight.flightNum&&f.flightStatus;
      });
      if (matchedLog&&matchedLog.length>0) flight.flightStatus=matchedLog[matchedLog.length-1].flightStatus;
      
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
              airport.metarObj.color=overallRiskClass(airport.metarObj);
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
          else airport.metarObj={airport:JSON.parse(JSON.stringify(airport))};
        }
        
        flight.airportObjs.push(airport.metarObj);
        
      }
      if (flight.airportObjs) {
        flight.color=flightRiskClass(JSON.parse(JSON.stringify(flight.airportObjs)));
        //if (flight.ocRelease) flight.color+=' oc';
      }
      else console.log('No airportObjs?');
      
      let fbIndex=fbAirplanes.map(e=>e._id).indexOf(flight.aircraft);
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
          let aTime=a.legArray[a.legArray.length-1].onTime||'1/1/1979';
          let bTime=b.legArray[b.legArray.length-1].onTime||'1/1/1979';
          return new Date(aTime)-new Date(bTime);
        });
        acPfrs=acPfrs.filter(pfr=>{return pfr.legArray&&pfr.legArray[pfr.legArray.length-1]&&pfr.legArray[pfr.legArray.length-1].onTime&&pfr.legArray[pfr.legArray.length-1].onTime._seconds});
        if (acPfrs&&acPfrs[0]){
          flight.autoOnboard=acPfrs[0].legArray[acPfrs[0].legArray.length-1].fuel-acPfrs[0].legArray[acPfrs[0].legArray.length-1].burn;
        }
        for (let i=0;i<acPfrs.length;i++){
          
        }
        if (false){//flight.aircraft==="N248BA") {
          console.log('****************************');
          acPfrs.forEach(pfr=>{
            if (pfr.legArray[pfr.legArray.length-1].onTime&&pfr.legArray[pfr.legArray.length-1].onTime._seconds) {
              console.log(Object.keys(pfr.legArray[pfr.legArray.length-1].onTime));
              console.log(new Date(pfr.legArray[pfr.legArray.length-1].onTime._seconds*1000).toLocaleString());
            }
          });
        }
      }
      
     //map flights array(from current.csv) to todaysFlights array (from postgresql database)
      let index=todaysFlights.map(e=>e.flightId).indexOf(flight.flightId);
      if (index<0) {
        index=allFlights.map(e=>e.flightId).indexOf(flight.flightId);
        if (index<0) {
          flight.colorPatch='false';
          console.log('creating flight:');
          //console.log(flight);
          TodaysFlight.create(flight);
        }
        else {
          index=todaysFlights.push(allFlights[index])-1;
        }
      }
      if (index>-1) {
        updated.push(todaysFlights[index]._id);
        todaysFlights[index].runScroll=false;
        todaysFlights[index].status=flight.status;
        todaysFlights[index].color=flight.color;
        todaysFlights[index].equipment=flight.equipment;
        todaysFlights[index].autoOnboard=flight.autoOnboard;
        if (flight.flightStatus&&todaysFlights[index].flightStatus!==flight.flightStatus) {
          //todaysFlights[index].runScroll=true;
          //console.log(todaysFlights[index]._id+' date'); 
          //updated.push(todaysFlights[index]._id);
          todaysFlights[index].flightStatus=flight.flightStatus;
        }
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
                  const [hours, minutes, seconds] = timeString.split(":").map(Number);
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
        if (!todaysFlights[index].pilotAgree) {
          todaysFlights[index].airportObjsLocked=JSON.parse(JSON.stringify(todaysFlights[index].airportObjs));
        }
        if (index>=todaysFlights.length-1) todaysFlights[index].runScroll=true;
      }
    }
    if (updated.length>0) {
      updated = [...new Set(updated)];
      updated.forEach(u=>{
        let index=todaysFlights.map(e=>e._id).indexOf(u);
        let flight=todaysFlights[index];
        flight.colorPatch='false';
        flight.pfr=null;
        let pfrIndex=-1;
        if (flight.date===new Date().toLocaleDateString()) {
          pfrIndex=todaysPfrs.map(e=>e.flightNumber).indexOf(flight.flightNum);
          if (pfrIndex>-1) flight.pfr=pfrs[pfrIndex];
        }
        //console.log('Updating Flight ID: ' + todaysFlights[index].flightId);
        //console.log(todaysFlights[index]);
        delete flight._id;
        TodaysFlight.find({
          where: {
            _id: u
          }
        }).then(saveUpdates(flight))
          .catch(handleErrorMultiple(res));
      });
    }
    res.status(200).json('success');
  }
  catch(err){
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
    //runway
    //if (!metarObj.airport) return returnString+=' '+color;
    tempColor=returnColor({yellow:3,orange:2,red:1},airport.runwayScore,'above');
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
    if (!metarObj.Visibility||!metarObj.Ceiling||!metarObj.altimeter||metarObj.Visibility==='99'||metarObj.Ceiling=='9999'||metarObj.Visibility===99||metarObj.Ceiling==9999) {
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
  let res=await axios.get('https://avwx.rest/api/search/station?text=' + airport.name + '&reporting=true&token=' + process.env.AVWX_TOKEN2);
  if (!res||!res.data||res.data.Error) return airport;
  let foundIndex=-1;
  for (let i=0;i<res.data.length;i++){
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
  airport.currentMetarObj = await getMetar(icao);
  if (!airport.currentMetarObj||!airport.currentMetarObj.metar) return airport; 
  airport.currentMetar=airport.currentMetarObj.metar;
  let metarDate=new Date(airport.currentMetarObj.date);
  if (metarDate<new Date(new Date().getTime()-120*60*1000)) {
    airport.metarObj={};
    airport.currentMetar='missing';
  }
  else {
   airport.metarObj=parseADDS(airport.currentMetarObj.metar);
  }
  return airport;
}