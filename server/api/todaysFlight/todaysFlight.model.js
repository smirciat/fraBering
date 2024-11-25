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
    base: DataTypes.STRING,
    status: DataTypes.STRING,
    json: DataTypes.JSONB,
    color: DataTypes.STRING,
    airportObjs: DataTypes.JSONB,
    colorPatch: DataTypes.STRING
  });
}
