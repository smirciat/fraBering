'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Calendar', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    date: DataTypes.STRING,
    dateObj: DataTypes.DATE,
    day: DataTypes.INTEGER,
    availablePilots: DataTypes.JSONB,
    availableAricraft: DataTypes.JSONB,
    availableFlightNumbers: DataTypes.JSONB,
    assignedFlights: DataTypes.JSONB,
    info: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  });
}
