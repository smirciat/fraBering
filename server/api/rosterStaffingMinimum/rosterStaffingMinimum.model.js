'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('RosterStaffingMinimum', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    sectionType: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    base: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(16),
      allowNull: false
    },
    weekday: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0
    },
    weekend: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0
    },
    updatedAt: DataTypes.DATE,
    updatedBy: DataTypes.STRING(255)
  }, {
    indexes: [
      {
        unique: true,
        fields: ['sectionType', 'base', 'code']
      }
    ]
  });
}
