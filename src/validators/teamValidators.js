const { z } = require('zod');

const teamIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
});

module.exports = {
  teamIdParamSchema,
  createTeamSchema,
};
