const pino = require('pino');
const env = require('../config/env');

const logger = pino({
  name: env.appName,
  level: env.logLevel,
  transport: env.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      },
});

module.exports = logger;
