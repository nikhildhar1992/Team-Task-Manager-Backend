const { query } = require('../config/mysql');

async function createTask({
  teamId,
  title,
  description,
  priority,
  status,
  assignedTo,
  deadline,
  createdBy,
}) {
  const result = await query(
    `
      INSERT INTO tasks (team_id, title, description, priority, status, assigned_to, deadline, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [teamId, title, description, priority, status, assignedTo, deadline, createdBy],
  );

  return findById({ teamId, taskId: result.insertId });
}

async function findById({ teamId, taskId }) {
  const rows = await query(
    `
      SELECT
        id,
        team_id AS teamId,
        title,
        description,
        priority,
        status,
        assigned_to AS assignedTo,
        deadline,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM tasks
      WHERE id = ? AND team_id = ?
      LIMIT 1
    `,
    [taskId, teamId],
  );

  return rows[0] || null;
}

async function updateTask({ teamId, taskId, payload }) {
  const fields = [];
  const params = [];

  Object.entries(payload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    params.push(value);
  });

  if (fields.length === 0) {
    return findById({ teamId, taskId });
  }

  params.push(taskId, teamId);

  await query(
    `
      UPDATE tasks
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND team_id = ?
    `,
    params,
  );

  return findById({ teamId, taskId });
}

async function deleteTask({ teamId, taskId }) {
  await query(
    `
      DELETE FROM tasks
      WHERE id = ? AND team_id = ?
    `,
    [taskId, teamId],
  );
}

function buildListQueryFilters({ teamId, filters, sortBy, sortOrder, limit, cursor }) {
  const whereClauses = ['team_id = ?'];
  const params = [Number(teamId)];

  if (filters.status) {
    whereClauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.assignedTo) {
    whereClauses.push('assigned_to = ?');
    params.push(filters.assignedTo);
  }

  if (filters.search) {
    whereClauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (cursor && cursor.createdAt && Number.isFinite(Number(cursor.id))) {
    whereClauses.push('(created_at < ? OR (created_at = ? AND id < ?))');
    params.push(cursor.createdAt, cursor.createdAt, Number(cursor.id));
  }

  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderByColumn = sortBy === 'priority' ? 'priority' : 'created_at';

  const normalizedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
  const cappedLimit = Math.max(1, Math.min(100, normalizedLimit));

  const sql = `
    SELECT
      id,
      team_id AS teamId,
      title,
      description,
      priority,
      status,
      assigned_to AS assignedTo,
      deadline,
      created_by AS createdBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM tasks
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${orderByColumn} ${direction}, id ${direction}
    LIMIT ${cappedLimit + 1}
  `;

  return {
    sql,
    params: params.map((value) => (value === undefined ? null : value)),
  };
}

async function listTasks(params) {
  const { sql, params: queryParams } = buildListQueryFilters(params);
  return query(sql, queryParams);
}

module.exports = {
  createTask,
  findById,
  updateTask,
  deleteTask,
  listTasks,
};
