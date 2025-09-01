// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const DEV_BYPASS = String(process.env.SKIP_AUTH).toLowerCase() === 'true';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL     || '15m';  // z.B. 15m
const REFRESH_TTL    = process.env.JWT_REFRESH_TTL    || '30d';  // z.B. 30d

/** Minimale Felder, die der Client über /me erhalten darf */
function sanitizeUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    tenantId: u.tenantId,
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

/** Access Token enthält nur, was wir für schnelle Checks brauchen */
function signAccess(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      tid: user.tenantId || null,
      sys: !!user.isSystemAdmin,
      ten: !!user.isTenantAdmin,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

/** Refresh Token: nur User-ID + Tokenversion (zum Invalidieren) */
function signRefresh(user) {
  const tv = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  return jwt.sign(
    { sub: String(user._id), tv },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );
}

async function attachUserFromAccess(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.status !== 'active') return res.status(403).json({ error: 'User not active' });
    req.user = user;       // volle Mongoose-Instanz (für Abfragen)
    req.me = sanitizeUser(user); // schlanke Sicht für Controller
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/** Pflicht-Auth für private (tenantisierte) APIs */
async function authRequired(req, res, next) {
  if (DEV_BYPASS) {
    // Dev-Benutzer (volle Rechte) – nur für lokale Entwicklung!
    req.user = new User({
      _id: '000000000000000000000000',
      tenantId: req.tenantId || 'dev-tenant',
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

/** Optionale Auth: für Public-/Survey-Routen, die anonym funktionieren dürfen */
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
  } catch (_e) {
    // Ignorieren, anonym weiter
  }
  return next();
}

/** Tokens ausstellen für Login/Refresh */
function issueTokens(user) {
  return {
    accessToken: signAccess(user),
    refreshToken: signRefresh(user),
  };
}

/** Refresh prüfen und neuen Access (und optional neuen Refresh) ausgeben */
async function rotateRefreshToken(refreshToken, { rotate = false } = {}) {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET); // { sub, tv }
    const user = await User.findById(payload.sub);
    if (!user) throw new Error('no user');
    const tv = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
    if (payload.tv !== tv) throw new Error('invalidated');

    const tokens = {
      accessToken: signAccess(user),
    };
    if (rotate) {
      // neue Version ausstellen (hartes Rotieren)
      user.tokenVersion = tv + 1;
      await user.save();
      tokens.refreshToken = signRefresh(user);
    }
    return { user, tokens };
  } catch (e) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
}

/** Logout: invalidiert alle vorhandenen Refresh Tokens durch Version++ */
async function invalidateRefreshTokens(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  const tv = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  user.tokenVersion = tv + 1;
  await user.save();
}

async function authRequiredStrict(req, res, next) {
  // ⬅️ KEIN DEV_BYPASS hier!
  return attachUserFromAccess(req, res, next);
}

module.exports = {
  authRequired,
  authRequiredStrict, // ⬅️ neu exportieren
  optionalAuth,
  issueTokens,
  rotateRefreshToken,
  invalidateRefreshTokens,
  sanitizeUser,
};
