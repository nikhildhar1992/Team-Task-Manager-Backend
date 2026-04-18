const express = require('express');
const healthController = require('../controllers/healthController');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(healthController.basicHealth));
router.get('/full', asyncHandler(healthController.fullHealth));

module.exports = router;
