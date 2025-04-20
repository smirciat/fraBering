'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Signature', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    comment: DataTypes.STRING,
    knownIce:DataTypes.BOOLEAN,
    ocRelease:DataTypes.STRING,
    mitigation:DataTypes.STRING,
    pilotAgree:DataTypes.STRING,
    dispatchRelease:DataTypes.STRING,
    releaseTimestamp:DataTypes.DATE,
    ocReleaseTimestamp:DataTypes.DATE,
    dispatchReleaseTimestamp:DataTypes.DATE,
    date:DataTypes.STRING,
    flightNum:DataTypes.STRING,
    updated:DataTypes.DATE,
    updatedBy:DataTypes.STRING
  });
}
