const express = require('express');
const authController = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));
router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post(
  '/refresh',
  validate({ body: refreshSchema.partial().optional() }),
  asyncHandler(authController.refresh),
);
router.post(
  '/logout',
  validate({ body: refreshSchema.partial().optional() }),
  asyncHandler(authController.logout),
);

module.exports = router;
