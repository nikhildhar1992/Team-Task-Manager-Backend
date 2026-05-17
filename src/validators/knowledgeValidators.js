const { z } = require('zod');

const ingestDocumentSchema = z.object({
  sourceKey: z.string().min(3).max(191),
  title: z.string().min(2).max(255),
  category: z.string().min(2).max(120),
  version: z.string().min(1).max(40).default('v1'),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  content: z.string().min(10).max(20000),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

const ingestKnowledgeSchema = z.object({
  force: z.boolean().optional(),
  documents: z.array(ingestDocumentSchema).min(1).optional(),
});

const searchKnowledgeSchema = z.object({
  query: z.string().min(3).max(2000),
  topK: z.coerce.number().int().min(1).max(20).default(5),
  category: z.string().min(2).max(120).optional(),
  teamId: z.coerce.number().int().positive().optional(),
});

module.exports = {
  ingestKnowledgeSchema,
  searchKnowledgeSchema,
};
