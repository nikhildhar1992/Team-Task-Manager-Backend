const bcrypt = require('bcryptjs');

async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, 12);
}

async function comparePassword(rawPassword, passwordHash) {
  return bcrypt.compare(rawPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
