'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrPilot', {
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
    section: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pilotName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    employeeId: DataTypes.STRING
  }, {
    indexes: [
      {unique: true, fields: ['year', 'pilotName']},
      {fields: ['year', 'section']}
    ]
  });
}
