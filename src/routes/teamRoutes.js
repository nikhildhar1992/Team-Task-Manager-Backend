const express = require('express');
const teamController = require('../controllers/teamController');
const asyncHandler = require('../middlewares/asyncHandler');
const authenticate = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { attachTeamMembership } = require('../middlewares/teamAccessMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { teamIdParamSchema, createTeamSchema } = require('../validators/teamValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(teamController.listMyTeams));

router.post('/', validate({ body: createTeamSchema }), asyncHandler(teamController.createTeam));

router.get(
  '/:teamId',
  validate({ params: teamIdParamSchema }),
  asyncHandler(attachTeamMembership),
  asyncHandler(teamController.getTeamById),
);

router.delete(
  '/:teamId',
  validate({ params: teamIdParamSchema }),
  asyncHandler(attachTeamMembership),
  authorize('team:manage'),
  asyncHandler(teamController.deleteTeam),
);

module.exports = router;
