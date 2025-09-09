const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user');
const Tenant = require('../models/tenant');


const {
  authRequired,
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
// routes/auth.js  (nur den /login-Handler ersetzen)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const emailLc = String(email).toLowerCase().trim();

    // Alle Kandidaten mit dieser E-Mail holen
    const candidates = await User.find({ email: emailLc }).limit(50);
    if (!candidates || candidates.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let chosen = null;

    // 1) Wenn tenantId mitkommt: dort bevorzugt suchen
    if (tenantId) {
      const tenant = await findActiveTenantByPublicOrKey(tenantId);
      if (!tenant) return res.status(400).json({ error: 'Unknown or inactive tenant' });
      chosen = candidates.find(u => String(u.tenant) === String(tenant._id)) || null;
    }

    // 2) Fallbacks, wenn nichts gefunden
    if (!chosen) {
      if (candidates.length === 1) {
        chosen = candidates[0];
      } else {
        const sysAdmins = candidates.filter(u => !!u.isSystemAdmin);
        if (sysAdmins.length === 1) {
          chosen = sysAdmins[0]; // Eindeutiger SysAdmin -> nehmen
        }
      }
    }

    // 3) Wenn weiterhin unklar, bewusst stoppen (wie bisher)
    if (!chosen) {
      return res.status(400).json({ error: 'Email exists in multiple tenants, please pass tenantId.' });
    }

    if (chosen.status !== 'active') return res.status(403).json({ error: 'User not active' });
    if (!chosen.passwordHash) return res.status(401).json({ error: 'Password not set' });

    const ok = await bcrypt.compare(password, chosen.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = issueTokens(chosen);
    return res.json({ user: sanitizeUser(chosen), ...tokens });
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

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * – setzt mustChangePassword=false
 */
router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Neues Passwort min. 8 Zeichen' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    // Wenn du eine Methode hast:
    const verify = typeof user.verifyPassword === 'function'
      ? await user.verifyPassword(currentPassword)
      : (user.passwordHash ? await bcrypt.compare(currentPassword || '', user.passwordHash) : false);

    // Bei „mustChangePassword“ kannst du den Current-Check weicher machen – ich lasse ihn an.
    if (!verify) return res.status(401).json({ error: 'Aktuelles Passwort falsch' });

    if (typeof user.setPassword === 'function') {
      await user.setPassword(newPassword);
    } else {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true });
  } catch (e) {
    console.error('change-password error', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
