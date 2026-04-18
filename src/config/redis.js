const { createClient } = require('redis');
const IORedis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let redisClient;

async function initRedis() {
  const client = createClient({ url: env.redis.url });

  client.on('error', (error) => {
    logger.warn({ err: error }, 'redis_client_error');
  });

  try {
    await client.connect();
    redisClient = client;
    logger.info('redis_connected');
    return redisClient;
  } catch (error) {
    logger.warn({ err: error }, 'redis_unavailable_failsafe_mode');
    redisClient = null;
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

function createBullConnection() {
  return new IORedis(env.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

async function checkRedisHealth() {
  if (!redisClient) {
    return { ok: false, error: 'Redis not connected' };
  }

  try {
    await redisClient.ping();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  createBullConnection,
  checkRedisHealth,
  closeRedis,
};
