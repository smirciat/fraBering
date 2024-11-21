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
    //big sort first
    let marks=[];
    let bogus=[];
    //first run through to remove bogus blank lines
    arr.forEach((a,index)=>{
      //the marks have blanks at least the first two cells
      if ((!a.split(',')[0]||a.split(',')[0]==='')&&(!a.split(',')[1]||a.split(',')[1]==='')) marks.push(index);
      else {
        //not a mark, but no first cell, right after a mark. it has bogus marks above it
        if ((!a.split(',')[0]||a.split(',')[0]==='')&&marks.indexOf(index-1)>-1) {
          bogus.push(index-2);
          bogus.push(index-1);
        }
      }
    });
    bogus.forEach(index=>{
      arr[index]=undefined;
    });
    arr=arr.filter(a=>{return a});
    //another pass to do the sorting
    marks=[];
    let arrCount=0;
    let arrOfArrs=[];
    arr.forEach((a,index)=>{
      //the marks have blanks at least the first two cells
      if ((!a.split(',')[0]||a.split(',')[0]==='')&&(!a.split(',')[1]||a.split(',')[1]==='')) marks.push(index);
      else {
        //check for no flight number on last leg of charter
        if (index>0){
          let temp=a.split(',');
          let lastTemp=arr[index-1].split(',');
          if ((!temp[8]||temp[8]==='')&&lastTemp[8]&&lastTemp[8]!==''&&temp[10]==lastTemp[10]) {
            temp[8]=lastTemp[8];
            a=temp.join(',');
          }
        }
        //add to arrOfArrs
        if (index>0&&marks.indexOf(index-1)>-1) arrCount++;
        if (arrOfArrs.length<=arrCount) arrOfArrs.push([]);
        arrOfArrs[arrCount].push(a);
      }
    });
    arrOfArrs.forEach(el=>{
      let pilot=el[0].split(',')[0];
      let temp=el[0].split(',');
      temp[0]='';
      el[0]=temp.join(',');
      el.sort((a,b)=>{
        let aArr=a.split(',');
        let bArr=b.split(',');
        if (aArr.length<11||bArr.length<11) return 0;
        //make sure earlier date is before later date
        let aDate=new Date(aArr[1]).toLocaleDateString();
        let bDate=new Date(bArr[1]).toLocaleDateString();
        if (aDate!==bDate) return new Date(aArr[1])-new Date(bArr[1]);
        //same flightId, must be a charter
        if (aArr[10]===bArr[10]) {
          let aStringTime=aArr[1].split(' ');
          let bStringTime=bArr[1].split(' ');
          if (aStringTime.length<4||bStringTime.length<4||aStringTime[3].split(':').length<2||bStringTime[3].split(':').length<2) return 0;
          let atime=new Date();
          let btime=new Date();
          atime.setHours(aStringTime[3].split(':')[0],aStringTime[3].split(':')[1],0);
          btime.setHours(bStringTime[3].split(':')[0],bStringTime[3].split(':')[1],0);
          return atime-btime;
        }
        //put flights with flight numbers ahead of those without
        if (aArr[8]&&bArr[8]) return aArr[8].localeCompare(bArr[8]);
        if (aArr[8]&&!bArr[8]) return -1;
        if (!aArr[8]&&bArr[8]) return 1;
        //if neither has a flight number, compare flightIds
        return aArr[10]-bArr[10];
      });
      el[0]=pilot+el[0];
    });
    arr=[];
    arrOfArrs.forEach(a=>{
      //if (a[0].split(',')[0]==='jsmall') console.log(a);
      a.forEach(el=>{
        arr.push(el);
      });
      arr.push(',,,,,,,,,');
      arr.push(',,,,,,,,,');
    });
    
    //now look at 'no pilot available'
    
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
    console.log('parsing flight summary');
    let flightArr=[];
    let pilot,lastAirport,lastTime;
    let flight={airports:[],departTimes:[]};
    
    for (let x=0;x<arr.length;x++){
      let flightList=arr[x].split(',');
      if (flightList[0]&&flightList[0]!=="No Pilot Assigned") pilot=flightList[0];
      if (!flightList[1]||flightList[1]==="") {
        //blank line, new pilot coming up
        if (flight&&flight.flightNum) {
          
        }
        flight={airports:[],departTimes:[]};
        continue;
      }
      flight.date=new Date(flightList[1]).toLocaleDateString();
      if (!flight.pilot) flight.pilot=flightList[0]||pilot;
      if (!flight.coPilot) flight.coPilot=flightList[3];
      if (!flight.aircraft) flight.aircraft=flightList[4];
      if (!flight.flightNum&&flightList[8]) {
        //indicates new flight number
        flight.flightNum=flightList[8].split('.')[0];
        flight.flightId=flightList[10];
      }
      flight.airports.push(flightList[6]);
      lastAirport=flightList[7];
      flight.departTimes.push(new Date(flightList[2]).toTimeString().slice(0,8));
      //calculate flight time for last leg here---------------------------------------------------------------------------
      let speed=160;
      if (airplanes.map(e=>e.registration).indexOf(flight.aircraft)>-1) speed=250;
      let flightTime=60*getDistance(flightList[6],flightList[7])/speed + 10;//est flight time in minutes
      lastTime=new Date(flightList[2]);
      lastTime.setMinutes(lastTime.getMinutes()+flightTime);
      lastTime=lastTime.toTimeString().slice(0,8);
      if (lastTime.substring(0,7)==="Invalid") lastTime=undefined;
      //check for blank flight number 
      if (x<arr.length-1&&!arr[x+1].split(',')[8]) {
        let tempArr=arr[x+1].split(',');
        if (!['Nome','Kotzebue','Unalakleet'].includes(tempArr[6])&&tempArr[6]===arr[x].split(',')[7]) {
          tempArr[8]=arr[x].split(',')[8];
        }
        else tempArr[8]=tempArr[10];
        arr[x+1]=tempArr.join(',');//
      }
      //check if its the last one
      let tempPilot;
      if (x<arr.length-1&&arr[x+1]&&arr[x+1].split(',')[8]) tempPilot=arr[x+1].split(',')[8].split('.')[0];
      if (x===arr.length-1||(flightList[8].split('.')[0]!==tempPilot)) {
        flight.airports.push(lastAirport);
        if (!flight.pilot||flight.pilot==="") flight.pilot="No Pilot Assigned";
        if (lastTime) flight.departTimes.push(lastTime);
        flightArr.push(flight);
        flight={airports:[],departTimes:[],pilot:flight.pilot,flightId:flight.flightId};
      }
    }
    //find any duplicate flightIds
    let seenFlightIds=[];
    let duplicatesToBeRemoved=[];
    let seenIndex=-1;
    flightArr.forEach((f,idx)=>{
      seenIndex=seenFlightIds.map(e=>e.flight.flightId).indexOf(f.flightId);
      if (seenIndex<0) {
        seenFlightIds.push({index:idx,flight:f});
      }
      else {//remove one from flightArr
        if (f.pilot==='No Pilot Assigned'&&seenFlightIds[seenIndex].flight.pilot!=='No Pilot Assigned') duplicatesToBeRemoved.push(idx);
        else duplicatesToBeRemoved.push(seenFlightIds[seenIndex].index);
      }
      if (!f.flightId) duplicatesToBeRemoved.push(idx);
    });
    duplicatesToBeRemoved.forEach(d=>{
      flightArr[d]=undefined;
    });
    flightArr=flightArr.filter(f=>{
      return f;
    });
    let updated=[];
    todaysFlights.forEach(f=>{
      let fa=flightArr.filter(x=>{
        return f.date===x.date;
      });
      if (fa.length===0) return;
      let index=flightArr.map(e=>e.flightId).indexOf(f.flightId);
      let active=f.active;
      if (index===-1) active="false";
      else active="true";
      if (active!==f.active) {
        f.active=active;
        console.log(f._id+' active');
        updated.push(f._id);
      }
    });
    flightArr.forEach(flight=>{
      if (!flight) return;
      let index=todaysFlights.map(e=>e.flightId).indexOf(flight.flightId);
      if (index<0) {
        index=allFlights.map(e=>e.flightId).indexOf(flight.flightId);
        if (index<0) {
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
        console.log('Updating todaysFlight id number ' + u);
        console.log(todaysFlights[index]);
        delete todaysFlights[index]._id;
        TodaysFlight.find({
          where: {
            _id: u
          }
        }).then(saveUpdates(todaysFlights[index]))
          .catch(handleErrorMultiple(res));
      });
    }
    res.status(200).json(flightArr);
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to load CSV file from Takeflite');
  }
}
