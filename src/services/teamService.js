const ApiError = require('../utils/apiError');
const { getCache, setCache, deleteByPrefix } = require('../utils/cache');
const teamRepository = require('../repositories/teamRepository');

function teamsCacheKey(userId) {
  return `teams:user:${userId}`;
}

async function listMyTeams(userId) {
  const key = teamsCacheKey(userId);
  const cached = await getCache(key);

  if (cached) {
    return cached;
  }

  const teams = await teamRepository.listUserTeams(userId);
  await setCache(key, teams);
  return teams;
}

async function createTeam({ actorId, payload }) {
  const team = await teamRepository.createTeam({
    name: payload.name,
    createdBy: actorId,
  });
  await teamRepository.addMember({
    teamId: team.id,
    userId: actorId,
    role: 'admin',
  });

  await deleteByPrefix('teams:user:');
  return team;
}

async function getTeamByIdForMember({ actorId, teamId }) {
  await assertMembership({ actorId, teamId });
  return teamRepository.findTeamById(teamId);
}

async function deleteTeam({ actorId, teamId }) {
  const membership = await assertMembership({ actorId, teamId });
  if (membership.role !== 'admin') {
    throw new ApiError(403, 'Only team admins can delete team');
  }

  const existingTeam = await teamRepository.findTeamById(teamId);
  if (!existingTeam) {
    throw new ApiError(404, 'Team not found');
  }

  await teamRepository.deleteTeam(teamId);
  await deleteByPrefix('teams:user:');
}

async function assertMembership({ actorId, teamId }) {
  const membership = await teamRepository.getMembership({
    teamId,
    userId: actorId,
  });

  if (!membership) {
    throw new ApiError(403, 'User has no access to this team');
  }

  return membership;
}

module.exports = {
  listMyTeams,
  createTeam,
  getTeamByIdForMember,
  deleteTeam,
};
