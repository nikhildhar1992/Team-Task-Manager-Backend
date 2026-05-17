const { z } = require('zod');

const orderStatus = z.enum(['placed', 'paid', 'cancelled']);

const createOrderItemSchema = z.object({
  productId: z.union([z.string().min(1).max(120), z.coerce.number().int().positive()]),
  itemName: z.string().min(1).max(200),
  unitPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  lineTotal: z.coerce.number().positive(),
});

const createOrderSchema = z.object({
  shippingAddress: z.string().min(5).max(1000),
  currency: z.string().length(3).toUpperCase().default('INR'),
  subtotal: z.coerce.number().nonnegative(),
  totalAmount: z.coerce.number().nonnegative(),
  status: orderStatus.default('placed'),
  items: z.array(createOrderItemSchema).min(1),
});

const listOrdersQuerySchema = z.object({
  status: orderStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = {
  createOrderSchema,
  listOrdersQuerySchema,
};
