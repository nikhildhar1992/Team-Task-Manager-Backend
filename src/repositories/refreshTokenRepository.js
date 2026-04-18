const { query } = require('../config/mysql');

async function createToken({ userId, tokenHash, expiresAt, replacedByTokenHash = null }) {
  await query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, replaced_by_token_hash)
      VALUES (?, ?, ?, ?)
    `,
    [userId, tokenHash, expiresAt, replacedByTokenHash],
  );
}

async function findByTokenHash(tokenHash) {
  const rows = await query(
    `
      SELECT
        id,
        user_id AS userId,
        token_hash AS tokenHash,
        replaced_by_token_hash AS replacedByTokenHash,
        revoked_at AS revokedAt,
        expires_at AS expiresAt,
        created_at AS createdAt
      FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1
    `,
    [tokenHash],
  );

  return rows[0] || null;
}

async function revokeToken({ tokenHash }) {
  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = ?
    `,
    [tokenHash],
  );
}

async function rotateToken({ tokenHash, replacedByTokenHash }) {
  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP,
          replaced_by_token_hash = ?
      WHERE token_hash = ?
    `,
    [replacedByTokenHash, tokenHash],
  );
}

module.exports = {
  createToken,
  findByTokenHash,
  revokeToken,
  rotateToken,
};
