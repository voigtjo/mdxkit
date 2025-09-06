// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const DEV_BYPASS = String(process.env.SKIP_AUTH).toLowerCase() === 'true';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL     || '15m';
const REFRESH_TTL    = process.env.JWT_REFRESH_TTL    || '30d';

/** minimale Felder für /me */
function sanitizeUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    userId: u.userId,                // Public-ID (neu)
    tenant: u.tenant,                // ObjectId
    displayName: u.displayName,
    email: u.email,
    status: u.status,
    isSystemAdmin: !!u.isSystemAdmin,
    isTenantAdmin: !!u.isTenantAdmin,
    defaultGroupId: u.defaultGroupId || null,
    memberships: Array.isArray(u.memberships) ? u.memberships : [],
    profile: u.profile || {},
  };
}

function signAccess(user) {
  return jwt.sign(
    {
      sub: String(user._id),        // User ObjectId
      tid: user.tenant ? String(user.tenant) : null, // Tenant ObjectId
      sys: !!user.isSystemAdmin,
      ten: !!user.isTenantAdmin,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function signRefresh(user) {
  const tv = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  return jwt.sign({ sub: String(user._id), tv }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

async function attachUserFromAccess(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.status !== 'active') return res.status(403).json({ error: 'User not active' });
    req.user = user;
    req.me = sanitizeUser(user);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

async function authRequired(req, res, next) {
  if (DEV_BYPASS) {
    // Dev-Bypass: synthetischer Admin in aktuellem Tenant-Scope
    req.user = new User({
      _id: '000000000000000000000000',
      userId: 'usr_devdevdevdev',
      tenant: req.tenant || null,   // ObjectId, kommt aus tenantFromParam
      displayName: 'Dev User',
      email: 'dev@example.com',
      status: 'active',
      isSystemAdmin: true,
      isTenantAdmin: true,
      memberships: [],
    });
    req.me = sanitizeUser(req.user);
    return next();
  }
  return attachUserFromAccess(req, res, next);
}

async function optionalAuth(req, _res, next) {
  if (DEV_BYPASS) return next();
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    if (user && user.status === 'active') {
      req.user = user;
      req.me = sanitizeUser(user);
    }
  } catch {/* ignore */}
  return next();
}

function issueTokens(user) {
  return { accessToken: signAccess(user), refreshToken: signRefresh(user) };
}

async function rotateRefreshToken(refreshToken, { rotate = false } = {}) {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw new Error('no user');
    const tv = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
    if (payload.tv !== tv) throw new Error('invalidated');

    const tokens = { accessToken: signAccess(user) };
    if (rotate) {
      user.tokenVersion = tv + 1;
      await user.save();
      tokens.refreshToken = signRefresh(user);
    }
    return { user, tokens };
  } catch {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
}

async function invalidateRefreshTokens(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
}

async function authRequiredStrict(req, res, next) {
  return attachUserFromAccess(req, res, next);
}

module.exports = {
  authRequired,
  authRequiredStrict,
  optionalAuth,
  issueTokens,
  rotateRefreshToken,
  invalidateRefreshTokens,
  sanitizeUser,
};
