const fs = require('fs/promises');
const path = require('path');
const { getPool } = require('../config/mysql');
const logger = require('../utils/logger');

async function runMigration() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.query(sql);
    logger.info('database_migration_completed');
  } finally {
    connection.release();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'database_migration_failed');
    process.exit(1);
  });
