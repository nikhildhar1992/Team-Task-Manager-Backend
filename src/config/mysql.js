const mysql = require('mysql2/promise');
const env = require('./env');
const logger = require('../utils/logger');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      connectionLimit: env.mysql.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function withTransaction(handler) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function checkMySqlHealth() {
  try {
    await query('SELECT 1 AS ok');
    return { ok: true };
  } catch (error) {
    logger.warn({ err: error }, 'mysql_health_failed');
    return { ok: false, error: error.message };
  }
}

async function closeMySql() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  withTransaction,
  checkMySqlHealth,
  closeMySql,
};
