const express = require('express');
const orderController = require('../controllers/orderController');
const authenticate = require('../middlewares/authMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { createOrderSchema, listOrdersQuerySchema } = require('../validators/orderValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', validate({ query: listOrdersQuerySchema }), asyncHandler(orderController.listOrders));
router.post('/', validate({ body: createOrderSchema }), asyncHandler(orderController.createOrder));

module.exports = router;
