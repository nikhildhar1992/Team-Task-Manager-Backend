const userService = require('../services/userService');

async function searchUsers(req, res) {
  const users = await userService.searchUsers({
    q: req.query.q,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    data: users,
  });
}

module.exports = {
  searchUsers,
};
