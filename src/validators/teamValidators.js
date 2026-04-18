const { z } = require('zod');

const teamIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

const addTeamMemberSchema = z.object({
  targetUserId: z.number().int().positive(),
  role: z.enum(['admin', 'member']),
});

const removeTeamMemberSchema = z.object({
  targetUserId: z.number().int().positive(),
});

module.exports = {
  teamIdParamSchema,
  addTeamMemberSchema,
  removeTeamMemberSchema,
};
