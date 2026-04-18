const { createApp } = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initRedis, closeRedis } = require('./config/redis');
const { closeMySql } = require('./config/mysql');

const app = createApp();

let server;

async function startServer() {
  await initRedis();

  server = app.listen(env.port, () => {
    logger.info({ port: env.port }, 'api_server_started');
  });
}

async function shutdown(signal) {
  logger.info({ signal }, 'graceful_shutdown_started');

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await Promise.allSettled([closeRedis(), closeMySql()]);
  logger.info('graceful_shutdown_completed');
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.error({ err: error }, 'shutdown_failed');
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.error({ err: error }, 'shutdown_failed');
    process.exit(1);
  });
});

startServer().catch((error) => {
  logger.error({ err: error }, 'api_server_start_failed');
  process.exit(1);
});
