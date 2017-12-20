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
    icao: DataTypes.STRING,
    base: {
      type:DataTypes.BOOLEAN,
      defaultValue:false
    },
    visibilityRequirement: DataTypes.JSON,
    ceilingRequirement: DataTypes.JSON,
    windRequirement: DataTypes.JSON,
    runwayCondition: DataTypes.INTEGER,
    forecastRequirement: DataTypes.JSON
  });
}
