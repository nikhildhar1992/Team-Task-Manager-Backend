const ApiError = require('../utils/apiError');
const { getCache, setCache, deleteByPrefix } = require('../utils/cache');
const teamRepository = require('../repositories/teamRepository');
const userRepository = require('../repositories/userRepository');

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

async function addTeamMember({ requesterId, teamId, targetUserId, role }) {
  const requesterMembership = await teamRepository.getMembership({
    teamId,
    userId: requesterId,
  });

  if (!requesterMembership || requesterMembership.role !== 'admin') {
    throw new ApiError(403, 'Only team admins can manage members');
  }

  const targetUser = await userRepository.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, 'Target user not found');
  }

  await teamRepository.addMember({
    teamId,
    userId: targetUserId,
    role,
  });

  await deleteByPrefix('teams:user:');

  return teamRepository.getMembership({ teamId, userId: targetUserId });
}

async function removeTeamMember({ requesterId, teamId, targetUserId }) {
  const requesterMembership = await teamRepository.getMembership({
    teamId,
    userId: requesterId,
  });

  if (!requesterMembership || requesterMembership.role !== 'admin') {
    throw new ApiError(403, 'Only team admins can manage members');
  }

  await teamRepository.removeMember({ teamId, userId: targetUserId });
  await deleteByPrefix('teams:user:');
}

module.exports = {
  listMyTeams,
  addTeamMember,
  removeTeamMember,
};
