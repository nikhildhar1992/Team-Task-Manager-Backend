const express = require('express');
const userController = require('../controllers/userController');
const asyncHandler = require('../middlewares/asyncHandler');
const authenticate = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { searchUsersQuerySchema } = require('../validators/userValidators');

const router = express.Router();

router.use(authenticate);

router.get('/search', validate({ query: searchUsersQuerySchema }), asyncHandler(userController.searchUsers));

module.exports = router;
