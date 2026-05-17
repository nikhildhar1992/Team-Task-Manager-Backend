const { z } = require('zod');

const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = {
  searchUsersQuerySchema,
};
