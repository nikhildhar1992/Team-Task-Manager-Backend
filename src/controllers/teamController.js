const teamService = require('../services/teamService');

async function listMyTeams(req, res) {
  const teams = await teamService.listMyTeams(req.user.id);

  res.status(200).json({
    success: true,
    data: teams,
  });
}

async function addMember(req, res) {
  const membership = await teamService.addTeamMember({
    requesterId: req.user.id,
    teamId: req.team.id,
    targetUserId: req.body.targetUserId,
    role: req.body.role,
  });

  res.status(200).json({
    success: true,
    data: membership,
  });
}

async function removeMember(req, res) {
  await teamService.removeTeamMember({
    requesterId: req.user.id,
    teamId: req.team.id,
    targetUserId: req.body.targetUserId,
  });

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
  });
}

module.exports = {
  listMyTeams,
  addMember,
  removeMember,
};
