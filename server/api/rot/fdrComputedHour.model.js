'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrComputedHour', {
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
    employeeId: DataTypes.STRING,
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    hours: DataTypes.DOUBLE,
    syncedAt: DataTypes.DATE,
    syncedBy: DataTypes.STRING
  }, {
    indexes: [
      {unique: true, fields: ['year', 'pilotName', 'month']}
    ]
  });
}
