'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrComputedDuty', {
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
    daysOff: DataTypes.INTEGER,
    claimedCount: DataTypes.INTEGER,
    syncedAt: DataTypes.DATE,
    syncedBy: DataTypes.STRING,
    source: {
      type: DataTypes.STRING,
      defaultValue: 'union'
    }
  }, {
    indexes: [
      {unique: true, fields: ['year', 'pilotName', 'month']}
    ]
  });
}
