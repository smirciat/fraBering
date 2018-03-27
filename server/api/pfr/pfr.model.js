'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('Pfr', {
    _id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    operatingWeightEmpty: DataTypes.INTEGER,
    fuelWeights: DataTypes.ARRAY(DataTypes.INTEGER),
    payloadWeights: DataTypes.ARRAY(DataTypes.INTEGER),
    centersOfGravity: DataTypes.ARRAY(DataTypes.DECIMAL)
  });
}
