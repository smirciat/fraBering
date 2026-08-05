'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('RosterScheduleCell', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    base: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    monthKey: {
      type: DataTypes.STRING(7),
      allowNull: false
    },
    rosterId: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    day: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    updatedAt: DataTypes.DATE
  }, {
    indexes: [
      {
        unique: true,
        fields: ['base', 'monthKey', 'rosterId', 'day']
      },
      {
        fields: ['monthKey', 'base']
      }
    ]
  });
}
