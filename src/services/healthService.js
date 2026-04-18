const { checkMySqlHealth } = require('../config/mysql');
const { checkRedisHealth } = require('../config/redis');

async function getBasicHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

async function getFullHealth() {
  const [mysql, redis] = await Promise.all([checkMySqlHealth(), checkRedisHealth()]);

  return {
    status: mysql.ok && redis.ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      mysql,
      redis,
    },
  };
}

module.exports = {
  getBasicHealth,
  getFullHealth,
};
