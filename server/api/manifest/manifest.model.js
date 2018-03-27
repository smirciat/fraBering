'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Manifest', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    pilot: DataTypes.STRING,
    secondPilot: DataTypes.STRING,
    aircraft: DataTypes.STRING,
    flightNumber: DataTypes.STRING,
    date: DataTypes.DATE,
    departures: DataTypes.ARRAY(DataTypes.STRING),
    depattureTimes: DataTypes.ARRAY(DataTypes.DATE),
    arrivals: DataTypes.ARRAY(DataTypes.STRING),
    arrivalTimes: DataTypes.ARRAY(DataTypes.DATE)
  });
}
