// backend/routes/sysAdmins.js
const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const User = require('../models/user');
const Tenant = require('../models/tenant');

const mail = require('../mail');

const { authRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/authz');

// Nur System-Admins dürfen in diesen Bereich
router.use(authRequired, requireRoles('SystemAdmin'));

/* ------------------------- Helpers ------------------------- */

const isEmail = (v) =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function randomPwd(len = 14) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// idempotent: sys-Tenant greifen (env oder key/tenantId "sys")
async function ensureSysTenant() {
  const key = process.env.SEED_SYS_TENANT_KEY || 'sys';
  const name = process.env.SEED_SYS_TENANT_NAME || 'System';
  let t = await Tenant.findOne({ $or: [{ key }, { tenantId: key }] });
  if (!t) {
    t = await Tenant.create({ key, tenantId: key, name, status: 'active' });
  }
  return t;
}

/* -------------------------- Routes ------------------------- */

/**
 * GET /api/sys/admins
 * Liste aller User mit isSystemAdmin=true (soft-deleted ausgeschlossen)
 */
router.get('/', async (_req, res, next) => {
  try {
    const list = await User.find(
      { isSystemAdmin: true, status: { $ne: 'deleted' } },
      'displayName email status isSystemAdmin isTenantAdmin tenant defaultGroupId invitedAt mustChangePassword updatedAt createdAt'
    ).lean();

    res.json(
      list.map((u) => ({
        _id: String(u._id),
        displayName: u.displayName || u.email || '',
        email: u.email || '',
        status: u.status || 'active',
        isSystemAdmin: !!u.isSystemAdmin,
        isTenantAdmin: !!u.isTenantAdmin,
        tenant: u.tenant ? String(u.tenant) : null,
        defaultGroupId: u.defaultGroupId ? String(u.defaultGroupId) : null,
        invitedAt: u.invitedAt || null,
        mustChangePassword: !!u.mustChangePassword,
        updatedAt: u.updatedAt,
        createdAt: u.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/sys/admins/invite
 * Body: { email, displayName }
 * – legt User (im sys-Tenant) an/aktiviert ihn als SystemAdmin
 * – generiert ein temporäres Passwort
 * – setzt mustChangePassword=true
 * – sendet Einladung per Mail (über ../mail)
 */
router.post('/invite', async (req, res, next) => {
  try {
    const { email, displayName } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: 'Ungültige Email' });
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ error: 'displayName min. 2 Zeichen' });
    }

    const sysTenant = await ensureSysTenant();

    const tempPassword = randomPwd(14);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);

    const emailLc = String(email).toLowerCase().trim();

    // existiert der User?
    let user = await User.findOne({ email: emailLc });

    if (!user) {
      user = new User({
        tenant: sysTenant._id, // SysAdmin wohnt im sys-Tenant
        displayName: String(displayName).trim(),
        email: emailLc,
        status: 'active',
        isSystemAdmin: true,
        isTenantAdmin: false,
        memberships: [],
        defaultGroupId: null,
        invitedAt: new Date(),
        mustChangePassword: true,
      });
    } else {
      // reaktivieren & hochstufen
      user.displayName = String(displayName).trim();
      user.status = 'active';
      user.isSystemAdmin = true;
      if (!user.tenant) user.tenant = sysTenant._id;
      user.invitedAt = new Date();
      user.mustChangePassword = true;
    }

    // Passwort setzen (Schema-kompatibel)
    if (typeof user.setPassword === 'function') {
      await user.setPassword(tempPassword); // falls Modell-Methode existiert
    } else {
      user.passwordHash = hash; // Fallback
    }

    await user.save();

    // Einladung per Mail senden
    const loginUrl =
      process.env.APP_PUBLIC_URL ||
      process.env.APP_BASE_URL ||
      'http://localhost:5173';

    // Payload über Orchestrator erzeugen (wenn verfügbar), sonst Fallback
    const payload =
      mail && typeof mail.inviteSysAdminEmail === 'function'
        ? mail.inviteSysAdminEmail({
            email: user.email,
            displayName: user.displayName,
            tempPassword,
            loginUrl,
          })
        : {
            to: user.email,
            subject: 'Einladung als System-Administrator',
            text:
              `Hallo ${user.displayName || user.email},\n\n` +
              `du wurdest als System-Administrator eingeladen.\n\n` +
              `Login: ${loginUrl}\n` +
              `Temporäres Passwort: ${tempPassword}\n\n` +
              `Bitte melde dich an und ändere dein Passwort.\n`,
            html:
              `<p>Hallo ${user.displayName || user.email},</p>` +
              `<p>du wurdest als <strong>System-Administrator</strong> eingeladen.</p>` +
              `<p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>` +
              `<strong>Temporäres Passwort:</strong> <code>${tempPassword}</code></p>` +
              `<p>Bitte melde dich an und ändere dein Passwort.</p>`,
          };

    try {
      if (mail && typeof mail.sendMail === 'function') {
        await mail.sendMail(payload);
      } else {
        // Fallback direkt über Transport (falls Orchestrator nicht verfügbar)
        const transport = require('../mail/transport');
        await transport.sendMail(payload);
      }
      console.log('[invite] SysAdmin mail sent:', { to: user.email });
    } catch (err) {
      console.error('[invite] mail send failed:', err.message);
      // Kein Hard-Fail: der User ist angelegt; Temp-PW geht in der Response mit raus
    }

    res.status(201).json({
      _id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      mustChangePassword: true,
      invitedAt: user.invitedAt,
      tempPassword, // solange bis du ausschließlich-mail-basiert arbeitest
      loginUrl,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/sys/admins/:id/status
 * Body: { status: 'active' | 'suspended' }
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!['active', 'suspended'].includes(status))
      return res.status(400).json({ error: 'Ungültiger Status' });

    const u = await User.findOneAndUpdate(
      { _id: id, isSystemAdmin: true },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ _id: String(u._id), status: u.status });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/sys/admins/:id/revoke
 * – entzieht SystemAdmin-Rechte
 */
router.patch('/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOneAndUpdate(
      { _id: id, isSystemAdmin: true },
      { $set: { isSystemAdmin: false, updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!u) return res.status(404).json({ error: 'User nicht gefunden oder kein SysAdmin' });

    res.json({ _id: String(u._id), isSystemAdmin: !!u.isSystemAdmin });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE (soft) /api/sys/admins/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
