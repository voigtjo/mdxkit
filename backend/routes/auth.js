const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
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

async function findActiveTenantByPublicOrKey(idOrKey) {
  if (!idOrKey) return null;
  return Tenant.findOne({
    $or: [{ tenantId: idOrKey }, { key: idOrKey }],
    status: 'active',
  });
}

/**
 * POST /api/auth/register
 * Body: { tenantId, displayName, email, password }
 * - tenantId: Public-ID (ten_...) ODER key (z.B. "dev")
 */
router.post('/register', async (req, res, next) => {
  try {
    const { tenantId, displayName, email, password } = req.body || {};
    if (!tenantId || !displayName || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const tenant = await findActiveTenantByPublicOrKey(tenantId);
    if (!tenant) return res.status(400).json({ error: 'Unknown or inactive tenant' });

    const existing = await User.findOne({ tenant: tenant._id, email: String(email).toLowerCase().trim() });
    const hash = await bcrypt.hash(password, 12);

    if (!existing) {
      const user = await User.create({
        tenant: tenant._id,
        displayName: String(displayName).trim(),
        email: String(email).toLowerCase().trim(),
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
      existing.displayName = existing.displayName || String(displayName).trim();
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
 * Body: { email, password, tenantId? }  // tenantId optional; nötig, wenn Email mehrfach existiert
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const q = { email: String(email).toLowerCase().trim() };
    let user = null;

    if (tenantId) {
      const tenant = await findActiveTenantByPublicOrKey(tenantId);
      if (!tenant) return res.status(400).json({ error: 'Unknown or inactive tenant' });
      user = await User.findOne({ ...q, tenant: tenant._id });
    } else {
      const candidates = await User.find(q).limit(2);
      if (candidates.length > 1) {
        return res.status(400).json({ error: 'Email exists in multiple tenants, please pass tenantId.' });
      }
      user = candidates[0] || null;
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 'active') return res.status(403).json({ error: 'User not active' });
    if (!user.passwordHash) return res.status(401).json({ error: 'Password not set' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = issueTokens(user);
    return res.json({ user: sanitizeUser(user), ...tokens });
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
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
 */
router.get('/me', authRequiredStrict, async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
