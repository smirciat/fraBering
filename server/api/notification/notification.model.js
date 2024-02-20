'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Notification', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    creator: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    title: DataTypes.STRING,
    archived: DataTypes.BOOLEAN,
    notification: DataTypes.STRING,
    notified: DataTypes.ARRAY(DataTypes.STRING)
  });
}
