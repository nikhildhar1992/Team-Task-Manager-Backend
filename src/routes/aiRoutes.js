const express = require('express');
const aiController = require('../controllers/aiController');
const authenticate = require('../middlewares/authMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { aiLimiter } = require('../middlewares/rateLimiter');
const { generateTasksSchema, orchestrateSchema } = require('../validators/aiValidators');

const router = express.Router();

router.post(
  '/generate-tasks',
  authenticate,
  aiLimiter,
  validate({ body: generateTasksSchema }),
  asyncHandler(aiController.generateTasks),
);

router.post(
  '/orchestrate',
  authenticate,
  aiLimiter,
  validate({ body: orchestrateSchema }),
  asyncHandler(aiController.orchestrate),
);

module.exports = router;
