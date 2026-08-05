'use strict';

export default function(sequelize, DataTypes) {
  return sequelize.define('RosterEmployee', {
    _id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      primaryKey: true
    },
    base: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    displayName: DataTypes.STRING(255),
    employeeNumber: DataTypes.STRING(64),
    qualifications: DataTypes.STRING(255),
    jobCategory: DataTypes.STRING(64),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    acrorosterEmployeeId: {
      type: DataTypes.STRING(64),
      field: 'acroRosterId'
    },
    importedFrom: {
      type: DataTypes.STRING(32),
      field: 'source'
    },
    lastImportedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    indexes: [
      {
        fields: ['base']
      },
      {
        fields: ['displayName']
      }
    ]
  });
}
