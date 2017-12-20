'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('HazardReport', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    report: DataTypes.STRING,
    date: DataTypes.DATE,
    base: DataTypes.STRING
  });
}
