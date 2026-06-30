const teamService = require('../services/teamService');

async function listMyTeams(req, res) {
  const teams = await teamService.listMyTeams(req.user.id);

  res.status(200).json({
    success: true,
    data: teams,
  });
}

async function createTeam(req, res) {
  const team = await teamService.createTeam({
    actorId: req.user.id,
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data: team,
  });
}

async function getTeamById(req, res) {
  const team = await teamService.getTeamByIdForMember({
    actorId: req.user.id,
    teamId: req.team.id,
  });

  res.status(200).json({
    success: true,
    data: team,
  });
}

async function deleteTeam(req, res) {
  await teamService.deleteTeam({
    actorId: req.user.id,
    teamId: req.team.id,
  });

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully',
  });
}

module.exports = {
  listMyTeams,
  createTeam,
  getTeamById,
  deleteTeam,
};
