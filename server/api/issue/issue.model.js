'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Issue', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'bug'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'open'
    },
    developerApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reporterName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reporterUserId: DataTypes.INTEGER
  });
}
