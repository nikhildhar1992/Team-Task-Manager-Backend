const ApiError = require('../utils/apiError');

const rolePermissions = {
  admin: ['team:manage', 'members:manage', 'tasks:manage'],
  member: ['tasks:manage'],
};

function authorize(requiredPermission) {
  return (req, _res, next) => {
    const role = req.team?.role;
    const permissions = rolePermissions[role] || [];

    if (!permissions.includes(requiredPermission)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    return next();
  };
}

module.exports = {
  authorize,
  rolePermissions,
};
