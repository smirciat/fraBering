'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('IssueAttachment', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    issueId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    storedName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'application/octet-stream'
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  });
}
