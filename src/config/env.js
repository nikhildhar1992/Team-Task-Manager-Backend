const dotenv = require('dotenv');

dotenv.config();

const accessTokenTtlMinutes = Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15);
const refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 3000),
  appName: process.env.APP_NAME || 'team-task-manager-backend',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins,
  maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '1mb',
  accessTokenTtlMinutes,
  refreshTokenTtlDays,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'task_manager',
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
  },
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 60),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX || 300),
    loginMaxRequests: Number(process.env.RATE_LIMIT_LOGIN_MAX || 20),
    aiMaxRequests: Number(process.env.RATE_LIMIT_AI_MAX || 10),
  },
  loginEmail: 'nikhildhar92@gmail.com',
  loginPassword: process.env.LOGINPASSWORD || '',
};

env.redis.url =
  env.redis.password && env.redis.password.trim().length > 0
    ? `redis://:${encodeURIComponent(env.redis.password)}@${env.redis.host}:${env.redis.port}`
    : `redis://${env.redis.host}:${env.redis.port}`;

module.exports = env;
