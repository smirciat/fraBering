/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/airportRequirements              ->  index
 * POST    /api/airportRequirements              ->  create
 * GET     /api/airportRequirements/:id          ->  show
 * PUT     /api/airportRequirements/:id          ->  update
 * DELETE  /api/airportRequirements/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import {AirportRequirement} from '../../sqldb';
import config from '../../config/environment';
const baseUrl = 'https://localhost:' + config.port;
const url1="https://api.synopticdata.com/v2/stations/latest?stid=";
const url2="&vars=metar&token=" + process.env.TOKEN;//"&within=120&vars=metar&token=" + process.env.TOKEN;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});
let count=0;
let alternateArray=['OME','OTZ','UNK','BET','GAL','ANC','FAI'];

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

function handleErrorMultiple(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    console.log(err);
  };
}

// Gets a list of AirportRequirements
export function index(req, res) {
  return AirportRequirement.findAll()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single AirportRequirement from the DB
export function show(req, res) {
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new AirportRequirement in the DB
export function create(req, res) {
  return AirportRequirement.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing AirportRequirement in the DB
export function update(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a AirportRequirement from the DB
export function destroy(req, res) {
  return AirportRequirement.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

export async function tafs(req,res) {
  let allAirports=[];
  try {
    let instance=await AirportRequirement.findAll({});
    instance.forEach(i=>{
      if (i.dataValues) allAirports.push(i.dataValues);
    });
    for (const airport of allAirports) {
      if (alternateArray.indexOf(airport.threeLetter)>-1) {
        let response = await axios.get('https://avwx.rest/api/taf/'+airport.icao+'?token='+process.env.AVWX_TOKEN2);
        if (response.data.Error) console.log(res.data.Error);
        //console.log(response.data)
        airport.currentTaf=response.data['raw'];
        airport.currentTafObject=response.data.forecast;
      } 
      let tempAirport=JSON.parse(JSON.stringify(airport));
      delete tempAirport._id;
      AirportRequirement.find({
        where: {
          _id: airport._id
        }
      }).then(saveUpdates(tempAirport))
        .catch(handleErrorMultiple(res));
      //});
    }
    console.log('TAFs updated ');
    res.status(200).json('Tafs updated');
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed update tafs for allAirports array');
  }
}

export async function metars(req,res) {
  let allAirports=[];
  try {
    const hour=new Date().getHours();
    if (false){//(hour<6||hour>18) {
      console.log('no metar fetching at night');
      return res.status(201).json('No Metars at night');
    }
    //initialize airport list from database table if it is empty
    if (true){//(allAirports.length===0||count>=24) {
      count=0;
      let instance=await AirportRequirement.findAll({});
      instance.forEach(i=>{
        if (i.dataValues) allAirports.push(i.dataValues);
      });
    }
    count++;
    //go through list of airports and grab current weather observations
    for (const airport of allAirports) {
      if (airport.icao&&airport.icao.length==4&&airport.icao!=="PAOB") airport.currentMetarObj = await getMetar(airport.icao);
      if (!airport.currentMetarObj) continue;
      airport.currentMetar=airport.currentMetarObj.metar;
      let metarDate=new Date(airport.currentMetarObj.date);
      if (metarDate<new Date(new Date().getTime()-120*60*1000)) {
        airport.metarObj={};
        airport.currentMetar='missing';
      }
      else airport.metarObj=parseADDS(airport.currentMetarObj.metar);
      let id=airport._id;
      //delete airport._id;
      delete airport.currentMetarObj;
      let tempAirport=JSON.parse(JSON.stringify(airport));
      delete tempAirport._id;
      AirportRequirement.find({
        where: {
          _id: id
        }
      }).then(saveUpdates(tempAirport))
        .catch(handleErrorMultiple(res));
      //});
    }
    console.log('Metars updated for array of length ' + allAirports.length);
    res.status(200).json('allAirports array populated with ' + allAirports.length + ' elements');
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed update metars for allAirports array');
  }
} 

async function getMetar(airport) {
  let url = url1 + airport + url2;
  let response = await axios.get(url);
  let jsonResponse={};
    if (!response.data.STATION) jsonResponse={};
    else {
      if (response.data.STATION[0]) {
        jsonResponse.airport=airport;
        jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
        jsonResponse.latitude=response.data.STATION[0].LATITUDE;
        jsonResponse.longitude=response.data.STATION[0].LONGITUDE;
        jsonResponse.date=response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      }
      else {
        jsonResponse.metar="missing";
      }
    }
    return jsonResponse;
}

export async function adds(req,res) {
  if (!req.body||!req.body.airport||req.body.airport==="") res.status(404).end();
  var airport=req.body.airport;
  var url = url1 + airport + url2;
  axios.get(url)
  .then(response => {
    var jsonResponse={};
    if (!response.data.STATION) jsonResponse={};
    else {
      if (response.data.STATION[0]) {
        //var index=response.data.STATION[0].OBSERVATIONS.metar_set_1.length-1;
        //jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_set_1[index];
        jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
        jsonResponse.latitude=response.data.STATION[0].LATITUDE;
        jsonResponse.longitude=response.data.STATION[0].LONGITUDE;
        jsonResponse.date=response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      }
      else {
        jsonResponse.metar="missing";
      }
    }
    res.json(jsonResponse);
    
  },handleError(res));  
}

function parseADDS(metar){
    var temp="";
    var obs={};
    if (!metar||metar==='missing') return obs;
    //metar="METAR PASK 082000Z AUTO 26015KT 1 1\/4SM -SN BR BKN017 OVC023 M08\/M09 A3028";
    //metar="PAOT 021617Z 05004KT 1\/4SM R09\/1600V2000FT FZFG VV002 M02\/M02  A2944 RMK AO2 I1001 T10221022";
    //metar="PAOT 021617Z 05004KT CLR M02\/M02  A2944 RMK AO2 I1001 T10221022";
    //metar='METAR PAOM 191615Z AUTO 15017G22KT 3SM -FZRA BR OVC004 M04/M05 A3025';
    obs['Raw-Report']=metar;
    var metarArray=metar.split(' ');
    metarArray.forEach(m=>{
      if (m.substring(0,1)==='A'&&m.length===5) obs.altimeter=m;
    });
    var tempMetar=metarArray.shift();//identifier
    if (tempMetar==="METAR"||tempMetar==="SPECI") metarArray.shift();//if prefaced by 'METAR'
    metarArray.shift();//date/time
    obs.wind=metarArray.shift();//wind
    if (obs.wind==="AUTO"||obs.wind==="SPECI") obs.wind=metarArray.shift();//if there is AUTO of SPECI, remove it
    obs['Wind-Direction']=obs.wind.substring(0,3);
    var windArr=obs.wind.substring(3).split('G');
    obs['Wind-Speed']=windArr[0].replace(/[^0-9]/g, '');
    if (windArr.length>1) obs['Wind-Gust']=windArr[1].replace(/[^0-9]/g, '');
    else obs['Wind-Gust']=obs['Wind-Speed'];
    obs.vis=metarArray.shift();//visibility
    //obs.vis="1/2SM";
    if (obs.vis&&obs.vis.split('V').length>1&&obs.vis.split('V')[0].length===3&&obs.vis.split('V')[1].length===3) obs.vis=metarArray.shift();//variable winds, ignore
    if (obs.vis&&obs.vis.slice(-2)!=="SM") {
      temp=metarArray.shift();
      if (temp&&temp.slice(-2)==="SM") obs.vis = obs.vis + ' ' + temp;//this covers visibilities such as "1 3/4SM"
      else {
        metarArray.unshift(temp);
        metarArray.unshift(obs.vis);
        obs.vis="99";
      }
    }
    var visArray=[];
    if (obs.vis) visArray=obs.vis.split('/');
    var number, top, bottom;
    if (visArray.length>1) {
      obs.Visibility=visArray[0].replace(/[^0-9 ]/g, '') + '/' + visArray[1].replace(/[^0-9]/g, '');
      var visArray1=obs.Visibility.split(' ');
      if (visArray1.length>1) {//turn 1 1/2 into 3/2
        number = parseInt(visArray1[0],10);
        top = parseInt(visArray1[1].substring(0,1),10);
        bottom = parseInt(visArray1[1].slice(-1),10);
        //obs.Visibility= (top+number*bottom) + '/' + bottom;
        obs.Visibility=(top+number*bottom)/bottom;
      }
      else obs.Visibility=(visArray[0].replace(/[^0-9 ]/g, '')/visArray[1].replace(/[^0-9]/g, '')).toString();
    }
    else {
      if (obs.vis) obs.Visibility=obs.vis.replace(/[^0-9]/g, '');
    }
    if (!obs.Visibility&&obs.vis==="10SM") obs.Visibility=10;
    //if (obs.Visibility==="") obs.Visibility="99";
    obs['Other-List']=[];
    obs['Cloud-List']=[];
    var unknown=metarArray.shift();//let's test this
    var test=false;
    if (unknown) test=(unknown.split('/').length<2)||unknown.substring(0,1)==='R';
    while (test){//when this is 2, we are on the temperature section
      if (testSky(unknown)) {
        var cloudArr=[];
        cloudArr.push(unknown.substring(0,3));
        if (cloudArr[0].substring(0,3)!=="CLR"||cloudArr[0].substring(0,3)!=="SKC") {
          if (cloudArr[0].substring(0,2)==="VV") {
            cloudArr[0]="VV";
            cloudArr.push(unknown.substring(2));
          }
          else {
            cloudArr.push(unknown.substring(3));
          }
        }
        obs['Cloud-List'].push(cloudArr);
      }
      else {
        obs['Other-List'].push(unknown);
      }
      unknown=metarArray.shift();
      if (unknown&&unknown.substring(0,1)!=='A'&&unknown.substring(0,3)!=='RMK') test=(unknown.split('/').length<2)||unknown.substring(0,1)==='R';
      else test=false;
    }
    obs.tempDew=unknown;
    if (obs.tempDew) obs.Temperature=obs.tempDew.split('/')[0];
    if (obs.Temperature&&obs.Temperature.substring(0,1)==="M") obs.Temperature="-" + obs.Temperature.substring(1);
    obs.Freezing=false;
        if (obs['Other-List'].length>0) {
          obs['Other-List'].forEach(function(item){
            var i=item.replace(/[^a-zA-Z]/g, "");
            if (i.substring(0,2)==="FZ") obs.Freezing=true;
          });
        }
    var len = obs['Cloud-List'].length;
        if (len===0) obs.Ceiling='9999';
        else if (len>-1&&(obs['Cloud-List'][0][0]==='BKN'||obs['Cloud-List'][0][0]==='OVC'||obs['Cloud-List'][0][0]==='VV')) obs.Ceiling=obs['Cloud-List'][0][1]+'00';
        else if (len>=2&&(obs['Cloud-List'][1][0]==='BKN'||obs['Cloud-List'][1][0]==='OVC'||obs['Cloud-List'][0][0]==='VV')) obs.Ceiling=obs['Cloud-List'][1][1]+'00';
        else if (len>=3&&(obs['Cloud-List'][2][0]==='BKN'||obs['Cloud-List'][2][0]==='OVC'||obs['Cloud-List'][0][0]==='VV')) obs.Ceiling=obs['Cloud-List'][2][1]+'00';
        else if (len>=4&&(obs['Cloud-List'][3][0]==='BKN'||obs['Cloud-List'][3][0]==='OVC'||obs['Cloud-List'][0][0]==='VV')) obs.Ceiling=obs['Cloud-List'][3][1]+'00';
        else obs.Ceiling='10000';
        obs.Ceiling = obs.Ceiling.replace(/^0+/, '');
    return obs;
}

function testSky(str) {
    str=str.toUpperCase();
    var skyArr=["VV","CL","FE","BK","OV","SC","SK"];
    if (skyArr.indexOf(str.substring(0,2))<0) return false;
    return true;
}

export function autoCheck(req,res){
  if (!req.body.monitor.password||req.body.monitor.password!==process.env.PASSWORD) {
    res.status(501).end();
    return null;
  }
  var monitor=req.body.monitor;
  const myInterval=setInterval(()=>{
      var mon=_.cloneDeep(monitor);
      //test parameter and threshold by current condition
      //get current condition through api
      if (mon.airport&&mon.airport!==""&&mon.airport.length>2) {
        axios.post(baseUrl + '/api/airportRequirements/adds',{airport:mon.airport}, { httpsAgent: agent }).then((response)=>{
          if (!response.data.metar||response.data.metar==="missing") return;
          var metar=response.data.metar;
          //parse result
          var metarObj=config.parseADDS(metar);
          //test threshold
          if (config.testThreshold(metarObj,mon.watchedParameter,mon.watchedThreshold)) {
            //if failed, do nothing.  if passed, stop interval and notify and update monitor record in api
            mon.active=false;
            if (monitor.active){
              axios.put(baseUrl + '/api/monitors/' + mon._id,mon, { httpsAgent: agent }).then(()=>{
                monitor.active=false;
                console.log("Monitor Updated in database");
              });
              axios.post(baseUrl + '/api/monitors/twilio',{to:mon.phone,body:metar}, { httpsAgent: agent }).then((res)=>{
                console.log('Twilio message sent');
              },function(err){
                console.log(err);
              });
            }
            clearInterval(myInterval);
          }
        });
      }
    },1000*60);
  res.sendStatus(200);
}
