const { z } = require('zod');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const knowledgeService = require('./knowledgeService');
const orchestratorRepository = require('../repositories/orchestratorRepository');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || '';

const PRIORITIES = ['low', 'medium', 'high'];
const TASK_KEYWORDS = [
  'task',
  'todo',
  'deadline',
  'priority',
  'assign',
  'team',
  'sprint',
  'backlog',
];
const OPERATIONS_KEYWORDS = [
  'order',
  'orders',
  'cart',
  'checkout',
  'product',
  'products',
  'payment',
  'shipping',
  'delivery',
  'refund',
];

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  priority: z.enum(PRIORITIES).default('medium'),
  deadline: z.string().max(40).optional().nullable(),
});

const orchestratorOutputSchema = z.object({
  agentType: z.enum(['general', 'task_breakdown', 'operations']),
  summary: z.string().min(1),
  tasks: z.array(taskSchema).default([]),
  sources: z
    .array(
      z.object({
        type: z.string(),
        id: z.string(),
        title: z.string(),
        excerpt: z.string().optional(),
        score: z.number().min(0).max(1),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1),
  followUpQuestions: z.array(z.string()).default([]),
});

function detectPromptInjection(prompt) {
  const normalized = String(prompt || '').toLowerCase();
  const blockedPatterns = [
    'ignore previous instructions',
    'reveal system prompt',
    'show hidden instructions',
    'bypass safety',
  ];
  return blockedPatterns.some((pattern) => normalized.includes(pattern));
}

function normalizeScore(score, fallback = 0.5) {
  const value = Number(score);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}

function classifyIntent(prompt) {
  const text = String(prompt || '').toLowerCase();
  const taskHits = TASK_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const operationHits = OPERATIONS_KEYWORDS.filter((keyword) => text.includes(keyword)).length;

  if (taskHits === 0 && operationHits === 0) {
    return { mode: 'general', ambiguous: false };
  }

  if (taskHits > 0 && operationHits > 0 && Math.abs(taskHits - operationHits) <= 1) {
    return { mode: 'general', ambiguous: true };
  }

  if (taskHits >= operationHits) {
    return { mode: 'task_breakdown', ambiguous: false };
  }
  return { mode: 'operations', ambiguous: false };
}

function buildFallbackOutput({ prompt, mode, retrievedChunks, taskSnapshot, orderSnapshot, ambiguous }) {
  const summaryParts = [
    `Mode selected: ${mode}`,
    `response generated using ${retrievedChunks.length} knowledge chunks`,
    taskSnapshot ? `and ${taskSnapshot.tasks.length} team tasks` : null,
    orderSnapshot.length > 0 ? `plus ${orderSnapshot.length} recent orders` : null,
  ].filter(Boolean);

  const followUpQuestions = [];
  if (ambiguous) {
    followUpQuestions.push('Are you asking about tasks or order operations?');
  } else if (mode === 'general') {
    followUpQuestions.push('Do you want this focused on tasks or order operations?');
  } else if (mode === 'task_breakdown') {
    followUpQuestions.push('Should I prioritize by deadline or by priority?');
  } else if (mode === 'operations') {
    followUpQuestions.push('Do you want this split by order status?');
  }

  return {
    agentType: mode,
    summary: `${summaryParts.join(' ')}. Prompt: ${prompt.slice(0, 180)}`,
    tasks: taskSnapshot
      ? taskSnapshot.tasks.slice(0, 3).map((task) => ({
          title: task.title,
          description: task.description || '',
          priority: PRIORITIES.includes(task.priority) ? task.priority : 'medium',
          deadline: task.deadline || null,
        }))
      : [],
    sources: retrievedChunks.slice(0, 5).map((chunk) => ({
      type: 'doc',
      id: chunk.source.id,
      title: chunk.source.title,
      excerpt: chunk.source.excerpt || '',
      score: normalizeScore(chunk.score, 0.6),
    })),
    confidence: normalizeScore(retrievedChunks[0]?.score, 0.55),
    followUpQuestions,
  };
}

async function withTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callLlm({ prompt, mode, taskSnapshot, orderSnapshot, retrievedChunks, ambiguous }) {
  if (!OPENAI_API_KEY) {
    return buildFallbackOutput({
      prompt,
      mode,
      retrievedChunks,
      taskSnapshot,
      orderSnapshot,
      ambiguous,
    });
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const contextPayload = {
    mode,
    prompt,
    teamFacts: taskSnapshot,
    orderFacts: orderSnapshot,
    knowledgeChunks: retrievedChunks.map((chunk) => ({
      id: chunk.source.id,
      title: chunk.source.title,
      content: chunk.content,
      score: normalizeScore(chunk.score),
    })),
  };

  const instruction = `
You are an assistant orchestrator. Return STRICT JSON only.
Output keys: summary, tasks, sources, confidence, followUpQuestions.
tasks[].priority must be one of low|medium|high.
confidence must be between 0 and 1.
Keep responses grounded only in provided context.
The selected mode is ${mode}. Stay aligned to that mode.
`;

  const response = await withTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: JSON.stringify(contextPayload) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, `LLM invocation failed: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    throw new ApiError(502, 'LLM returned empty response');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(502, 'Unable to parse LLM JSON response');
  }

  return parsed;
}

async function orchestrate({ userId, prompt, teamId = null }) {
  const startedAt = Date.now();
  if (detectPromptInjection(prompt)) {
    throw new ApiError(400, 'Prompt rejected by safety checks');
  }

  const routing = classifyIntent(prompt);
  const mode = routing.mode;
  const ambiguous = routing.ambiguous;

  let taskSnapshot = null;
  if (teamId) {
    taskSnapshot = await orchestratorRepository.getTeamSnapshot({ userId, teamId, limit: 20 });
    if (!taskSnapshot) {
      throw new ApiError(403, 'User has no access to this team');
    }
  }

  const orderSnapshot = await orchestratorRepository.getUserOrderSnapshot({ userId, limit: 20 });
  const knowledge = await knowledgeService.searchKnowledge({
    queryText: prompt,
    topK: Number(process.env.RAG_TOP_K || 6),
    category: null,
  });

  const llmRaw = await callLlm({
    prompt,
    mode,
    ambiguous,
    taskSnapshot,
    orderSnapshot,
    retrievedChunks: knowledge.chunks,
  });

  const hasStrongRagMatch =
    Array.isArray(knowledge.chunks) &&
    knowledge.chunks.length > 0 &&
    normalizeScore(knowledge.chunks[0].score, 0) >= 0.65;

  const result = orchestratorOutputSchema.parse({
    ...llmRaw,
    agentType: mode,
    sources: Array.isArray(llmRaw.sources)
      ? llmRaw.sources.map((source) => ({
          type: String(source.type || 'doc'),
          id: String(source.id || 'unknown'),
          title: String(source.title || 'Source'),
          excerpt: String(source.excerpt || ''),
          score: normalizeScore(source.score, 0.5),
        }))
      : knowledge.chunks.slice(0, 5).map((chunk) => ({
          type: 'doc',
          id: chunk.source.id,
          title: chunk.source.title,
          excerpt: chunk.source.excerpt || '',
          score: normalizeScore(chunk.score, 0.6),
        })),
    confidence: hasStrongRagMatch ? normalizeScore(llmRaw.confidence, 0.7) : 0.35,
    followUpQuestions: [
      ...(Array.isArray(llmRaw.followUpQuestions) ? llmRaw.followUpQuestions : []),
      ...(ambiguous ? ['Are you asking about team tasks or order operations?'] : []),
      ...(!hasStrongRagMatch
        ? ['I could not find strong knowledge matches. Can you provide more details?']
        : []),
    ].filter((item, index, arr) => item && arr.indexOf(item) === index),
  });

  const elapsedMs = Date.now() - startedAt;
  logger.info(
    {
      userId,
      teamId,
      mode,
      elapsedMs,
      sourceCount: result.sources.length,
      taskCount: result.tasks.length,
    },
    'orchestrator_completed',
  );

  return result;
}

module.exports = {
  orchestrate,
};
