'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrDaysOff', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pilotName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    daysOff: DataTypes.INTEGER,
    updatedBy: DataTypes.STRING
  }, {
    indexes: [
      {unique: true, fields: ['year', 'pilotName', 'month']}
    ]
  });
}
