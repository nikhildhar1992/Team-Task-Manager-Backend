const ApiError = require('../utils/apiError');
const orderRepository = require('../repositories/orderRepository');

function roundCurrency(value) {
  return Number(Number(value).toFixed(2));
}

async function createOrder({ userId, payload }) {
  const subtotal = roundCurrency(payload.subtotal);
  const totalAmount = roundCurrency(payload.totalAmount);
  const computedSubtotal = roundCurrency(
    payload.items.reduce((sum, item) => sum + Number(item.lineTotal), 0),
  );

  if (computedSubtotal !== subtotal) {
    throw new ApiError(400, 'subtotal must match sum of item lineTotal values');
  }

  if (totalAmount < subtotal) {
    throw new ApiError(400, 'totalAmount cannot be less than subtotal');
  }

  for (const item of payload.items) {
    const expectedLineTotal = roundCurrency(Number(item.unitPrice) * Number(item.quantity));
    const providedLineTotal = roundCurrency(item.lineTotal);
    if (expectedLineTotal !== providedLineTotal) {
      throw new ApiError(400, 'lineTotal must be unitPrice * quantity');
    }
  }

  return orderRepository.createOrder({
    userId,
    shippingAddress: payload.shippingAddress,
    currency: payload.currency.toUpperCase(),
    subtotal,
    totalAmount,
    status: payload.status || 'placed',
    items: payload.items.map((item) => ({
      productId: item.productId,
      itemName: item.itemName,
      unitPrice: roundCurrency(item.unitPrice),
      quantity: Number(item.quantity),
      lineTotal: roundCurrency(item.lineTotal),
    })),
  });
}

async function listOrders({ userId, query }) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  const result = await orderRepository.listUserOrders({
    userId,
    status: query.status || null,
    page,
    pageSize,
  });

  return {
    items: result.items,
    page,
    pageSize,
    total: result.total,
    totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize),
  };
}

module.exports = {
  createOrder,
  listOrders,
};
