'use strict';

/**
 * Patch RosterEmployees when the table was created from an earlier model revision.
 * sequelize.sync() does not add columns to existing tables.
 */
export async function ensureRosterEmployeeSchema(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'RosterEmployees';
  let description = null;
  try {
    description = await queryInterface.describeTable(tableName);
  } catch (err) {
    return;
  }
  if (!description) return;

  const { Sequelize } = sequelize;
  const DataTypes = Sequelize.DataTypes;

  if (!description.lastImportedAt) {
    await queryInterface.addColumn(tableName, 'lastImportedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }

  const acroColumn = description.acroRosterId ? 'acroRosterId' :
    (description.acrorosterEmployeeId ? 'acrorosterEmployeeId' : null);
  if (acroColumn) {
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS roster_employees_base_acro_roster_id ` +
      `ON "RosterEmployees" ("base", "${acroColumn}")`
    );
  }
}
