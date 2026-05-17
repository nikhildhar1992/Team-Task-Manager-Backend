const userRepository = require('../repositories/userRepository');

async function searchUsers({ q, limit }) {
  return userRepository.searchUsers({ q, limit });
}

module.exports = {
  searchUsers,
};
