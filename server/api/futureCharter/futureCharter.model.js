'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('FutureCharter', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true
    },
    aircraft: DataTypes.STRING,
    date: DataTypes.DATE,
    dateString: DataTypes.STRING,
    flightId: {
      type: DataTypes.STRING,
      allowNull:false,
      primaryKey:true,
      unique: true
    },
    flight: DataTypes.JSONB
  });
}
