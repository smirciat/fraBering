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
    airports: DataTypes.ARRAY(DataTypes.STRING),
    metars:DataTypes.ARRAY(DataTypes.STRING),
    tafs: DataTypes.ARRAY(DataTypes.STRING),
    visibilities:DataTypes.ARRAY(DataTypes.DECIMAL),
    ceilings:DataTypes.ARRAY(DataTypes.DECIMAL),
    windDirections:DataTypes.ARRAY(DataTypes.DECIMAL),
    windGusts:DataTypes.ARRAY(DataTypes.DECIMAL),
    runwayConditions:DataTypes.ARRAY(DataTypes.DECIMAL),
    result:DataTypes.STRING,
    freezingPrecipitations:DataTypes.ARRAY(DataTypes.BOOLEAN)
  });
}
