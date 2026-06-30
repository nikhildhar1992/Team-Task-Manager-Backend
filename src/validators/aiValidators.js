const { z } = require('zod');

const generateTasksSchema = z.object({
  prompt: z.string().min(5).max(1000),
});

const orchestrateSchema = z.object({
  prompt: z.string().min(5).max(4000),
  teamId: z.coerce.number().int().positive().optional(),
});

module.exports = {
  generateTasksSchema,
  orchestrateSchema,
};
