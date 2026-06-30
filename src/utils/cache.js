const logger = require('./logger');
const env = require('../config/env');
const { getRedisClient } = require('../config/redis');

async function getCache(key) {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn({ err: error, key }, 'cache_get_failed');
    return null;
  }
}

async function setCache(key, value, ttlSeconds = env.cacheTtlSeconds) {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    logger.warn({ err: error, key }, 'cache_set_failed');
  }
}

async function deleteByPrefix(prefix) {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.warn({ err: error, prefix }, 'cache_delete_prefix_failed');
  }
}

module.exports = {
  getCache,
  setCache,
  deleteByPrefix,
};
