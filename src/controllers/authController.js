const authService = require('../services/authService');
const env = require('../config/env');

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProd,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

async function register(req, res) {
  const result = await authService.register(req.body);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
}

async function login(req, res) {
  const result = await authService.login(req.body);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
}

async function refresh(req, res) {
  const tokenFromCookie = req.cookies?.refreshToken;
  const tokenFromBody = req.body?.refreshToken;
  const refreshToken = tokenFromCookie || tokenFromBody;

  const result = await authService.refresh(refreshToken);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      accessToken: result.accessToken,
    },
  });
}

async function logout(req, res) {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(refreshToken);
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
