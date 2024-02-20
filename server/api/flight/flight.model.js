'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Flight', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    flightNum: DataTypes.STRING,
    daysOfWeek: DataTypes.ARRAY(DataTypes.INTEGER),
    airports: DataTypes.ARRAY(DataTypes.STRING),
    departTimes: DataTypes.ARRAY(DataTypes.TIME)
  });
}
