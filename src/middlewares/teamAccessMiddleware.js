const ApiError = require('../utils/apiError');
const teamRepository = require('../repositories/teamRepository');

async function attachTeamMembership(req, _res, next) {
  const teamId = Number(req.params.teamId || req.body.teamId || req.query.teamId);

  if (!teamId) {
    return next(new ApiError(400, 'teamId is required'));
  }

  const membership = await teamRepository.getMembership({
    teamId,
    userId: req.user.id,
  });

  if (!membership) {
    return next(new ApiError(403, 'User has no access to this team'));
  }

  req.team = {
    id: teamId,
    role: membership.role,
  };

  return next();
}

module.exports = {
  attachTeamMembership,
};
