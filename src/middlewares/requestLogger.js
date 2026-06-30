const pinoHttp = require('pino-http');
const logger = require('../utils/logger');

const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || undefined,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `request_completed ${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `request_failed ${req.method} ${req.url} ${res.statusCode} ${err.message}`,
});

module.exports = requestLogger;
