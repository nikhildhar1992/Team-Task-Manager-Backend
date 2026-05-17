const aiService = require('../services/aiService');
const orchestratorService = require('../services/orchestratorService');

async function generateTasks(req, res) {
  const result = await aiService.generateTasksFromPrompt(req.body.prompt);

  res.status(200).json({
    success: true,
    data: result,
  });
}

async function orchestrate(req, res) {
  const result = await orchestratorService.orchestrate({
    userId: req.user.id,
    prompt: req.body.prompt,
    teamId: req.body.teamId || null,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  generateTasks,
  orchestrate,
};
