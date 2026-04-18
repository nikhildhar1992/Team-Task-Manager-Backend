const { query } = require('../config/mysql');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');

async function runSeed() {
  const adminPassword = await hashPassword('Admin@12345');
  const memberPassword = await hashPassword('Member@12345');

  await query(
    `
      INSERT INTO users (id, email, password_hash, name)
      VALUES
        (1, 'admin@example.com', ?, 'Seed Admin'),
        (2, 'member@example.com', ?, 'Seed Member')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `,
    [adminPassword, memberPassword],
  );

  await query(
    `
      INSERT INTO teams (id, name, created_by)
      VALUES (1, 'Seed Team', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `,
  );

  await query(
    `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES
        (1, 1, 'admin'),
        (1, 2, 'member')
      ON DUPLICATE KEY UPDATE role = VALUES(role)
    `,
  );

  await query(
    `
      INSERT INTO tasks (team_id, title, description, priority, status, assigned_to, deadline, created_by)
      VALUES
        (1, 'Setup kickoff', 'Organize kickoff meeting', 'high', 'todo', 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1),
        (1, 'Prepare roadmap', 'Create Q2 roadmap draft', 'medium', 'in_progress', 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1)
    `,
  );

  logger.info('seed_data_inserted');
}

runSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, 'seed_data_failed');
    process.exit(1);
  });
