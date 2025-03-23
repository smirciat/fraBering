'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('AirportRequirement', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    threeLetter: DataTypes.STRING,
    icao: DataTypes.STRING,
    base: {
      type:DataTypes.BOOLEAN,
      defaultValue:false
    },
    baseGroup: DataTypes.STRING,
    comment: DataTypes.STRING,
    signature: DataTypes.STRING,
    timestamp: DataTypes.DATE,
    runways: DataTypes.ARRAY(DataTypes.INTEGER),
    runwayScore: {
      type: DataTypes.STRING,
      defaultValue:"5"
    },
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    visibilityRequirement: {
      type:DataTypes.JSON,
      defaultValue:{"red":0.5,"yellow":3,"ifr":2,"night":5}
    },
    ceilingRequirement: {
      type:DataTypes.JSON,
      defaultValue:{"red":200,"yellow":2000,"ifr":1000,"night":3000}
    },
    windRequirement: {
      type:DataTypes.JSON,
      defaultValue:{"level1":35,"level15":30}
    },
    specialWind: {
      type:DataTypes.JSON,
      defaultValue:{}
    },
    runwayCondition: {
      type:DataTypes.INTEGER,
      defaultValue:1
    },
    forecastRequirement: DataTypes.JSON,
    currentMetar: DataTypes.STRING,
    metarObj: DataTypes.JSONB,
    currentTaf: DataTypes.STRING,
    currentTafObject: DataTypes.JSONB,
    nonPilot:DataTypes.BOOLEAN,
    closed:DataTypes.BOOLEAN,
    depth:DataTypes.STRING,
    contaminent:DataTypes.STRING,
    percent:DataTypes.STRING,
    openClosed:DataTypes.STRING,
    officialSource:DataTypes.STRING,
    unOfficialSource:DataTypes.STRING,
    manualObs:DataTypes.JSONB,
    manualTimestamp:DataTypes.DATE
  });
}
