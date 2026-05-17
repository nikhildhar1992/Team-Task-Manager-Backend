const { getPool } = require('../config/mysql');

async function createOrder({ userId, shippingAddress, currency, subtotal, totalAmount, status, items }) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `
        INSERT INTO orders (user_id, shipping_address, currency, subtotal, total_amount, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [userId, shippingAddress, currency, subtotal, totalAmount, status],
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.execute(
        `
          INSERT INTO order_items (order_id, product_id, item_name, unit_price, quantity, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [orderId, String(item.productId), item.itemName, item.unitPrice, item.quantity, item.lineTotal],
      );
    }

    await connection.commit();
    return findOrderById({ userId, orderId, connection });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findOrderById({ userId, orderId, connection: externalConnection = null }) {
  const connection = externalConnection || getPool();
  const executor = externalConnection ? connection : connection;

  const [orders] = await executor.execute(
    `
      SELECT
        id,
        user_id AS userId,
        shipping_address AS shippingAddress,
        currency,
        subtotal,
        total_amount AS totalAmount,
        status,
        created_at AS createdAt
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    [orderId, userId],
  );

  const order = orders[0] || null;
  if (!order) {
    return null;
  }

  const [items] = await executor.execute(
    `
      SELECT
        id,
        order_id AS orderId,
        product_id AS productId,
        item_name AS itemName,
        unit_price AS unitPrice,
        quantity,
        line_total AS lineTotal
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
    `,
    [orderId],
  );

  return {
    ...order,
    items,
  };
}

async function listUserOrders({ userId, status, page, pageSize }) {
  const whereClauses = ['user_id = ?'];
  const params = [userId];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  const normalizedPage = Number(page);
  const normalizedPageSize = Number(pageSize);
  const offset = (normalizedPage - 1) * normalizedPageSize;

  const pool = getPool();
  const [orders] = await pool.execute(
    `
      SELECT
        id,
        user_id AS userId,
        shipping_address AS shippingAddress,
        currency,
        subtotal,
        total_amount AS totalAmount,
        status,
        created_at AS createdAt
      FROM orders
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${normalizedPageSize} OFFSET ${offset}
    `,
    params,
  );

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM orders
      WHERE ${whereClauses.join(' AND ')}
    `,
    params,
  );

  const orderIds = orders.map((order) => order.id);
  if (orderIds.length === 0) {
    return {
      items: [],
      total: countRows[0]?.total || 0,
    };
  }

  const placeholders = orderIds.map(() => '?').join(', ');
  const [allItems] = await pool.execute(
    `
      SELECT
        id,
        order_id AS orderId,
        product_id AS productId,
        item_name AS itemName,
        unit_price AS unitPrice,
        quantity,
        line_total AS lineTotal
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC
    `,
    orderIds,
  );

  const itemsByOrderId = new Map();
  for (const item of allItems) {
    if (!itemsByOrderId.has(item.orderId)) {
      itemsByOrderId.set(item.orderId, []);
    }
    itemsByOrderId.get(item.orderId).push(item);
  }

  return {
    items: orders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) || [],
    })),
    total: countRows[0]?.total || 0,
  };
}

module.exports = {
  createOrder,
  findOrderById,
  listUserOrders,
};
