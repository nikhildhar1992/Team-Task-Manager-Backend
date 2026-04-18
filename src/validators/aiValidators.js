const { z } = require('zod');

const generateTasksSchema = z.object({
  prompt: z.string().min(5).max(1000),
});

module.exports = {
  generateTasksSchema,
};
