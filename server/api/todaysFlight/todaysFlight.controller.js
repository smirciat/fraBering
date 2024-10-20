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
import {TodaysFlight} from '../../sqldb';
import fs from 'fs';

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
    res.status(statusCode).send(err);
  };
}

// Gets a list of TodaysFlights
export function index(req, res) {
  return TodaysFlight.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
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

export async function tf(req,res) {
  try {
    let file=req.body.file||"current.csv";
    let data=fs.readFileSync(__dirname+'/../../fileserver/'+file, 'utf-8');
    //console.log(todaysFlights);
    let arr=data.split('\r\n');
    let dateArr=arr[1].split(' ');
    let date=new Date(dateArr[2]+' '+dateArr[3]+' '+dateArr[4]).toLocaleDateString();
    let date2=new Date(dateArr[6]+' '+dateArr[7]+' '+dateArr[8]).toLocaleDateString();
    arr.splice(0,8);
    let marker=0;
    let npa=[];
    for (let x=0;x<arr.length;x++) {
        
      if (!arr[x].split(',')[1]||arr[x].split(',')[1]==='') {
        marker=x;
        break;
      }
      else npa.push(arr[x]);
    }
    arr.splice(0,marker);
    npa.sort((a,b)=>{
      let aArr=a.split(',');
      let bArr=b.split(',');
      return aArr[10]-bArr[10];
    });
    arr=npa.concat(arr);
    //console.log(arr);
    if (false){//(req.body.dateString&&date!==req.body.dateString) {
      //res.status(404).json('Invalid Date.  File is from ' + date + ', current date is ' + req.body.dateString);
      //return;
    }
    let instance=await TodaysFlight.findAll();
    let todaysFlights=[];
    instance.forEach(i=>{
      if (i.dataValues&&(i.dataValues.date===date||i.dataValues.date===date2)) todaysFlights.push(i.dataValues);
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
      if (!flight.pilot) {
        flight.pilot=flightList[0]||pilot;
        flight.coPilot=flightList[3];
        
      }
      if (!flight.aircraft) flight.aircraft=flightList[4];
      if (!flight.flightNum&&flightList[8]) {
        //indicates new flight number
        flight.flightNum=flightList[8].split('.')[0];
        flight.flightId=flightList[10];
      }
      flight.airports.push(flightList[6]);
      lastAirport=flightList[7];
      flight.departTimes.push(new Date(flightList[2]).toTimeString().slice(0,8));
      lastTime=new Date(flightList[2]).toTimeString().slice(0,8);
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
      if (x===arr.length-1||(flightList[8].split('.')[0]!==arr[x+1].split(',')[8].split('.')[0])) {
        flight.airports.push(lastAirport);
        if (!flight.pilot||flight.pilot==="") flight.pilot="No Pilot Assigned";
        //flight.departTimes.push(lastTime);
        flightArr.push(flight);
        flight={airports:[],departTimes:[],pilot:flight.pilot,coPilot:flight.coPilot,flightId:flight.flightId};
      }
    }
    console.log(flightArr)
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
        updated.push(f._id);
      }
    });
    flightArr.forEach(flight=>{
      let index=todaysFlights.map(e=>e.flightId).indexOf(flight.flightId);
      if (index<0) {
        console.log('creating flight:');
        console.log(flight);
        TodaysFlight.create(flight);
      }
      else {
        if (todaysFlights[index].date!==flight.date) {
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].date=flight.date;
        }
        if (todaysFlights[index].flightNum!==flight.flightNum) {
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].flightNum=flight.flightNum;
        }
        if (todaysFlights[index].pilot!==flight.pilot){
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].pilot=flight.pilot;
        }
        if (todaysFlights[index].coPilot!==flight.coPilot){
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].coPilot=flight.coPilot;
        }
        if (todaysFlights[index].aircraft!==flight.aircraft){
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].aircraft=flight.aircraft;
        }
        if (todaysFlights[index].departTimes[0]!==flight.departTimes[0]){
          updated.push(todaysFlights[index]._id);
          todaysFlights[index].departTimes=flight.departTimes;
        }
        if (JSON.stringify(todaysFlights[index].airports)!==JSON.stringify(flight.airports)){
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
          .catch(handleError(res));
      });
    }
    res.status(200).json(flightArr);
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to load CSV file from Takeflite');
  }
}
