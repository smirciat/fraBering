'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Reservation', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    flightNumber: DataTypes.STRING,
    date: DataTypes.DATE,
    name: DataTypes.STRING,
    passengerFreightMail: {
      type: DataTypes.STRING,
      defaultValue: 'passenger',
      allowNull: false
    },
    reserved: DataTypes.DATE,
    updated: DataTypes.DATE,
    weight: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    baggage: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    depart: DataTypes.STRING,
    arrive: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    ticketNumber: DataTypes.STRING,
    goldPointsMember: DataTypes.STRING,
    assignedSeat: DataTypes.STRING
  });
}
