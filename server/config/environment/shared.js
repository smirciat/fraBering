'use strict';

exports = module.exports = {
  // List of user roles
  userRoles: ['guest', 'user', 'admin','superadmin'],
  
  angularMomentConfig:{timezone:'America/Anchorage'},
  
  equipment:[{id:1,name:"Caravan",wind:35,xwind:25,temp:-50},
       {id:2,name:"Navajo",wind:40,xwind:30,temp:-35},
       {id:3,name:"Casa",wind:35,xwind:25,temp:-50},
       {id:4,name:"King Air",wind:40,xwind:30,temp:-50},
       {id:5,name:"1900",wind:40,xwind:30, temp:-50}],
  
  flights:[
    {  flightNum:'605', airports:['PAOT','PAOM'], daysOfWeek:[1,2,3,4,5], departTimes:['17:30','18:45']},
    {  flightNum:'805', airports:['PAOM','PAOT'], daysOfWeek:[1,2,3,4,5], departTimes:['8:20','9:35']},
    {  flightNum:'631', airports:['PAOT','PFNO','PAIK','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["10:00", "10:30", "10:55",'11:20']},
    {  flightNum:'621', airports:['PAOT','PAFM','PAGH','PAOB','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["08:45", "09:35", "09:50", "10:05",'11:25']},
    {  flightNum:'870', airports:['PAOM','PATE','PFKT','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['9:45','10:25','10:45','11:15']},
    {  flightNum:'892', airports:['PAOM','PATE','PFKT','PAIW','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['15:15','15:55','16:15','16:35','17:45']},
    {  flightNum:'895', airports:['PAOM','PATE','PFKT','PAIW','PAOM'], daysOfWeek:[7], departTimes:['12:15','12:55','13:15','13:35','14:40']},  
    {  flightNum:'812', airports:['PAOM','PFEL','PAGL','PAWM','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['8:30','9:15','9:25','9:40','10:30']},
    {  flightNum:'820', airports:['PAOM','PFEL','PAGL','PAWM','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['15:45','16:25','16:40','16:45','18:00']},
    {  flightNum:'825', airports:['PAOM','PFEL','PAGL','PAWM','PAOM'], daysOfWeek:[7], departTimes:['14:45','12:55','13:15','15:55','17:00']}, 
    {  flightNum:'850', airports:['PAOM','PAGM','PASA','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['9:00','10:00','10:30','11:20']},
    {  flightNum:'852', airports:['PAOM','PAGM','PASA','PAOM'], daysOfWeek:[7], departTimes:['13:30','14:30','15:00','15:50']},
    {  flightNum:'853', airports:['PAOM','PAGM','PASA','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['15:00','16:05','16:35','17:20']},  
    {  flightNum:'810', airports:['PAOM','PAKK','PFSH','PAUN'], daysOfWeek:[1,2,3,4,5,6], departTimes:["08:30", "09:25", "09:55","10:30"]},
    {  flightNum:'815', airports:['PAOM','PAKK','PFSH','PAOM'], daysOfWeek:[7], departTimes:["14:45", "15:45", "17:20","18:35"]},
    {  flightNum:'830', airports:['PAOM','PAMK','WBB','PAUN'], daysOfWeek:[1,2,3,4,5,6], departTimes:['9:30','10:25','10:35','11:15']},
    {  flightNum:'840', airports:['PAOM','PAMK','WBB','PAUN'], daysOfWeek:[1,2,3,4,5,6,7], departTimes:['15:30','17:05','17:15','17:55']},
    {  flightNum:'890', airports:['PAOM','PATC','PAIW','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:['12:15','13:15','13:35','13:55']},
    {  flightNum:'622', airports:['PAOT','PAFM','PAGH','PAOB','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["15:00", "15:50", "16:05", "16:20",'17:40']},
    {  flightNum:'625', airports:['PAOT','PAFM','PAGH','PAOB','PAOT'], daysOfWeek:[7], departTimes:["12:00", "12:50", "13:05", "13:20",'14:45']},
    {  flightNum:'641', airports:['PAOT','PABL','PADE','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["9:45", "10:25", "10:45",'11:25']},
    {  flightNum:'642', airports:['PAOT','PABL','PADE','PAOT'], daysOfWeek:[1,2,3,4,5,6,7], departTimes:["15:30", "16:10", "16:30",'17:10']},
    {  flightNum:'632', airports:['PAOT','PFNO','PAIK','PAOT'], daysOfWeek:[1,2,3,4,5,6,7], departTimes:["15:45", "16:30", "16:45",'17:05']},
    {  flightNum:'681', airports:['PAOT','PAWN','PAVL','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["11:00", "11:30", "12:05",'12:35']},
    {  flightNum:'682', airports:['PAOT','PAWN','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["16:45", "17:15",'17:35']},
    {  flightNum:'685', airports:['PAOT','PAWN','PAVL','PAOT'], daysOfWeek:[7], departTimes:["12:30", "13:00", "13:35",'14:05']},
    {  flightNum:'662', airports:['PAOT','PAVL','PAPO','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["15:15", "15:55", "16:35",'17:45']},
    {  flightNum:'661', airports:['PAOT','PAPO','PALU','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["9:00", "10:05","10:35",'12:00']},
    {  flightNum:'651', airports:['PAOT','PASK','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["9:15", "9:50",'10:25']},
    {  flightNum:'652', airports:['PAOT','PASK','PAOT'], daysOfWeek:[1,2,3,4,5,6], departTimes:["15:00", "15:40",'16:10']},
    {  flightNum:'655', airports:['PAOT','PASK','PAOT'], daysOfWeek:[7], departTimes:["12:15", "12:50",'13:05']},
    {  flightNum:'420', airports:['PAUN','PFSH','PAKK','PAOM'], daysOfWeek:[1,2,3,4,5,6], departTimes:["17:00", "17:30", "18:00",'18:45']},
    {  flightNum:'440', airports:['PAUN','PFSH','PAKK','PAUN'], daysOfWeek:[1,2,3,4,5,6], departTimes:["11:30", "12:15", "12:45",'13:15']}
    ],
    
  pilots:[
    {name: "Olson, David", level: "level1", active: true},
    {name: "Kinneen, Fen", level: "level1", active: true},
    {name: "Eggart, Larry", level: "level1", active: true},
    {name: "Ahl, Kevin", level: "level1", active: true},
    {name: "Evans, Mike", level: "level1", active: true},
    {name: "Henry, Cliff", level: "level1", active: true},
    {name: "Smith, Jason", level: "level1", active: true},
    {name: "Morgan, Stan", level: "level1", active: true},
    {name: "Small, Joe", level: "level1", active: true},
    {name: "Rowe, Russell", level: "level1", active: true},
    {name: "Woehler, Ryan", level: "level1", active: true},
    {name: "Lefebvre, Kyle", level: "level1", active: true},
    {name: "McIntosh, Brandon", level: "level1", active: true},
    {name: "Greene, Jade", level: "level1", active: true},
    {name: "Cox, Steffen", level: "level1", active: true},
    {name: "Baker, Adam", level: "level1", active: true},
    {name: "Goodin, Daniel", level: "level1", active: true},
    {name: "Wright, Franc", level: "level1", active: true},
    {name: "Wagner, Nate", level: "level1", active: true},
    {name: "Wasem, John", level: "level1", active: true},
    {name: "Eckler, Brianna", level: "level1", active: true},
    {name: "Jones, Sean", level: "level1", active: true},
    {name: "Olson, Nathaniel", level: "level1", active: true},
    {name: "Kunkel, Tim", level: "level1", active: true},
    {name: "Borchardt, Mark", level: "level1", active: true},
    {name: "Dunkley, Bret", level: "level1", active: true},
    {name: "Russell, Steve", level: "level1", active: true},
    {name: "Rohlack, Korey", level: "level1", active: true},
    {name: "Freckleton, Matt", level: "level1", active: true},
    {name: "Gardner, Evan", level: "level1", active: true},
    {name: "Hanson, Ryan", level: "level1", active: true},
    {name: "Tunley, David", level: "level1", active: true},
    {name: "Smircich, Andy", level: "level15", active: true}

    ],
    
  airportRequirements:[
    {icao:'PAOT',name:'Kotzebue',base:true,ceilingRequirement:{yellow: 1000, red: 263, ifr: 1000, night: 3000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 0.75, ifr: 3, night: 5},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAOM',name:'Nome',base:true,ceilingRequirement:{yellow: 1000, red: 272, ifr: 1000, night: 3000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 0.75, ifr: 3, night: 5},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAUN',name:'Unalakleet',base:true,ceilingRequirement:{yellow: 1000, red: 340, ifr: 1000, night: 3000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 3, night: 5},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PFKT',name:'Brevig Mission',base:false,ceilingRequirement:{yellow: 1000, red: 288, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 0.825, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'CIL',name:'Council',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PFEL',name:'Elim',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAGM',name:'Gambell',base:false,ceilingRequirement:{yellow: 1000, red: 279, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 0.75, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAGL',name:'Golovin',base:false,ceilingRequirement:{yellow: 1000, red: 460, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAKK',name:'Koyuk',base:false,ceilingRequirement:{yellow: 1000, red: 280, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'DIO',name:'Little Diomede',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAMK',name:'Saint Michael',base:false,ceilingRequirement:{yellow: 1000, red: 338, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PASA',name:'Savoonga',base:false,ceilingRequirement:{yellow: 1000, red: 520, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PFSH',name:'Shaktoolik',base:false,ceilingRequirement:{yellow: 1000, red: 271, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PASH',name:'Shishmaref',base:false,ceilingRequirement:{yellow: 1000, red: 420, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'WBB',name:'Stebbins',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PATE',name:'Teller',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAIW',name:'Wales',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAWM',name:'White Mountain',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAFM',name:'Ambler',base:false,ceilingRequirement:{yellow: 1000, red: 498, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PABL',name:'Buckland',base:false,ceilingRequirement:{yellow: 1000, red: 480, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PADE',name:'Deering',base:false,ceilingRequirement:{yellow: 1000, red: 275, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAIK',name:'Kiana',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAVL',name:'Kivalina',base:false,ceilingRequirement:{yellow: 1000, red: 380, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAOB',name:'Kobuk',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAWN',name:'Noatak',base:false,ceilingRequirement:{yellow: 2000, red: 1100, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 2, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PFNO',name:'Noorvik',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAPO',name:'Point Hope',base:false,ceilingRequirement:{yellow: 1000, red: 269, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PASK',name:'Selawik',base:false,ceilingRequirement:{yellow: 1000, red: 420, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PAGH',name:'Shungnak',base:false,ceilingRequirement:{yellow: 1000, red: 480, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PATC',name:'Tin City',base:false,ceilingRequirement:{yellow: 1000, red: 500, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 1, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PALU',name:'Cape Lisburne',base:false,ceilingRequirement:{yellow: 1000, red: 1000, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 2, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    },
    {icao:'PADG',name:'Red Dog',base:false,ceilingRequirement:{yellow: 1000, red: 1000, ifr: 500, night: 1000},
      forecastRequirement:null,runwayCondition:1,visibilityRequirement:{yellow: 3, red: 2, ifr: 1, night: 2},
      windRequirement:{level1: 35, level15: 30}
    }
  ]
};
