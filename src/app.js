const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const xssClean = require('xss-clean');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const env = require('./config/env');
const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const { globalLimiter } = require('./middlewares/rateLimiter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const openApiDoc = YAML.load(`${__dirname}/docs/openapi.yaml`);

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(globalLimiter);
  app.use(express.json({ limit: env.maxPayloadSize }));
  app.use(express.urlencoded({ extended: true, limit: env.maxPayloadSize }));
  app.use(xssClean());

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
