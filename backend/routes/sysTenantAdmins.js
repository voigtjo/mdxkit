// backend/routes/sysTenantAdmins.js
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

// Nur System-Admins
router.use(authRequired, requireRoles('SystemAdmin'));

/* ------------------------- Helpers ------------------------- */
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function randomPwd(len = 14) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function findTenantByIdOrKey(idOrKey) {
  if (!idOrKey) return null;
  const byObjectId = mongoose.isValidObjectId(idOrKey);
  const t = await Tenant.findOne({
    $or: [{ tenantId: idOrKey }, { key: idOrKey }, ...(byObjectId ? [{ _id: idOrKey }] : [])],
  }).lean();
  return t;
}

/* -------------------------- Routes ------------------------- */

/**
 * GET /api/sys/tenants/:idOrKey/admins
 * Liste aller Tenant-Admins dieses Tenants
 */
router.get('/:idOrKey/admins', async (req, res, next) => {
  try {
    const t = await findTenantByIdOrKey(req.params.idOrKey);
    if (!t) return res.status(404).json({ error: 'Tenant nicht gefunden' });

    const list = await User.find(
      { tenant: t._id, isTenantAdmin: true, status: { $ne: 'deleted' } },
      'displayName email status isTenantAdmin isSystemAdmin invitedAt mustChangePassword updatedAt createdAt'
    ).lean();

    res.json(
      list.map((u) => ({
        _id: String(u._id),
        displayName: u.displayName || u.email || '',
        email: u.email || '',
        status: u.status || 'active',
        isTenantAdmin: !!u.isTenantAdmin,
        isSystemAdmin: !!u.isSystemAdmin,
        invitedAt: u.invitedAt || null,
        mustChangePassword: !!u.mustChangePassword,
        updatedAt: u.updatedAt,
        createdAt: u.createdAt,
      }))
    );
  } catch (e) { next(e); }
});

/**
 * POST /api/sys/tenants/:idOrKey/admins/invite
 * Body: { email, displayName }
 * Legt/reaktiviert User im TENANT an, setzt isTenantAdmin=true, Temp-Passwort + Mail
 */
router.post('/:idOrKey/admins/invite', async (req, res, next) => {
  try {
    const { email, displayName } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: 'Ungültige Email' });
    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ error: 'displayName min. 2 Zeichen' });
    }

    const t = await findTenantByIdOrKey(req.params.idOrKey);
    if (!t) return res.status(404).json({ error: 'Tenant nicht gefunden' });

    const tempPassword = randomPwd(14);
    const emailLc = String(email).toLowerCase().trim();

    let user = await User.findOne({ email: emailLc, tenant: t._id });
    if (!user) {
      // Falls es denselben Mail-User ohne tenant-Bezug gibt: bevorzugt TENANT binden
      user = new User({
        tenant: t._id,
        displayName: String(displayName).trim(),
        email: emailLc,
        status: 'active',
        isSystemAdmin: false,
        isTenantAdmin: true,
        memberships: [],
        defaultGroupId: null,
        invitedAt: new Date(),
        mustChangePassword: true,
      });
    } else {
      user.displayName = String(displayName).trim();
      user.status = 'active';
      user.isTenantAdmin = true;
      user.invitedAt = new Date();
      user.mustChangePassword = true;
    }

    // Passwort setzen
    if (typeof user.setPassword === 'function') {
      await user.setPassword(tempPassword);
    } else {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(tempPassword, salt);
    }
    await user.save();

    const loginUrl =
      process.env.APP_PUBLIC_URL ||
      process.env.APP_BASE_URL ||
      'http://localhost:5173';

    const payload =
      mail && typeof mail.inviteTenantAdminEmail === 'function'
        ? mail.inviteTenantAdminEmail({
            email: user.email,
            displayName: user.displayName,
            tempPassword,
            loginUrl,
            tenantName: t.name || t.tenantId || t.key,
            tenantId: t.tenantId || t.key,
          })
        : {
            to: user.email,
            subject: `[MDXKit] Einladung als Tenant-Admin (${t.name || t.tenantId || t.key})`,
            text:
              `Hallo ${user.displayName || user.email},\n\n` +
              `du wurdest als Tenant-Administrator für "${t.name || t.tenantId}" eingeladen.\n\n` +
              `Login: ${loginUrl}\n` +
              `Temporäres Passwort: ${tempPassword}\n\n` +
              `Bitte melde dich an und ändere dein Passwort.\n`,
            html:
              `<p>Hallo ${user.displayName || user.email},</p>` +
              `<p>du wurdest als <strong>Tenant-Administrator</strong> für ` +
              `<strong>${t.name || t.tenantId || t.key}</strong> eingeladen.</p>` +
              `<p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>` +
              `<strong>Temporäres Passwort:</strong> <code>${tempPassword}</code></p>` +
              `<p>Bitte melde dich an und ändere dein Passwort.</p>`,
          };

    try {
      if (mail && typeof mail.sendMail === 'function') {
        await mail.sendMail(payload);
      } else {
        const transport = require('../mail/transport');
        await transport.sendMail(payload);
      }
      console.log('[invite] TenantAdmin mail sent:', { to: user.email, tenant: t.tenantId || t.key });
    } catch (err) {
      console.error('[invite] tenantAdmin mail failed:', err.message);
    }

    res.status(201).json({
      _id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      mustChangePassword: true,
      invitedAt: user.invitedAt,
      tenant: t.tenantId || t.key,
      tempPassword, // solange Mails produktiv nicht erzwungen sind
      loginUrl,
    });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/sys/tenants/:idOrKey/admins/:userId/status
 * Body: { status: 'active' | 'suspended' }
 */
router.patch('/:idOrKey/admins/:userId/status', async (req, res, next) => {
  try {
    const { idOrKey, userId } = req.params;
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }
    const t = await findTenantByIdOrKey(idOrKey);
    if (!t) return res.status(404).json({ error: 'Tenant nicht gefunden' });
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const u = await User.findOneAndUpdate(
      { _id: userId, tenant: t._id, isTenantAdmin: true },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ _id: String(u._id), status: u.status });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/sys/tenants/:idOrKey/admins/:userId/revoke
 * Entzieht TenantAdmin-Rechte
 */
router.patch('/:idOrKey/admins/:userId/revoke', async (req, res, next) => {
  try {
    const t = await findTenantByIdOrKey(req.params.idOrKey);
    if (!t) return res.status(404).json({ error: 'Tenant nicht gefunden' });
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const u = await User.findOneAndUpdate(
      { _id: userId, tenant: t._id, isTenantAdmin: true },
      { $set: { isTenantAdmin: false, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden oder kein TenantAdmin' });
    res.json({ _id: String(u._id), isTenantAdmin: !!u.isTenantAdmin });
  } catch (e) { next(e); }
});

/**
 * DELETE (soft) /api/sys/tenants/:idOrKey/admins/:userId
 */
router.delete('/:idOrKey/admins/:userId', async (req, res, next) => {
  try {
    const t = await findTenantByIdOrKey(req.params.idOrKey);
    if (!t) return res.status(404).json({ error: 'Tenant nicht gefunden' });
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const u = await User.findOneAndUpdate(
      { _id: userId, tenant: t._id },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
