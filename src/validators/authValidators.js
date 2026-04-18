const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
  teamName: z.string().min(2).max(120),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
