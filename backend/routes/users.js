// backend/routes/users.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const User = require('../models/user');
const Group = require('../models/group');
const Role = require('../models/role');
const Tenant = require('../models/tenant');

const mail = require('../mail');
const { requireRoles } = require('../middleware/authz');

const FORBIDDEN_ROLE_KEYS = new Set(['SystemAdmin', 'TenantAdmin', 'GroupAdmin']);
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const toObjectId = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

function randomPwd(len = 14) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Einheitliche Ausgabeform für User-Objekte */
function sanitizeUser(u) {
  if (!u) return null;
  const memberships = Array.isArray(u.memberships) ? u.memberships : [];
  return {
    _id: String(u._id),
    displayName: u.displayName || '',
    name: u.displayName || u.email || 'Unbenannt',
    email: u.email || '',
    status: u.status || 'active',
    isSystemAdmin: !!u.isSystemAdmin,
    isTenantAdmin: !!u.isTenantAdmin,
    defaultGroupId: u.defaultGroupId ? String(u.defaultGroupId) : null,
    memberships: memberships.map(m => ({
      groupId: String(m.groupId),
      roles: Array.isArray(m.roles) ? m.roles : []
    })),
    profile: u.profile || {},
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    tenant: u.tenant, // meist ObjectId
    // Einladungs-/Onboarding-Felder:
    invitedAt: u.invitedAt || null,
    mustChangePassword: !!u.mustChangePassword,
    lastInviteEmailAt: u.lastInviteEmailAt || null,
    lastInviteEmailStatus: u.lastInviteEmailStatus || null,
  };
}

async function sanitizeMemberships(tenantObjId, memberships) {
  if (!Array.isArray(memberships)) return [];
  // gültige Groups im Tenant
  const groupIds = memberships.map(m => m?.groupId).filter(Boolean).map(String);
  const validGroups = await Group.find({
    _id: { $in: groupIds.map(toObjectId).filter(Boolean) },
    tenant: tenantObjId,
    status: { $ne: 'deleted' }
  }).select({ _id: 1 }).lean();
  const validGroupSet = new Set(validGroups.map(g => String(g._id)));

  // gültige Rollen
  const allRoles = Array.from(new Set(memberships.flatMap(m => Array.isArray(m?.roles) ? m.roles : [])))
    .filter(k => typeof k === 'string' && k.trim() && !FORBIDDEN_ROLE_KEYS.has(k));
  const dbRoles = await Role.find({ key: { $in: allRoles }, status: { $ne: 'deleted' } }).select({ key: 1 }).lean();
  const validRoleSet = new Set(dbRoles.map(r => r.key));

  // zusammensetzen
  const cleaned = [];
  for (const m of memberships) {
    const gid = String(m?.groupId || '');
    if (!validGroupSet.has(gid)) continue;
    const roles = Array.isArray(m?.roles) ? m.roles.filter(r => validRoleSet.has(r) && !FORBIDDEN_ROLE_KEYS.has(r)) : [];
    cleaned.push({ groupId: toObjectId(gid), roles: Array.from(new Set(roles)) });
  }
  return cleaned;
}

// LIST
router.get('/', async (req, res, next) => {
  try {
    const tenant = req.tenant; // ObjectId
    const users = await User.find(
      { tenant, status: { $ne: 'deleted' } },
      // ➕ Felder für Einladung/Resend anzeigen:
      'displayName email status defaultGroupId memberships isTenantAdmin invitedAt mustChangePassword lastInviteEmailAt lastInviteEmailStatus'
    ).lean();

    users.forEach(u => { u.name = u.displayName || u.email || ''; });
    res.json(users);
  } catch (e) { next(e); }
});

// DETAIL
router.get('/:id', async (req, res) => {
  try {
    const tenant = req.tenant;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOne({ _id: id, tenant }).lean();
    if (!u || u.status === 'deleted') return res.status(404).json({ error: 'User nicht gefunden' });

    res.json(sanitizeUser(u));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE
router.post('/', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenant = req.tenant;
    const {
      displayName, email = '', status = 'active',
      isTenantAdmin = false,
      memberships = [],
      defaultGroupId = null,
      profile = {}
    } = req.body || {};

    if (!displayName || String(displayName).trim().length < 2) {
      return res.status(400).json({ error: 'displayName ist erforderlich (min. 2 Zeichen).' });
    }
    if (email && !isEmail(email)) return res.status(400).json({ error: 'E-Mail ist ungültig.' });

    const cleanedMemberships = await sanitizeMemberships(tenant, memberships);
    let defaultGid = null;
    if (defaultGroupId) {
      const oid = toObjectId(defaultGroupId);
      if (!oid) return res.status(400).json({ error: 'Ungültige defaultGroupId' });
      const found = cleanedMemberships.some(m => String(m.groupId) === String(oid));
      if (!found) return res.status(400).json({ error: 'defaultGroupId muss in memberships enthalten sein' });
      defaultGid = oid;
    }

    const doc = new User({
      tenant,
      displayName: String(displayName).trim(),
      email: String(email || '').toLowerCase().trim(),
      status: ['active','suspended','deleted'].includes(status) ? status : 'active',
      isTenantAdmin: !!isTenantAdmin,
      defaultGroupId: defaultGid,
      memberships: cleanedMemberships,
      profile: typeof profile === 'object' && profile ? profile : {}
    });

    await doc.save();
    res.status(201).json({
      _id: String(doc._id),
      name: doc.displayName || doc.email || 'Unbenannt',
      email: doc.email || '',
      status: doc.status,
      isTenantAdmin: !!doc.isTenantAdmin
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE
router.put('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenant = req.tenant;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const { displayName, email, status, isTenantAdmin, memberships, defaultGroupId, profile } = req.body || {};
    const updates = {};

    if (typeof displayName !== 'undefined') {
      if (!displayName || String(displayName).trim().length < 2) return res.status(400).json({ error: 'displayName min. 2 Zeichen' });
      updates.displayName = String(displayName).trim();
    }
    if (typeof email !== 'undefined') {
      if (email && !isEmail(email)) return res.status(400).json({ error: 'E-Mail ist ungültig.' });
      updates.email = String(email || '').toLowerCase().trim();
    }
    if (typeof status !== 'undefined') {
      if (!['active','suspended','deleted'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
      updates.status = status;
    }
    if (typeof isTenantAdmin !== 'undefined') {
      updates.isTenantAdmin = !!isTenantAdmin;
    }
    if (typeof memberships !== 'undefined') {
      updates.memberships = await sanitizeMemberships(tenant, memberships);
    }
    if (typeof defaultGroupId !== 'undefined') {
      if (defaultGroupId === null) {
        updates.defaultGroupId = null;
      } else {
        const oid = toObjectId(defaultGroupId);
        if (!oid) return res.status(400).json({ error: 'Ungültige defaultGroupId' });
        const mbs = updates.memberships ?? (await User.findOne({ _id: id, tenant }).select({ memberships: 1 }).lean())?.memberships;
        const found = (mbs || []).some(m => String(m.groupId) === String(oid));
        if (!found) return res.status(400).json({ error: 'defaultGroupId muss in memberships enthalten sein' });
        updates.defaultGroupId = oid;
      }
    }
    if (typeof profile !== 'undefined') {
      if (profile && typeof profile !== 'object') return res.status(400).json({ error: 'profile muss Objekt sein' });
      updates.profile = profile || {};
    }

    updates.updatedAt = new Date();

    const u = await User.findOneAndUpdate(
      { _id: id, tenant },
      { $set: updates },
      { new: true, runValidators: true, setDefaultsOnInsert: true, context: 'query' }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });

    res.json({
      _id: String(u._id),
      name: u.displayName || u.email || 'Unbenannt',
      email: u.email || '',
      status: u.status,
      isTenantAdmin: !!u.isTenantAdmin
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE (soft)
router.delete('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenant = req.tenant;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOneAndUpdate(
      { _id: id, tenant },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * ✅ INVITE / RESEND
 * POST /api/tenant/:tenantId/users/:userId/invite
 * – setzt Temp-Passwort + mustChangePassword=true
 * – versendet Einladungsmail
 * – schreibt invitedAt / lastInviteEmailAt / lastInviteEmailStatus
 */
router.post('/:userId/invite', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const user = await User.findOne({ _id: userId, tenant });
    if (!user || user.status === 'deleted') return res.status(404).json({ error: 'User nicht gefunden' });
    if (!user.email) return res.status(400).json({ error: 'User hat keine E-Mail-Adresse' });

    const t = await Tenant.findById(tenant).lean();
    const tenantName = t?.name || t?.tenantId || 'Tenant';
    const tenantId   = t?.tenantId || '';

    // Temp-Passwort setzen + mustChangePassword
    const tempPassword = randomPwd(14);
    if (typeof user.setPassword === 'function') {
      await user.setPassword(tempPassword);
    } else {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(tempPassword, salt);
    }
    user.mustChangePassword = true;
    if (!user.invitedAt) user.invitedAt = new Date();
    await user.save();

    // Mail aufbauen
    const loginUrl = process.env.APP_PUBLIC_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
    const payload =
      typeof mail.inviteTenantUserEmail === 'function'
        ? mail.inviteTenantUserEmail({
            email: user.email,
            displayName: user.displayName || user.email,
            tenantName,
            tenantId,
            tempPassword,
            loginUrl,
          })
        : {
            to: user.email,
            subject: `[MDXKit] Einladung (${tenantName})`,
            text:
              `Hallo ${user.displayName || user.email},\n\n` +
              `Sie wurden für den Tenant "${tenantName}" eingeladen.\n\n` +
              `Login: ${loginUrl}\n` +
              `Temporäres Passwort: ${tempPassword}\n\n` +
              `Bitte melden Sie sich an und ändern Sie Ihr Passwort.\n`,
            html:
              `<p>Hallo ${user.displayName || user.email},</p>` +
              `<p>Sie wurden für den Tenant <strong>${tenantName}</strong> eingeladen.</p>` +
              `<p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>` +
              `<strong>Temporäres Passwort:</strong> <code>${tempPassword}</code></p>` +
              `<p>Bitte melden Sie sich an und ändern Sie Ihr Passwort.</p>`,
          };

    console.log('[users:invite] → send', { tenant: tenantId || String(tenant), userId, to: user.email });
    let status = 'sent';
    try {
      const resp = await mail.sendMail(payload);
      console.log('[users:invite] ← mail result', { ok: !!resp?.ok, dryRun: !!resp?.dryRun });
      status = resp?.ok ? 'sent' : (resp?.dryRun ? 'dryrun' : 'failed');
    } catch (e) {
      console.error('[users:invite] send FAIL:', e.message);
      status = 'failed';
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { lastInviteEmailAt: new Date(), lastInviteEmailStatus: status } }
    );

    return res.json({
      ok: status === 'sent' || status === 'dryrun',
      invitedAt: user.invitedAt,
      lastInviteEmailAt: new Date(),
      lastInviteEmailStatus: status,
      message: status === 'sent'
        ? 'Einladung gesendet.'
        : status === 'dryrun'
          ? 'MAIL_ENABLED=false (DRY-RUN) – Einladung nicht wirklich gesendet.'
          : 'Versand fehlgeschlagen.',
    });
  } catch (e) { next(e); }
});

module.exports = router;
