const express = require('express');
const knowledgeController = require('../controllers/knowledgeController');
const authenticate = require('../middlewares/authMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');
const validate = require('../middlewares/validate');
const { authorize } = require('../middlewares/rbacMiddleware');
const { attachTeamMembership } = require('../middlewares/teamAccessMiddleware');
const { ingestKnowledgeSchema, searchKnowledgeSchema } = require('../validators/knowledgeValidators');

const router = express.Router();

router.use(authenticate);

router.post('/ingest', validate({ body: ingestKnowledgeSchema.optional() }), asyncHandler(knowledgeController.ingest));

router.post(
  '/search',
  validate({ body: searchKnowledgeSchema }),
  asyncHandler(async (req, res, next) => {
    if (req.body.teamId) {
      req.params.teamId = String(req.body.teamId);
      return attachTeamMembership(req, res, next);
    }
    return next();
  }),
  asyncHandler((req, _res, next) => {
    if (req.team) {
      return authorize('tasks:manage')(req, _res, next);
    }
    return next();
  }),
  asyncHandler(knowledgeController.search),
);

module.exports = router;
