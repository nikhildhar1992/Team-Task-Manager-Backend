const orderService = require('../services/orderService');

async function createOrder(req, res) {
  const order = await orderService.createOrder({
    userId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data: order,
  });
}

async function listOrders(req, res) {
  const result = await orderService.listOrders({
    userId: req.user.id,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  createOrder,
  listOrders,
};
