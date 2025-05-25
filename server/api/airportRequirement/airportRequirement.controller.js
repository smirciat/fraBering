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
const baseUrl = 'http://localhost:' + config.port;
const url1="https://api.synopticlabs.org/v2/stations/latest?stid="; //data.com/v2/stations/latest?stid=";
const url2="&vars=metar&token=" + process.env.TOKEN;//"&within=120&vars=metar&token=" + process.env.TOKEN;
const axios = require("axios");
const https = require("https");
const agent = new https.Agent({
    rejectUnauthorized: false
});
let allPireps=[];
let count=0;
let xwind=0;
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

export function getPireps(req,res){
  try {
    let airport=req.body.airport||'OME';
    let obj={};
    obj=pireps(airport);
    res.status(200).json(obj);
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to grab metar List');
  }
}

// Creates a new AirportRequirement in the DB
export async function syncPireps() {
  try {
    //https://aviationweather.gov/api/data/pirep?id=PAOM&format=raw&age=2&distance=50
    let response = await axios.get('https://avwx.rest/api/pirep/PAOM?token='+process.env.AVWX_TOKEN2);
    if (!response) return [];
    if (response.data&&response.data.Error) console.log(response.data.Error);
    let data=response.data;
    if (response.data&&response.data.data) data=response.data.data;
    allPireps=data;
    return data;
  }
  catch(err){
    console.log(err);
    return [];
  }
}

// Filters only current airport from Pireps
export function pireps(airport) {
  try {
    let data=allPireps.filter(p=>{
      if (p.location&&p.location.station) return p.location.station===airport;
      return p.station===airport;
    });
    //return allPireps
    return data;
  }
  catch(err){
    console.log(err);
    return [];
  }
}

// Creates a new AirportRequirement in the DB
export async function notams(req, res) {
  try {
    let icao=req.body.airport;
    let response = await axios.get('https://avwx.rest/api/notam/'+icao+'?token='+process.env.AVWX_TOKEN2);
    if (response.data&&response.data.Error) console.log(res.data.Error);
    else res.status(200).json(response.data);
  }
  catch(err){
    console.log(err);
//    res.status(200).json('failure to update tafs');
    res.status(404).json('Failed load notams');
  }
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
        //tafs
        let response = await axios.get('https://avwx.rest/api/taf/'+airport.icao+'?token='+process.env.AVWX_TOKEN2);
        if (response) {
          if (response.data&&response.data.Error) console.log(res.data.Error);
          //console.log(response.data)
          airport.currentTaf=response.data['raw'];
          airport.currentTafObject=response.data.forecast;
        }
      } 
      //pireps
      airport.pireps = pireps(airport.threeLetter);
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
//    res.status(200).json('failure to update tafs');
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
    for (const [airportIndex,airport] of allAirports.entries()) {
      airport.runScroll=false;
      if (airportIndex>=allAirports.length-1) airport.runScroll=true;
      if (airport.icao&&airport.icao.length==4&&airport.icao!=="PAOB") {
        if (hour>=6&&hour<=17) airport.currentMetarObj = await getMetarSynoptic(airport.icao);
        else airport.currentMetarObj = await getMetarAVWX(airport.icao);
      }
      if (!airport.currentMetarObj) continue;
      airport.currentMetar=airport.currentMetarObj.metar;
      let metarDate=new Date(airport.currentMetarObj.date);
      if (metarDate<new Date(new Date().getTime()-120*60*1000)) {
        airport.metarObj={};
        airport.currentMetar='missing';
      }
      else {
        airport.metarObj=parseADDS(airport.currentMetarObj.metar);
        //add all the colors here:
        airport.metarObj.color=overallRiskClass(airport);
        airport.metarObj.xwind=xwind;
      }
      let id=airport._id;
      //delete airport._id;
      delete airport.currentMetarObj;
      let tempAirport=JSON.parse(JSON.stringify(airport));
      delete tempAirport._id;
      delete tempAirport.runwayScore;
      delete tempAirport.depth;
      delete tempAirport.percent;
      delete tempAirport.contaminent;
      delete tempAirport.signature;
      delete tempAirport.timestamp;
      delete tempAirport.comment;
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



export async function metarListGrab(req,res){
  try {
    let airport=req.body.airport;
    let obj={};
    if (airport) obj=await getMetarList(airport);
    res.status(200).json(obj);
  }
  catch(err){
    console.log(err);
    res.status(404).json('Failed to grab metar List');
  }
}

export async function getMetarList(airport) {
  let jsonResponse={airport:airport,metars:[]};
  let url1="https://api.synopticdata.com/v2/stations/timeseries?recent=120&stid=";
  let url = url1 + airport + url2;
  //url='https://api.weather.gov/stations/'+airport+'/observations/latest';
  try {
    let response = await axios.get(url);
    console.log(response.data.STATION[0].OBSERVATIONS.metar_set_1[0]);
    jsonResponse.metars=response.data.STATION[0].OBSERVATIONS.metar_set_1;
   }
   catch (err) {
     jsonResponse.err=err;
     if (err.response&&err.response.config){
       console.log(err.response.config.url);
     }
     else console.log('error fetching metar list for '+airport);
   }
   finally{
     return jsonResponse;
   }
}

export async function getMetarGOV(airport) {
  let jsonResponse={airport:airport,metar:'missing'};
  let url='https://api.weather.gov/stations/'+airport+'/observations/latest';
  try {
    let response = await axios.get(url);
    if (response.data.properties&&response.data.properties.rawMessage) {//STATION[0]
      jsonResponse.metar=response.data.properties.rawMessage;//response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
      jsonResponse.date=response.data.properties.timestamp;//response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      if (response.data.geometry&&response.data.geometry.coordinates) {
        response.data.geometry.coordinates[1];//response.data.STATION[0].LATITUDE;
        response.data.geometry.coordinates[0];//response.data.STATION[0].LONGITUDE;
      }
    }
   }
   catch (err) {
     if (err.response&&err.response.config){
       console.log('Error Fetching METAR:');
       console.log(err.response.config.url);
     }
     else console.log('error fetching metar for '+airport);
   }
   finally{
     return jsonResponse;
   }
      
}

export async function getMetarAVWX(airport) {
  let jsonResponse={airport:airport,metar:'missing'};
  let url = 'https://avwx.rest/api/metar/' + airport + '?reporting=true&token=' + process.env.AVWX_TOKEN2;
  try {
    let response = await axios.get(url);
    if (response.data&&response.data.raw){
      jsonResponse.metar=response.data.raw;
      jsonResponse.date=response.data.time.dt;
    }
   }
   catch (err) {
     if (err.response&&err.response.config){
       console.log('Error Fetching METAR:');
       console.log(err.response.config.url);
     }
     else console.log('error fetching metar for '+airport);
   }
   finally{
     return jsonResponse;
   }
      
}

export async function getMetarSynoptic(airport) {
  let jsonResponse={airport:airport,metar:'missing'};
  let url = url1 + airport + url2;
  //url='https://api.weather.gov/stations/'+airport+'/observations/latest';
  try {
    let response = await axios.get(url);
    if (response.data&&response.data.STATION&&response.data.STATION[0]){//(response.data.properties&&response.data.properties.rawMessage) {//STATION[0]
      jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_value_1.value;//response.data.properties.rawMessage;//response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
      jsonResponse.date=response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;//response.data.properties.timestamp;//response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      //if (response.data.geometry&&response.data.geometry.coordinates) {
        jsonResponse.latitude=response.data.STATION[0].LATITUDE;//response.data.geometry.coordinates[1];//response.data.STATION[0].LATITUDE;
        jsonResponse.longitude=response.data.STATION[0].LONGITUDE;//response.data.geometry.coordinates[0];//response.data.STATION[0].LONGITUDE;
      //}
    }
   }
   catch (err) {
     if (err.response&&err.response.config){
       console.log('Error Fetching METAR:');
       console.log(err.response.config.url);
     }
     else console.log('error fetching metar for '+airport);
   }
   finally{
     return jsonResponse;
   }
      
}

export async function getMetar(airport) {
  let jsonResponse={airport:airport,metar:'missing'};
  let url = url1 + airport + url2;
  //url='https://api.weather.gov/stations/'+airport+'/observations/latest';
  try {
    let response = await axios.get(url);
    if (response.data&&response.data.STATION&&response.data.STATION[0]){//(response.data.properties&&response.data.properties.rawMessage) {//STATION[0]
      jsonResponse.metar=response.data.STATION[0].OBSERVATIONS.metar_value_1.value;//response.data.properties.rawMessage;//response.data.STATION[0].OBSERVATIONS.metar_value_1.value;
      jsonResponse.date=response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;//response.data.properties.timestamp;//response.data.STATION[0].OBSERVATIONS.metar_value_1.date_time;
      //if (response.data.geometry&&response.data.geometry.coordinates) {
        jsonResponse.latitude=response.data.STATION[0].LATITUDE;//response.data.geometry.coordinates[1];//response.data.STATION[0].LATITUDE;
        jsonResponse.longitude=response.data.STATION[0].LONGITUDE;//response.data.geometry.coordinates[0];//response.data.STATION[0].LONGITUDE;
      //}
    }
   }
   catch (err) {
     if (err.response&&err.response.config){
       console.log('Error Fetching METAR:');
       console.log(err.response.config.url);
     }
     else console.log('error fetching metar for '+airport);
   }
   finally{
     return jsonResponse;
   }
      
}

function overallRiskClass(airport){
    let metarObj=airport.metarObj;
    let returnString="";
    //if (!metarObj) metarObj={};
    //if (metarObj.night) returnString+=' night';
    let colors=['airport-green','airport-blue','airport-purple','airport-yellow','airport-orange','airport-pink'];
    let color="airport-green";
    let tempColor="airport-green";
    //runway
    //if (!metarObj.airport) return returnString+=' '+color;
    tempColor=returnColor({yellow:3,red:2},airport.runwayScore,'above');
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
    tempColor=returnWindColor(undefined,metarObj['Wind-Gust'],metarObj['Wind-Direction'],airport);//this.returnColor({yellow:30,red:35},metarObj["Wind-Gust"],'below');
    metarObj.windColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //Visibility
    if (!metarObj.Visibility||!metarObj.Ceiling||(!metarObj.altimeter&&(!metarObj.manualObs||!metarObj.usingManual||(metarObj.usingManual&&metarObj.manualObs.isOfficial)))||metarObj.Visibility==='99'||metarObj.Ceiling=='9999'||metarObj.Visibility===99||metarObj.Ceiling==9999) {
      //set colors to purple
      metarObj.ceilingColor=metarObj.visibilityColor=tempColor='airport-purple';
      if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
      return returnString+' '+color;
    }
    //visibility
    tempColor=returnColor(airport.visibilityRequirement, metarObj.Visibility,'above',airport);
    metarObj.visibilityColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //ceiling
    tempColor=returnColor(airport.ceilingRequirement,metarObj.Ceiling,'above',airport);
    metarObj.ceilingColor=tempColor;
    if (colors.indexOf(tempColor)>colors.indexOf(color)) color=tempColor.toString();
    //return
    metarObj.color=returnString+' '+color;
    return returnString+' '+color;
  }
  
  function returnColor(limitObj,observation,direction,airport){
    if (!observation||observation===""||!limitObj) {
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
    if (!gust||!windDirection||!airportObj) {
      //console.log('windColor');
      return 'airport-purple';
    }
    //let equipment=angular.copy(this.equipment[0]);
    //if (this.allAircraft) {
    //  let index=this.allAircraft.map(e=>e._id).indexOf(aircraft);
    //  if (index>-1&&this.allAircraft[index]) index=this.equipment.map(e=>e.name).indexOf(this.allAircraft[index].acftType);
    //  if (index>-1) equipment=angular.copy(this.equipment[index]);
    //}
    if (!airportObj.runways) {
      if (gust>35) return 'airport-pink';
      if (gust>30) return 'airport-yellow';
      return 'airport-green';
    }
    let xwindAngle=0;
    let direction=0;
    let crosswind=0;
    if (airportObj.runways) {
      xwindAngle=90;
      direction=parseInt(windDirection,10);
      airportObj.runways.forEach(function(runway){
        if (Math.abs(direction-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-runway*10);
        if (Math.abs(direction+360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction+360-runway*10);
        if (Math.abs(direction-360-runway*10)<xwindAngle) xwindAngle = Math.abs(direction-360-runway*10);
      });
    }
    crosswind = Math.round(gust*Math.sin(xwindAngle*(Math.PI/180)));
    xwind=crosswind;
    let windLimit=35;
    let xwindLimit=25;
    if (airportObj.icao==='PAGM'){
      if (direction>=40&&direction<=100){
        //wind-=5;
        //equipment.xwind-=10;
      }
    }
    if (airportObj.icao==="PADG") {
     windLimit=30;
     xwindLimit=15;
    }
    if (gust>windLimit) return 'airport-pink';
    if (crosswind>xwindLimit) return 'airport-pink';
    if (gust>windLimit-5) return 'airport-yellow';
    if (crosswind>xwindLimit-5) return 'airport-yellow';
    return 'airport-green';
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

export function parseADDS(metar){
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
    if (obs.wind.slice(-2)==="KT") {
      obs['Wind-Direction']=obs.wind.substring(0,3);
      var windArr=obs.wind.substring(3).split('G');
      obs['Wind-Speed']=windArr[0].replace(/[^0-9]/g, '');
      if (windArr.length>1) obs['Wind-Gust']=windArr[1].replace(/[^0-9]/g, '');
      else obs['Wind-Gust']=obs['Wind-Speed'];
      obs.vis=metarArray.shift();
    }
    else {
      obs.vis=obs.wind.toString();
      obs.wind=undefined;
    }
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
