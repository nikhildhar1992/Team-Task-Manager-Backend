const ApiError = require('../utils/apiError');
const userRepository = require('../repositories/userRepository');
const teamRepository = require('../repositories/teamRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  calculateRefreshTokenExpiryDate,
} = require('../utils/jwt');

function buildAuthPayload(user) {
  return {
    sub: user.id,
    email: user.email,
  };
}

async function issueRefreshToken(userId) {
  const rawToken = signRefreshToken({ sub: userId });
  const tokenHash = hashToken(rawToken);

  await refreshTokenRepository.createToken({
    userId,
    tokenHash,
    expiresAt: calculateRefreshTokenExpiryDate(),
  });

  return rawToken;
}

async function register({ name, email, password, teamName }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.createUser({
    name,
    email,
    passwordHash,
  });

  const team = await teamRepository.createTeam({
    name: teamName,
    createdBy: user.id,
  });

  await teamRepository.addMember({
    teamId: team.id,
    userId: user.id,
    role: 'admin',
  });

  const accessToken = signAccessToken(buildAuthPayload(user));
  const refreshToken = await issueRefreshToken(user.id);

  return {
    user,
    accessToken,
    refreshToken,
  };
}

async function login({ email, password }) {
  const userWithPassword = await userRepository.findByEmail(email);
  if (!userWithPassword) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await comparePassword(password, userWithPassword.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const user = await userRepository.findById(userWithPassword.id);
  const accessToken = signAccessToken(buildAuthPayload(user));
  const refreshToken = await issueRefreshToken(user.id);

  return {
    user,
    accessToken,
    refreshToken,
  };
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (_error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const currentTokenHash = hashToken(rawRefreshToken);
  const existingToken = await refreshTokenRepository.findByTokenHash(currentTokenHash);

  if (!existingToken) {
    throw new ApiError(401, 'Refresh token not recognized');
  }

  if (existingToken.revokedAt || new Date(existingToken.expiresAt) < new Date()) {
    throw new ApiError(401, 'Refresh token has expired or was revoked');
  }

  const nextRefreshToken = signRefreshToken({ sub: payload.sub });
  const nextRefreshTokenHash = hashToken(nextRefreshToken);

  await refreshTokenRepository.rotateToken({
    tokenHash: currentTokenHash,
    replacedByTokenHash: nextRefreshTokenHash,
  });

  await refreshTokenRepository.createToken({
    userId: payload.sub,
    tokenHash: nextRefreshTokenHash,
    expiresAt: calculateRefreshTokenExpiryDate(),
  });

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  const accessToken = signAccessToken(buildAuthPayload(user));

  return {
    accessToken,
    refreshToken: nextRefreshToken,
  };
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  await refreshTokenRepository.revokeToken({ tokenHash });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
