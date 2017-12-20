'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Pilot', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    level: DataTypes.STRING,
    active: {
      type:DataTypes.BOOLEAN,
      defaultValue:true
    }
  });
}
