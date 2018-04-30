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
    baseGroup: DataTypes.STRING,
    runways: DataTypes.ARRAY(DataTypes.INTEGER),
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
    runwayCondition: {
      type:DataTypes.INTEGER,
      defaultValue:1
    },
    forecastRequirement: DataTypes.JSON
  });
}
