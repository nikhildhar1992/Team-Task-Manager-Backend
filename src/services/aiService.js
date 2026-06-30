const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const PRIORITIES = new Set(['low', 'medium', 'high']);

function sanitizeTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) {
    throw new ApiError(502, 'AI returned invalid format');
  }

  return rawTasks
    .filter((task) => task && typeof task === 'object')
    .map((task) => ({
      title: String(task.title || '').trim().slice(0, 200),
      description: String(task.description || '').trim().slice(0, 1000),
      priority: PRIORITIES.has(String(task.priority || '').toLowerCase())
        ? String(task.priority || '').toLowerCase()
        : 'medium',
      suggestedDeadline: String(task.suggestedDeadline || '').trim().slice(0, 50),
    }))
    .filter((task) => task.title.length > 0);
}

async function generateTasksFromPrompt(prompt) {
  if (!env.geminiApiKey) {
    throw new ApiError(500, 'Gemini API key is not configured');
  }

  const client = new GoogleGenerativeAI(env.geminiApiKey);
  const model = client.getGenerativeModel({ model: env.geminiModel });

  const instruction = `
You are a task planner. Return STRICT JSON only.
Generate a list of actionable project tasks based on this prompt:
"${prompt}"

Response JSON shape:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "low|medium|high",
      "suggestedDeadline": "YYYY-MM-DD"
    }
  ]
}
`;

  const response = await model.generateContent(instruction);
  const text = response.response.text();

  let parsed;
  try {
    const jsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ApiError(502, 'Unable to parse AI response');
  }

  const tasks = sanitizeTasks(parsed.tasks);

  return { tasks };
}

module.exports = {
  generateTasksFromPrompt,
};
