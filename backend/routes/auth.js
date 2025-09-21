const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User   = require('../models/user');
const Tenant = require('../models/tenant');
const Group  = require('../models/group');             // ⬅️ Gruppenmodell
const toUserDTO = require('../dto/toUserDTO');         // ⬅️ DTO-Mapper

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

/* ---------------- Register ---------------- */
router.post('/register', async (req, res, next) => {
  try {
    const { tenantId, displayName, email, password } = req.body || {};
    if (!tenantId || !displayName || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const tenant = await findActiveTenantByPublicOrKey(tenantId);
    if (!tenant) return res.status(400).json({ error: 'Unknown or inactive tenant' });

    const emailLc = String(email).toLowerCase().trim();
    const existing = await User.findOne({ tenant: tenant._id, email: emailLc });
    const hash = await bcrypt.hash(password, 12);

    if (!existing) {
      const user = await User.create({
        tenant: tenant._id,
        displayName: String(displayName).trim(),
        email: emailLc,
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
  } catch (e) { next(e); }
});

/* ---------------- Login ---------------- */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const emailLc = String(email).toLowerCase().trim();
    const candidates = await User.find({ email: emailLc }).limit(50);
    if (!candidates || candidates.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let chosen = null;

    // 1) Tenant-Präferenz (wenn angegeben)
    if (tenantId) {
      const t = await findActiveTenantByPublicOrKey(tenantId);
      if (!t) return res.status(400).json({ error: 'Unknown or inactive tenant' });
      chosen = candidates.find(u => String(u.tenant) === String(t._id)) || null;
    }

    // 2) Eindeutiger Treffer oder eindeutiger SysAdmin
    if (!chosen) {
      if (candidates.length === 1) {
        chosen = candidates[0];
      } else {
        const sysAdmins = candidates.filter(u => !!u.isSystemAdmin);
        if (sysAdmins.length === 1) chosen = sysAdmins[0];
      }
    }

    if (!chosen) {
      return res.status(400).json({ error: 'Email exists in multiple tenants, please pass tenantId.' });
    }

    if (chosen.status !== 'active') return res.status(403).json({ error: 'User not active' });
    if (!chosen.passwordHash)     return res.status(401).json({ error: 'Password not set' });

    const ok = await bcrypt.compare(password, chosen.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Für DTO: User mit Tenant-Infos + Gruppen des Tenants laden
    const populated = await User.findById(chosen._id)
      .populate({ path: 'tenant', select: 'tenantId name' })
      .lean();

    const groups = await Group.find({
      tenant: populated.tenant?._id || populated.tenant,
      status: { $ne: 'deleted' },
    }).select('_id groupId key name status').lean();

    const tokens = issueTokens(chosen);
    const dto    = toUserDTO(populated, { groups });

    // Konsistent zum FE: user-Objekt direkt (nicht unter {user: …})
    return res.json({ ...tokens, user: dto });
  } catch (e) { next(e); }
});

/* ---------------- Refresh ---------------- */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken, rotate } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

    const { user, tokens } = await rotateRefreshToken(refreshToken, { rotate: !!rotate });

    const populated = await User.findById(user._id)
      .populate({ path: 'tenant', select: 'tenantId name' })
      .lean();

    const groups = await Group.find({
      tenant: populated.tenant?._id || populated.tenant,
      status: { $ne: 'deleted' },
    }).select('_id groupId key name status').lean();

    const dto = toUserDTO(populated, { groups });
    return res.json({ ...tokens, user: dto });
  } catch (e) { next(e); }
});

/* ---------------- Logout ---------------- */
router.post('/logout', authRequiredStrict, async (req, res, next) => {
  try {
    await invalidateRefreshTokens(req.user._id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---------------- Me ---------------- */
router.get('/me', authRequiredStrict, async (req, res, next) => {
  try {
    const populated = await User.findById(req.user._id)
      .populate({ path: 'tenant', select: 'tenantId name' })
      .lean();
    if (!populated) return res.status(404).json({ error: 'not found' });

    const groups = await Group.find({
      tenant: populated.tenant?._id || populated.tenant,
      status: { $ne: 'deleted' },
    }).select('_id groupId key name status').lean();

    const dto = toUserDTO(populated, { groups });

    // Für dein FE: direkt den User-DTO zurückgeben (kein {user:…} Wrapper)
    res.json(dto);
  } catch (e) { next(e); }
});

/* ---------------- Change Password ---------------- */
router.post('/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Neues Passwort min. 8 Zeichen' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    const ok = user.passwordHash
      ? await bcrypt.compare(currentPassword || '', user.passwordHash)
      : false;
    if (!ok) return res.status(401).json({ error: 'Aktuelles Passwort falsch' });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true });
  } catch (e) {
    console.error('change-password error', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
