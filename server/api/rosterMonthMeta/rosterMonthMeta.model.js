'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('RosterMonthMeta', {
    monthKey: {
      type: DataTypes.STRING(7),
      allowNull: false,
      primaryKey: true
    },
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lockedAt: DataTypes.DATE,
    lockedBy: DataTypes.STRING(255),
    updatedAt: DataTypes.DATE
  });
}
