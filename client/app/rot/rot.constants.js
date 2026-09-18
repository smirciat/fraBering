'use strict';

angular.module('workspaceApp')
  .constant('rotAppConfig', {
    /** #45 — left of BasicIndoc on Records exp summary table */
    certDocSummaryColumns: [
      {key: 'medical', label: 'Medical', historyField: 'medicalExp'},
      {key: 'passport', label: 'Passport', historyField: 'passport'}
    ],
    trainingEventKeys: [
      'BasicIndoc', 'Hazmat', 'far299', 'far293a', 'far297', 'far297g',
      'C208PIC', 'C208TKS', 'C208Ground', 'C208GOS',
      'B190PIC', 'B190SIC', 'B190Ground', 'B190GOS',
      'BE20PIC', 'BE20Ground', 'BE20GOS',
      'C408PIC', 'C408SIC', 'C408Ground', 'C408GOS',
      'C212PIC', 'C212SIC', 'C212Ground', 'C212GOS',
      'CheckAirmanObs', 'FlightInstructorObs'
    ],
    trainingEvents: [
      {name: 'BasicIndoc', label: 'Basic Indoctrination', frequency: '12'},
      {name: 'far293a', frequency: '12', label: '293(a) 1,4-8'},
      {name: 'Hazmat', frequency: '24', label: 'Hazmat'},
      {name: 'C208Ground', frequency: '12', label: 'Caravan Ground Training'},
      {name: 'C208TKS', frequency: '12', label: 'Caravan TKS Icing Course'},
      {name: 'BE20Ground', frequency: '12', label: 'King Air 200 Ground Training'},
      {name: 'B190Ground', frequency: '12', label: 'Beech 1900 Ground Training'},
      {name: 'C212Ground', frequency: '12', label: 'Casa 212 Ground Training'},
      {name: 'C408Ground', frequency: '12', label: 'C408 Sky Courier Ground Training'},
      {name: 'far297', frequency: '6', label: '297 Instrument Proficiency Check'},
      {name: 'far297g', frequency: '12', label: '297G Autopilot Check'},
      {name: 'far299', frequency: '12', label: '299 Route Check'},
      {name: 'C208PIC', frequency: '12', label: 'Caravan PIC Checkride'},
      {name: 'BE20PIC', frequency: '12', label: 'King Air 200 PIC Checkride'},
      {name: 'B190PIC', frequency: '12', label: 'Beech 1900 PIC Checkride'},
      {name: 'B190SIC', frequency: '12', label: 'Beech 1900 SIC Checkride'},
      {name: 'C212PIC', frequency: '12', label: 'Casa 212 PIC Checkride'},
      {name: 'C212SIC', frequency: '12', label: 'Casa 212 SIC Checkride'},
      {name: 'C408PIC', frequency: '12', label: 'C408 Sky Courier PIC Checkride'},
      {name: 'C408SIC', frequency: '12', label: 'C408 Sky Courier SIC Checkride'},
      {name: 'CheckAirmanObs', frequency: '24', label: 'Check Airman Observation'},
      {name: 'FlightInstructorObs', frequency: '24', label: 'Flight Instructor Observation'}
    ],
    // #52 — training type picker (records radio modal); same event names as trainingEventKeys
    trainingSelectionSections: [
      {
        title: 'Ground',
        rows: [
          {
            type: 'group',
            label: 'Basic Indoc',
            children: [
              {name: 'BasicIndoc', label: 'BI'}
            ]
          },
          {name: 'Hazmat', label: 'Hazmat'},
          {
            type: 'group',
            label: 'Caravan (208)',
            children: [
              {name: 'C208Ground', label: 'Ground'},
              {name: 'C208TKS', label: 'TKS Icing'}
            ]
          },
          {
            type: 'group',
            label: 'King Air 200',
            children: [
              {name: 'BE20Ground', label: 'Ground'}
            ]
          },
          {
            type: 'group',
            label: 'Beech 1900',
            children: [
              {name: 'B190Ground', label: 'Ground'}
            ]
          },
          {
            type: 'group',
            label: 'Casa 212',
            children: [
              {name: 'C212Ground', label: 'Ground'}
            ]
          },
          {
            type: 'group',
            label: 'C408 Sky Courier',
            children: [
              {name: 'C408Ground', label: 'Ground'}
            ]
          }
        ]
      },
      {
        title: 'Flight',
        rows: [
          {name: 'far297', label: '297 Instrument Proficiency Check'},
          {name: 'far297g', label: '297G Autopilot Check'},
          {name: 'far299', label: '299 Route Check'},
          {
            type: 'group',
            label: '293(b) — Caravan (208)',
            children: [
              {name: 'C208PIC', label: 'PIC'}
            ]
          },
          {
            type: 'group',
            label: '293(b) — King Air 200',
            children: [
              {name: 'BE20PIC', label: 'PIC'}
            ]
          },
          {
            type: 'group',
            label: '293(b) — Beech 1900',
            children: [
              {name: 'B190PIC', label: 'PIC'},
              {name: 'B190SIC', label: 'SIC'}
            ]
          },
          {
            type: 'group',
            label: '293(b) — Casa 212',
            children: [
              {name: 'C212PIC', label: 'PIC'},
              {name: 'C212SIC', label: 'SIC'}
            ]
          },
          {
            type: 'group',
            label: '293(b) — C408 Sky Courier',
            children: [
              {name: 'C408PIC', label: 'PIC'},
              {name: 'C408SIC', label: 'SIC'}
            ]
          },
          {name: 'CheckAirmanObs', label: 'Check Airman Observation'},
          {name: 'FlightInstructorObs', label: 'Flight Instructor Observation'}
        ]
      }
    ],
    // #47 — nested options when a parent training type is checked (modal only)
    trainingSelectionLinks: {
      BasicIndoc: [
        {name: 'far293a', label: 'General Emergency (293(a) 1,4-8)', defaultChecked: false}
      ],
      C208Ground: [
        {name: 'C208GOS', label: 'GOS', defaultChecked: true}
      ],
      BE20Ground: [
        {name: 'BE20GOS', label: 'GOS', defaultChecked: true}
      ],
      B190Ground: [
        {name: 'B190GOS', label: 'GOS', defaultChecked: true}
      ],
      C212Ground: [
        {name: 'C212GOS', label: 'GOS', defaultChecked: true}
      ],
      C408Ground: [
        {name: 'C408GOS', label: 'GOS', defaultChecked: true}
      ]
    }
  });
