const { query } = require('../config/mysql');

async function createUser({ email, passwordHash, name }) {
  const result = await query(
    `
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `,
    [email, passwordHash, name],
  );

  return findById(result.insertId);
}

async function findByEmail(email) {
  const rows = await query(
    `
      SELECT id, email, password_hash AS passwordHash, name, created_at AS createdAt
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] || null;
}

async function findById(id) {
  const rows = await query(
    `
      SELECT id, email, name, created_at AS createdAt
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] || null;
}

async function searchUsers({ q, limit }) {
  return query(
    `
      SELECT id, name, email
      FROM users
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY name ASC
      LIMIT ?
    `,
    [`%${q}%`, `%${q}%`, limit],
  );
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  searchUsers,
};
