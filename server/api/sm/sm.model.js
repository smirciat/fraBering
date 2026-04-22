'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Sm', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    to: DataTypes.STRING,
    from: DataTypes.STRING,
    body: DataTypes.STRING,
    sent: DataTypes.DATE,
    mediaUrl: DataTypes.STRING,
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false},
    autoSMS: {
      type: DataTypes.BOOLEAN,
      defaultValue: false}
  });
}
