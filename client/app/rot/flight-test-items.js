'use strict';

/**
 * Flight Test F.3 items 1–44. pdfField names match FlightTest.pdf.
 * Required flags: form suffixes (PIC / ME / SE / 297) plus 8900.1 Table 3-70 /
 * N 8900.685 (holding not default-W; non-instrument INST. PROF. items only
 * when the check also meets §135.293). Nate/PTP may override.
 */
(function() {

  var ITEMS = [
    {n: 1, pdfField: '1  Equipment Examination Oral Written', label: 'Equipment Examination Oral/Written', tags: ['core']},
    {n: 2, pdfField: '2  Preflight Inspection', label: 'Preflight Inspection', tags: ['293']},
    {n: 3, pdfField: '3  Start Procedures', label: 'Start Procedures', tags: ['293']},
    {n: 4, pdfField: '4  TaxiRunway Ops', label: 'Taxi/Runway Ops', tags: ['293']},
    {n: 5, pdfField: '5  Pretakeoff Checks', label: 'Pretakeoff Checks', tags: ['293']},
    {n: 6, pdfField: '6  Normal', label: 'Takeoff — Normal', tags: ['293']},
    {n: 7, pdfField: '7  Crosswind', label: 'Takeoff — Crosswind', tags: ['293']},
    {n: 8, pdfField: '8  Instrument Lower Than Std CO57 PIC only', label: 'Takeoff — Instrument (CO57, PIC)', tags: ['293', 'PIC']},
    {n: 9, pdfField: '9  With powerplant failure ME only', label: 'Takeoff — Powerplant Failure (ME)', tags: ['293', 'ME']},
    {n: 10, pdfField: '10 Rejected ME PIC only', label: 'Rejected Takeoff (ME, PIC)', tags: ['293', 'ME', 'PIC']},
    {n: 11, pdfField: '11 Short Field 293 SE only', label: 'Takeoff — Short Field (SE, 293)', tags: ['293', 'SE']},
    {n: 12, pdfField: '12 Steep Turns  PIC only', label: 'Steep Turns (PIC)', tags: ['293', 'PIC']},
    {n: 13, pdfField: '13 Stall Recognition and Recovery PIC only', label: 'Stall Recognition and Recovery (PIC)', tags: ['293', 'PIC']},
    {n: 14, pdfField: '14 Powerplant Failure PIC only', label: 'Inflight Powerplant Failure (PIC)', tags: ['293', 'PIC']},
    {n: 15, pdfField: '15 Normal', label: 'Landing — Normal', tags: ['293']},
    {n: 16, pdfField: '16 Crosswind', label: 'Landing — Crosswind', tags: ['293']},
    {n: 17, pdfField: '17 With simulated Powerplant Failure ME only', label: 'Landing — Simulated Powerplant Failure (ME)', tags: ['293', 'ME']},
    {n: 18, pdfField: '18 From An ILS 297 only', label: 'Landing from an ILS (297)', tags: ['297']},
    {n: 19, pdfField: '19 Rejected 297 only', label: 'Rejected Landing (297)', tags: ['297']},
    {n: 20, pdfField: '20 From a Circling Approach 297 only', label: 'Landing from a Circling Approach (297)', tags: ['297']},
    {n: 21, pdfField: '21 Short Field SE PIC only', label: 'Landing — Short Field (SE, PIC)', tags: ['293', 'SE', 'PIC']},
    {n: 22, pdfField: '22 No Flap Approach NA C208PA31 PIC only', label: 'No-Flap Approach (PIC; NA C208)', tags: ['293', 'PIC'], naOn: 'C208'},
    {n: 23, pdfField: '23 System Malfunction', label: 'System Malfunction', tags: ['293']},
    {n: 24, pdfField: '24 Emergency Landing SE only', label: 'Emergency Landing (SE)', tags: ['293', 'SE']},
    {n: 25, pdfField: '25 Maneuver By Partial Panel', label: 'Maneuver by Partial Panel', tags: ['297']},
    {n: 26, pdfField: '26 Unusual Attitude Recovery', label: 'Unusual Attitude Recovery', tags: ['297']},
    {n: 27, pdfField: '27 AbnormalEmergency Procedures', label: 'Abnormal/Emergency Procedures', tags: ['293']},
    {n: 28, pdfField: '28 Area Departure  297 only Do not Waive if 299', label: 'Area Departure (297)', tags: ['297']},
    {n: 29, pdfField: '29 Holding  297 only', label: 'Holding (297; not waivable on IPC)', tags: ['297'], noDefaultW: true},
    {n: 30, pdfField: '30 Area Arrival  297 only Do not Waive if 299', label: 'Area Arrival (297)', tags: ['297']},
    {n: 31, pdfField: '31 Normal ILS EngineOut ILS can substitute', label: 'Normal ILS', tags: ['297', '293']},
    {n: 32, pdfField: '32 EngineOut ILS ME PIC only', label: 'Engine-Out ILS (ME, PIC)', tags: ['297', 'ME', 'PIC']},
    {n: 33, pdfField: '33 Coupled ILS PIC only', label: 'Coupled ILS (PIC)', tags: ['297', 'PIC']},
    {n: 34, pdfField: '34 RNAV MINIMA SELECT', label: 'RNAV Minima', tags: ['297']},
    {n: 35, pdfField: '35 2nd NonPrecision SELECT 297 only', label: '2nd Non-Precision (297)', tags: ['297']},
    {n: 36, pdfField: '36 Circling Approach 297 only', label: 'Circling Approach (297)', tags: ['297']},
    {n: 37, pdfField: '37 Missed Approach from an ILS 297 only', label: 'Missed Approach from an ILS (297)', tags: ['297']},
    {n: 38, pdfField: '38 2nd Missed Approach 297 only', label: '2nd Missed Approach (297)', tags: ['297']},
    {n: 39, pdfField: '39 Use of Autopilot', label: 'Use of Autopilot', tags: ['297']},
    {n: 40, pdfField: '40 Judgment', label: 'Judgment', tags: ['core']},
    {n: 41, pdfField: '41 Crew Coordination', label: 'Crew Coordination', tags: ['core']},
    {n: 42, pdfField: '42 Communication  Briefing', label: 'Communication / Briefing', tags: ['core']},
    {n: 43, pdfField: '43 Checklist and Flow Procedures', label: 'Checklist and Flow Procedures', tags: ['core']},
    {n: 44, pdfField: '44 Situational Awareness and Navigation', label: 'Situational Awareness and Navigation', tags: ['core']}
  ];

  function truthy(v) {
    return v === true || v === 'true';
  }

  function context(record) {
    record = record || {};
    var pic = truthy(record.C208PIC) || truthy(record.C408PIC) || truthy(record.C212PIC) ||
      truthy(record.B190PIC) || truthy(record.BE20PIC);
    var sic = truthy(record.C408SIC) || truthy(record.C212SIC) || truthy(record.B190SIC);
    var ac = String(record.aircraft || '');
    var se = truthy(record.C208PIC) || ac.indexOf('C208') === 0;
    var me = truthy(record.B190PIC) || truthy(record.B190SIC) || truthy(record.C408PIC) ||
      truthy(record.C408SIC) || truthy(record.C212PIC) || truthy(record.C212SIC) || truthy(record.BE20PIC) ||
      ac.indexOf('B190') === 0 || ac.indexOf('C408') === 0 || ac.indexOf('C212') === 0 || ac.indexOf('BE20') === 0;
    var acCode = 'C208';
    if (truthy(record.B190PIC) || truthy(record.B190SIC) || ac.indexOf('B190') === 0) acCode = 'B190';
    else if (truthy(record.C408PIC) || truthy(record.C408SIC) || ac.indexOf('C408') === 0) acCode = 'C408';
    else if (truthy(record.C212PIC) || truthy(record.C212SIC) || ac.indexOf('C212') === 0) acCode = 'C212';
    else if (truthy(record.BE20PIC) || ac.indexOf('BE20') === 0) acCode = 'BE20';
    else if (se) acCode = 'C208';
    return {
      isPic: pic,
      isSic: sic && !pic,
      isSe: se && !me,
      isMe: me,
      has297: truthy(record.far297),
      has297g: truthy(record.far297g),
      has293: pic || sic,
      has299: truthy(record.far299),
      ac: acCode
    };
  }

  function hasTag(item, tag) {
    return item.tags && item.tags.indexOf(tag) >= 0;
  }

  function isRequired(item, ctx) {
    if (item.naOn && ctx.ac === item.naOn) return false;
    if (hasTag(item, 'PIC') && ctx.isSic) return false;
    if (hasTag(item, 'ME') && !ctx.isMe) return false;
    if (hasTag(item, 'SE') && !ctx.isSe) return false;
    var needs297 = hasTag(item, '297');
    var needs293 = hasTag(item, '293');
    var isCore = hasTag(item, 'core');
    if (isCore) return true;
    if (needs297 && needs293) return ctx.has297 || ctx.has297g || ctx.has293;
    if (needs297) return ctx.has297 || ctx.has297g;
    if (needs293) return ctx.has293;
    return ctx.has293 || ctx.has297 || ctx.has297g;
  }

  angular.module('workspaceApp')
    .constant('rotFlightTestItems', {
      grades: ['', 'S', 'W', 'U/S'],
      eventGrades: ['S', 'W', 'U/S'],
      items: ITEMS,
      context: context,
      requiredFor: function(record) {
        var ctx = context(record);
        if (!ctx.has293 && !ctx.has297 && !ctx.has297g && !ctx.has299) return [];
        return ITEMS.filter(function(item) { return isRequired(item, ctx); });
      },
      isItemRequired: function(item, record) {
        var ctx = context(record);
        if (!ctx.has293 && !ctx.has297 && !ctx.has297g && !ctx.has299) return false;
        return isRequired(item, ctx);
      },
      needsPopup: function(record) {
        var ctx = context(record);
        return !!(ctx.has293 || ctx.has297 || ctx.has297g);
      },
      pdfGrade: function(g) {
        if (g === 'U/S') return 'S';
        if (!g || g === '-') return '';
        return g;
      },
      rebuildRemarks: function(record) {
        var remarks = [];
        if (!record) return remarks;
        var items = record.flightTestItems || {};
        Object.keys(items).forEach(function(n) {
          if (items[n] === 'U/S') remarks.push('Event ' + n + ' retrained/Rechecked');
        });
        var er = record.eventResult || {};
        Object.keys(er).forEach(function(key) {
          if (er[key] === 'U/S') remarks.push(key + ' retrained/Rechecked');
        });
        record.remarks = remarks;
        return remarks;
      },
      seedGrades: function(record) {
        if (!record) return {};
        if (!record.flightTestItems || typeof record.flightTestItems !== 'object') record.flightTestItems = {};
        var keep = {};
        ITEMS.forEach(function(item) {
          var n = String(item.n);
          var cur = record.flightTestItems[n];
          if (cur === undefined || cur === null || cur === '') {
            keep[n] = isRequired(item, context(record)) ? 'S' : '-';
          } else {
            keep[n] = cur;
          }
        });
        record.flightTestItems = keep;
        this.rebuildRemarks(record);
        return record.flightTestItems;
      }
    });
})();
