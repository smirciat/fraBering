'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Monitor', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    pilot: DataTypes.STRING,
    airport: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    watchedThreshold: DataTypes.STRING,
    watchedParameter: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN ,
      defaultValue: true
    }
  });
}
