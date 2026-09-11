'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FdrYearSettings', {
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    hoursLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    lockedAt: DataTypes.DATE,
    lockedBy: DataTypes.STRING
  });
}
