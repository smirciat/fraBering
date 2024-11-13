'use strict';

function metarService($http,$interval) {
  // Service logic
  // ...

  var self=this;
  
  function parseADDS(metar){
    //var self=this;
    var temp="";
    var obs={};
    if (metar==='missing') return obs;
    //metar="METAR PASK 082000Z AUTO 26015KT 1 1\/4SM -SN BR BKN017 OVC023 M08\/M09 A3028";
    //metar="PAOT 021617Z 05004KT 1\/4SM R09\/1600V2000FT FZFG VV002 M02\/M02  A2944 RMK AO2 I1001 T10221022";
    //metar="PAOT 021617Z 05004KT CLR M02\/M02  A2944 RMK AO2 I1001 T10221022";
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
      if (temp.slice(-2)==="SM") obs.vis = obs.vis + ' ' + temp;//this covers visibilities such as "1 3/4SM"
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
      obs.Visibility=obs.vis.replace(/[^0-9]/g, '');
    }
    //if (obs.Visibility==="") obs.Visibility="99";
    obs['Other-List']=[];
    obs['Cloud-List']=[];
    var unknown=metarArray.shift();//let's test this
    var test=(unknown.split('/').length<2)||unknown.substring(0,1)==='R';
    while (test){//when this is 2, we are on the temperature section
      if (testSky(unknown)) {
        var cloudArr=[];
        cloudArr.push(unknown.substring(0,3));
        if (cloudArr[0].substring(0,3)!=="CLR") {
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
      if (unknown.substring(0,1)!=='A'&&unknown.substring(0,3)!=='RMK') test=(unknown.split('/').length<2)||unknown.substring(0,1)==='R';
      else test=false;
    }
    obs.tempDew=unknown;
    obs.Temperature=obs.tempDew.split('/')[0];
    if (obs.Temperature.substring(0,1)==="M") obs.Temperature="-" + obs.Temperature.substring(1);
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
    var skyArr=["VV","CL","FE","BK","OV","SC"];
    if (skyArr.indexOf(str.substring(0,2))<0) return false;
    return true;
  }

  // Public API here
  return {
    someMethod: function () {
      return 42;
    },
    parseADDS
  };
}


angular.module('workspaceApp')
  .factory('metar', metarService);
