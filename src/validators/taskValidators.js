const { z } = require('zod');

const taskStatus = z.enum(['todo', 'in_progress', 'done']);
const taskPriority = z.enum(['low', 'medium', 'high']);

const teamIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

const taskIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  taskId: z.coerce.number().int().positive(),
});

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  priority: taskPriority.optional(),
  status: taskStatus.optional(),
  assignedTo: z.coerce.number().int().positive().optional(),
  deadline: z.iso.date().optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    priority: taskPriority.optional(),
    status: taskStatus.optional(),
    assignedTo: z.coerce.number().int().positive().nullable().optional(),
    deadline: z.iso.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

const listTaskQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  status: taskStatus.optional(),
  assignedTo: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['created_at', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  teamIdParamSchema,
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  listTaskQuerySchema,
};
