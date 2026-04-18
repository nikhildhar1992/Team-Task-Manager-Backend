const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof ApiError ? err.message : 'Internal server error';

  logger.error(
    {
      err,
      statusCode,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      requestId: req.id,
    },
    'request_failed',
  );

  const payload = {
    success: false,
    message,
  };

  if (err instanceof ApiError && err.details) {
    payload.details = err.details;
  }

  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
