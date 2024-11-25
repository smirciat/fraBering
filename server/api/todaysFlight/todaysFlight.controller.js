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
import fs from 'fs';
import config from '../../config/environment';
let allAirports=[];
let airplanes=[];
const baseUrl = 'https://localhost:' + config.port;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});
let stopped=false;
let staleFile=false;

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
        console.log('Assessment Recorded');
        console.log(res.data);
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

export async function tf(req,res) {
  try {
    if (!allAirports||allAirports.length===0) {
      allAirports=[];
      let instance=await AirportRequirement.findAll({});
      instance.forEach(i=>{
        if (i.dataValues) allAirports.push(i.dataValues);
      });
    }
    if (!airplanes||airplanes.length===0) {
      airplanes=[];
      let instance=await Airplane.findAll({});
      instance.forEach(i=>{
        if (i.dataValues) airplanes.push(i.dataValues);
      });
    }
    let file=req.body.file||"current.csv";
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
      console.log('Stopped value is: ' + staleFile.toString());
      res.status(404).json('Current.csv has stopped updating');
      return;
    }
    else {
      stopped=false;
      staleFile=false;
    }
    console.log('Stopped value is: ' + staleFile.toString());
    let arr=data.split('\r\n');
    let dateArr=arr[1].split(' ');
    let date=new Date(dateArr[2]+' '+dateArr[3]+' '+dateArr[4]);
    let date2=new Date(date);
    date2.setDate(date2.getDate()+1);
    date2=date2.toLocaleDateString();
    let date3=new Date(date);
    date3.setDate(date3.getDate()+2);
    date3=date3.toLocaleDateString();
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
      if (flight.flightNum.length>4) {
        let sameId=currentFlights.filter(f=>{return f.flightId===flight.flightId});
        sameId.forEach(f=>{
          if (f.flightNum.length<=4) flight.flightNum=f.flightNum;
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
    currentFlights.forEach((f,index)=>{
      //still same flight
      if (index>0&&f.flightNum===currentFlights[index-1].flightNum){
        airports.push(f.from);
        departTimes.push(f.departTime);
      }
      //new flight
      if (index===0||f.flightNum!==currentFlights[index-1].flightNum||index===currentFlights.length-1) { 
        //close out previous flight
        if (index>0) {
          airports.push(currentFlights[index-1].to);
          flight.airports=airports;
          //calculate flight time for last leg here---------------------------------------------------------------------------
          let speed=160;
          if (airplanes.map(e=>e.registration).indexOf(flight.aircraft)>-1) speed=250;
          let flightTime=60*getDistance(currentFlights[index-1].to,currentFlights[index-1].from)/speed + 10;//est flight time in minutes
          let lastTime=new Date(currentFlights[index-1].date);
          let timeArr=currentFlights[index-1].departTime.split(':');
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
        airports=[];
        airports.push(f.from);
        departTimes=[];
        departTimes.push(f.departTime);
      }
    });
    let instance=await TodaysFlight.findAll({
      order: [['_id', 'DESC']],
      limit: 3000
    });
    let todaysFlights=[];
    let allFlights=[];
    instance.forEach(i=>{
      if (i.dataValues&&(i.dataValues.date===date||i.dataValues.date===date2||i.dataValues.date===date3)) todaysFlights.push(i.dataValues);
      if (i.dataValues) allFlights.push(i.dataValues);
    });
    let updated=[];
    todaysFlights.forEach(f=>{
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
    });
    flights.forEach(flight=>{
      if (!flight) return;
      let index=todaysFlights.map(e=>e.flightId).indexOf(flight.flightId);
      if (index<0) {
        index=allFlights.map(e=>e.flightId).indexOf(flight.flightId);
        if (index<0) {
          flight.colorPatch='false';
          console.log('creating flight:');
          console.log(flight);
          TodaysFlight.create(flight);
        }
        else {
          index=todaysFlights.push(allFlights[index])-1;
        }
      }
      if (index>-1) {
        if (todaysFlights[index].date!==flight.date) {
          //console.log(todaysFlights[index]._id+' date'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].date=flight.date;
        }
        if (todaysFlights[index].flightNum!==flight.flightNum) {
          //console.log(todaysFlights[index]._id+' flightNum'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].flightNum=flight.flightNum;
        }
        if (todaysFlights[index].pilot!==flight.pilot){
          //console.log(todaysFlights[index]._id+' pilot'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].pilot=flight.pilot;
        }
        if (todaysFlights[index].coPilot!==flight.coPilot){
          //console.log(todaysFlights[index]._id+' copilot'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].coPilot=flight.coPilot;
        }
        if (todaysFlights[index].aircraft!==flight.aircraft){
          //console.log(todaysFlights[index]._id+' aircraft'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].aircraft=flight.aircraft;
        }
        if (todaysFlights[index].departTimes[0]!==flight.departTimes[0]){
          //console.log(todaysFlights[index]._id+' departTimes'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (todaysFlights[index].departTimes.length!==flight.departTimes.length){
          //console.log(todaysFlights[index]._id+' departTimes'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (todaysFlights[index].departTimes[todaysFlights[index].departTimes.length-1]!==flight.departTimes[flight.departTimes.length-1]){
          //console.log(todaysFlights[index]._id+' departTimes'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (JSON.stringify(todaysFlights[index].airports)!==JSON.stringify(flight.airports)){
          //console.log(todaysFlights[index]._id+' airports'); 
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].airports=flight.airports;
          todaysFlights[index].departTimes=flight.departTimes;
        }
      }
    });
    if (updated.length>0) {
      updated = [...new Set(updated)];
      updated.forEach(u=>{
        let index=todaysFlights.map(e=>e._id).indexOf(u);
        todaysFlights[index].colorPatch='false';
        console.log('Updating Flight ID: ' + todaysFlights[index].flightId);
        //console.log(todaysFlights[index]);
        delete todaysFlights[index]._id;
        TodaysFlight.find({
          where: {
            _id: u
          }
        }).then(saveUpdates(todaysFlights[index]))
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
