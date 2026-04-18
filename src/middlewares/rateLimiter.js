const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const env = require('../config/env');
const { getRedisClient } = require('../config/redis');

function buildStoreIfAvailable() {
  const redisClient = getRedisClient();
  if (!redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

function createLimiter({ windowMs, max, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStoreIfAvailable(),
    keyGenerator,
  });
}

const globalLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
});

const loginLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.loginMaxRequests,
  keyGenerator: (req) => `${req.ip}:login`,
});

const aiLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.aiMaxRequests,
  keyGenerator: (req) => `${req.user?.id || req.ip}:ai`,
});

const userLimiter = createLimiter({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
});

module.exports = {
  globalLimiter,
  loginLimiter,
  aiLimiter,
  userLimiter,
};
