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
      SELECT id, name, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
      FROM teams
      WHERE id = ?
      LIMIT 1
    `,
    [teamId],
  );

  return rows[0] || null;
}

async function updateTeam({ teamId, payload }) {
  const fields = [];
  const params = [];

  Object.entries(payload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    params.push(value);
  });

  if (fields.length === 0) {
    return findTeamById(teamId);
  }

  params.push(teamId);

  await query(
    `
      UPDATE teams
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    params,
  );

  return findTeamById(teamId);
}

async function deleteTeam(teamId) {
  await query(
    `
      DELETE FROM teams
      WHERE id = ?
    `,
    [teamId],
  );
}

async function listTeamMembers({ teamId, page, pageSize }) {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const offset = (normalizedPage - 1) * normalizedPageSize;
  const items = await query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        tm.role
      FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
      ORDER BY tm.created_at ASC
      LIMIT ${normalizedPageSize} OFFSET ${offset}
    `,
    [teamId],
  );

  const [{ total }] = await query(
    `
      SELECT COUNT(*) AS total
      FROM team_members
      WHERE team_id = ?
    `,
    [teamId],
  );

  return {
    items,
    total,
  };
}

module.exports = {
  createTeam,
  addMember,
  removeMember,
  getMembership,
  listUserTeams,
  findTeamById,
  updateTeam,
  deleteTeam,
  listTeamMembers,
};
