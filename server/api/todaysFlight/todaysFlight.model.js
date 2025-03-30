'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('TodaysFlight', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    active: {
      type: DataTypes.STRING,
      defaultValue: 'true'
    },
    date: DataTypes.STRING,
    pilot: DataTypes.STRING,
    coPilot: DataTypes.STRING,
    aircraft: DataTypes.STRING,
    flightNum: DataTypes.STRING,
    flightId: {
      type:DataTypes.STRING,
      unique:true
    },
    daysOfWeek: DataTypes.ARRAY(DataTypes.INTEGER),
    airports: DataTypes.ARRAY(DataTypes.STRING),
    departTimes: DataTypes.ARRAY(DataTypes.TIME),
    departTimesZulu: DataTypes.JSONB,
    base: DataTypes.STRING,
    status: DataTypes.STRING,
    json: DataTypes.JSONB,
    color: DataTypes.STRING,
    airportObjs: DataTypes.JSONB,
    airportObjsLocked: DataTypes.JSONB,
    runScroll:DataTypes.BOOLEAN,
    colorPatch: DataTypes.STRING,
    colorLock: DataTypes.STRING,
    flightStatus: DataTypes.STRING,
    knownIce:DataTypes.BOOLEAN,
    ocRelease:DataTypes.STRING,
    mitigation:DataTypes.STRING,
    pilotAgree:DataTypes.STRING,
    dispatchRelease:DataTypes.STRING,
    releaseTimestamp:DataTypes.DATE,
    ocReleaseTimestamp:DataTypes.DATE,
    dispatchReleaseTimestamp:DataTypes.DATE,
    pfr:DataTypes.JSONB,
    fuelTotalTaxi:DataTypes.STRING,
    fuelPreviouslyOnboard:DataTypes.STRING,
    autoOnboard:DataTypes.STRING,
    mel:DataTypes.STRING,
    other:DataTypes.STRING,
    pilotComment:DataTypes.STRING,
    coPilotComment:DataTypes.STRING,
    security:DataTypes.STRING,
    otherEnvironment:DataTypes.STRING,
    taxiFuel:DataTypes.STRING,
    enrouteChanges:DataTypes.STRING,
    equipment:DataTypes.JSONB,
    alternate:DataTypes.STRING
  });
}
