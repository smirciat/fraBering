'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('RosterCalendarRequest', {
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
    rosterId: DataTypes.STRING(128),
    personName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    personKey: DataTypes.STRING(255),
    day: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    requestType: DataTypes.STRING(32),
    label: DataTypes.STRING(16),
    type: DataTypes.STRING(32),
    status: DataTypes.STRING(32),
    source: DataTypes.STRING(32),
    requestedBy: DataTypes.STRING(255),
    reviewedBy: DataTypes.STRING(255),
    updatedAt: DataTypes.DATE
  }, {
    indexes: [
      {
        unique: true,
        fields: ['base', 'monthKey', 'personKey', 'day']
      },
      {
        fields: ['monthKey', 'base']
      },
      {
        fields: ['monthKey', 'base', 'rosterId']
      },
      {
        fields: ['monthKey', 'base', 'personKey']
      }
    ]
  });
}
