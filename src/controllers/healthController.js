const healthService = require('../services/healthService');

async function basicHealth(_req, res) {
  const result = await healthService.getBasicHealth();
  res.status(200).json(result);
}

async function fullHealth(_req, res) {
  const result = await healthService.getFullHealth();
  const code = result.status === 'ok' ? 200 : 503;
  res.status(code).json(result);
}

module.exports = {
  basicHealth,
  fullHealth,
};
