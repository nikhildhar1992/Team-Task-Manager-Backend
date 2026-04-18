const express = require('express');
const teamController = require('../controllers/teamController');
const asyncHandler = require('../middlewares/asyncHandler');
const authenticate = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { attachTeamMembership } = require('../middlewares/teamAccessMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { teamIdParamSchema, addTeamMemberSchema, removeTeamMemberSchema } = require('../validators/teamValidators');

const router = express.Router();

router.use(authenticate);

router.get('/me', asyncHandler(teamController.listMyTeams));

router.post(
  '/:teamId/members',
  validate({ params: teamIdParamSchema, body: addTeamMemberSchema }),
  asyncHandler(attachTeamMembership),
  authorize('members:manage'),
  asyncHandler(teamController.addMember),
);

router.delete(
  '/:teamId/members',
  validate({ params: teamIdParamSchema, body: removeTeamMemberSchema }),
  asyncHandler(attachTeamMembership),
  authorize('members:manage'),
  asyncHandler(teamController.removeMember),
);

module.exports = router;
