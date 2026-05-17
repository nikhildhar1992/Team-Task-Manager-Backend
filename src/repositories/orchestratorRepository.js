const { query } = require('../config/mysql');

async function getTeamSnapshot({ userId, teamId, limit = 20 }) {
  const rows = await query(
    `
      SELECT team_id AS teamId, role
      FROM team_members
      WHERE user_id = ? AND team_id = ?
      LIMIT 1
    `,
    [userId, teamId],
  );

  if (!rows[0]) {
    return null;
  }

  const tasks = await query(
    `
      SELECT
        id,
        title,
        description,
        status,
        priority,
        assigned_to AS assignedTo,
        deadline,
        created_at AS createdAt
      FROM tasks
      WHERE team_id = ?
      ORDER BY created_at DESC
      LIMIT ${Math.max(1, Math.min(50, Number(limit) || 20))}
    `,
    [teamId],
  );

  return {
    teamId,
    role: rows[0].role,
    tasks,
  };
}

async function getUserOrderSnapshot({ userId, limit = 20 }) {
  return query(
    `
      SELECT
        id,
        status,
        currency,
        subtotal,
        total_amount AS totalAmount,
        created_at AS createdAt
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${Math.max(1, Math.min(50, Number(limit) || 20))}
    `,
    [userId],
  );
}

module.exports = {
  getTeamSnapshot,
  getUserOrderSnapshot,
};
