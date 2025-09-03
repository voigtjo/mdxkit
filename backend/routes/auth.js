// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Tenant = require('../models/tenant');

const {
  authRequiredStrict,
  issueTokens,
  rotateRefreshToken,
  invalidateRefreshTokens,
  sanitizeUser,
} = require('../middleware/auth');

const router = express.Router();

async function ensureTenant(tenantId) {
  if (!tenantId) return null;
  const t = await Tenant.findOne({ tenantId, status: 'active' });
  return t || null;
}

/**
 * POST /api/auth/register
 * Body: { tenantId, displayName, email, password }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { tenantId, displayName, email, password } = req.body || {};
    if (!tenantId || !displayName || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const tenant = await ensureTenant(tenantId);
    if (!tenant) return res.status(400).json({ error: 'Unknown or inactive tenant' });

    const existing = await User.findOne({ tenantId, email });
    const hash = await bcrypt.hash(password, 12);

    if (!existing) {
      const user = await User.create({
        tenantId,
        displayName,
        email,
        status: 'active',
        isSystemAdmin: false,
        isTenantAdmin: false,
        defaultGroupId: null,
        memberships: [],
        passwordHash: hash,
        tokenVersion: 0,
      });
      return res.json({ user: sanitizeUser(user) });
    }

    if (!existing.passwordHash) {
      existing.displayName = existing.displayName || displayName;
      existing.passwordHash = hash;
      if (existing.status !== 'active') existing.status = 'active';
      await existing.save();
      return res.json({ user: sanitizeUser(existing) });
    }

    return res.status(409).json({ error: 'User already registered' });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }   ⬅️ tenantId fällt weg!
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // User nur anhand der Email finden.
    // Annahme: Emails sind global eindeutig – falls nicht, passe hier auf deine Logik an.
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 'active') return res.status(403).json({ error: 'User not active' });
    if (!user.passwordHash) return res.status(401).json({ error: 'Password not set' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Tenant kommt aus user.tenantId; SysAdmin hat ggf. keinen Tenant
    const tokens = issueTokens(user);
    return res.json({ user: sanitizeUser(user), ...tokens });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken, rotate? }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken, rotate } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
    const { user, tokens } = await rotateRefreshToken(refreshToken, { rotate: !!rotate });
    return res.json({ user: sanitizeUser(user), ...tokens });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <access>
 */
router.post('/logout', authRequiredStrict, async (req, res, next) => {
  try {
    await invalidateRefreshTokens(req.user._id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <access>
 */
router.get('/me', authRequiredStrict, async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
