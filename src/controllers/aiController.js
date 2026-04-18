const aiService = require('../services/aiService');

async function generateTasks(req, res) {
  const result = await aiService.generateTasksFromPrompt(req.body.prompt);

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  generateTasks,
};
