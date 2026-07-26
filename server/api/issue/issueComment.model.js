'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('IssueComment', {
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
    authorName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    authorUserId: DataTypes.INTEGER,
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  });
}
