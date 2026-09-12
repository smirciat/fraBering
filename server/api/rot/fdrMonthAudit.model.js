'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrMonthAudit', {
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
    hoursAuditedAt: DataTypes.DATE,
    hoursAuditedBy: DataTypes.STRING,
    hoursAuditNote: DataTypes.TEXT,
    dutyAuditedAt: DataTypes.DATE,
    dutyAuditedBy: DataTypes.STRING,
    dutyAuditNote: DataTypes.TEXT
  }, {
    indexes: [
      {unique: true, fields: ['year', 'pilotName', 'month']}
    ]
  });
}
