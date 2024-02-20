'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Timesheet', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    timeIn: DataTypes.DATE,
    timeOut: DataTypes.DATE,
    regularHours: {
      type: DataTypes.DOUBLE,
      defaultValue:0
    },
    otHours: {
      type: DataTypes.DOUBLE,
      defaultValue:0
    },
    uid: DataTypes.INTEGER,
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fourTens: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  });
}