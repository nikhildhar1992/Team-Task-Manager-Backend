const knowledgeService = require('../services/knowledgeService');

async function ingest(req, res) {
  const result = await knowledgeService.ingestKnowledge({
    documents: req.body?.documents,
  });
  res.status(200).json({
    success: true,
    data: result,
  });
}

async function search(req, res) {
  const result = await knowledgeService.searchKnowledge({
    queryText: req.body.query,
    topK: req.body.topK,
    category: req.body.category || null,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = {
  ingest,
  search,
};
