'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Assessment', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    pilot: DataTypes.STRING,
    level: DataTypes.STRING,
    date: DataTypes.DATE,
    flight: DataTypes.STRING,
    equipment: DataTypes.STRING,
    color: DataTypes.ARRAY(DataTypes.STRING),
    airports: DataTypes.ARRAY(DataTypes.STRING),
    metars:DataTypes.ARRAY(DataTypes.STRING),
    tafs: DataTypes.ARRAY(DataTypes.STRING),
    visibilities:DataTypes.ARRAY(DataTypes.STRING),
    ceilings:DataTypes.ARRAY(DataTypes.STRING),
    windDirections:DataTypes.ARRAY(DataTypes.STRING),
    windGusts:DataTypes.ARRAY(DataTypes.STRING),
    departTimes:DataTypes.ARRAY(DataTypes.TIME),
    runwayConditions:DataTypes.ARRAY(DataTypes.DECIMAL),
    result:DataTypes.STRING,
    freezingPrecipitations:DataTypes.ARRAY(DataTypes.BOOLEAN)
  });
}
