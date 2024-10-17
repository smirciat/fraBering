'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Airplane', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    registration: DataTypes.STRING,
    airplaneType: DataTypes.STRING,
    aircraftType: DataTypes.STRING,
    status: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  });
}
