const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');

async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing access token');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid access token'));
  }
}

module.exports = authenticate;
