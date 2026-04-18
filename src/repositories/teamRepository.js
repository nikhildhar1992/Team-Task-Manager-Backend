const { query } = require('../config/mysql');

async function createTeam({ name, createdBy }) {
  const result = await query(
    `
      INSERT INTO teams (name, created_by)
      VALUES (?, ?)
    `,
    [name, createdBy],
  );

  return findTeamById(result.insertId);
}

async function addMember({ teamId, userId, role }) {
  await query(
    `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE role = VALUES(role)
    `,
    [teamId, userId, role],
  );
}

async function removeMember({ teamId, userId }) {
  await query(
    `
      DELETE FROM team_members
      WHERE team_id = ? AND user_id = ?
    `,
    [teamId, userId],
  );
}

async function getMembership({ teamId, userId }) {
  const rows = await query(
    `
      SELECT team_id AS teamId, user_id AS userId, role
      FROM team_members
      WHERE team_id = ? AND user_id = ?
      LIMIT 1
    `,
    [teamId, userId],
  );

  return rows[0] || null;
}

async function listUserTeams(userId) {
  return query(
    `
      SELECT t.id, t.name, tm.role, t.created_at AS createdAt
      FROM teams t
      INNER JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
    `,
    [userId],
  );
}

async function findTeamById(teamId) {
  const rows = await query(
    `
      SELECT id, name, created_by AS createdBy, created_at AS createdAt
      FROM teams
      WHERE id = ?
      LIMIT 1
    `,
    [teamId],
  );

  return rows[0] || null;
}

module.exports = {
  createTeam,
  addMember,
  removeMember,
  getMembership,
  listUserTeams,
  findTeamById,
};
