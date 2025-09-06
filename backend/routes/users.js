const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const User = require('../models/user');
const Group = require('../models/group');
const Role = require('../models/role');
const { requireRoles } = require('../middleware/authz');

const FORBIDDEN_ROLE_KEYS = new Set(['SystemAdmin', 'TenantAdmin', 'GroupAdmin']);
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const toObjectId = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

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
      'displayName email status defaultGroupId memberships isTenantAdmin'
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
 * PUT /api/tenant/:tenantId/users/:userId/flags
 * Body: { isTenantAdmin?: boolean, defaultGroupId?: ObjectId | null }
 */
router.put('/:userId/flags', async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const user = await User.findOne({ _id: userId, tenant });
    if (!user) return res.status(404).json({ error: 'User not found in tenant' });

    const { isTenantAdmin, defaultGroupId } = req.body || {};

    if (typeof isTenantAdmin === 'boolean') user.isTenantAdmin = isTenantAdmin;

    if (defaultGroupId === null) {
      user.defaultGroupId = null;
    } else if (defaultGroupId) {
      const gid = toObjectId(defaultGroupId);
      if (!gid) return res.status(400).json({ error: 'Ungültige defaultGroupId' });
      const grp = await Group.findOne({ _id: gid, tenant });
      if (!grp) return res.status(400).json({ error: 'defaultGroupId not in tenant' });
      user.defaultGroupId = grp._id;
    }

    await user.save();
    return res.json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
});

/**
 * PUT /api/tenant/:tenantId/users/:userId/memberships
 * Body: { memberships: [{ groupId, roles: [String] }, ...] }
 */
router.put('/:userId/memberships', async (req, res, next) => {
  try {
    const tenant = req.tenant;
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Invalid userId' });

    const user = await User.findOne({ _id: userId, tenant });
    if (!user) return res.status(404).json({ error: 'User not found in tenant' });

    const { memberships } = req.body || {};
    if (!Array.isArray(memberships)) return res.status(400).json({ error: 'memberships must be array' });

    const cleaned = await sanitizeMemberships(tenant, memberships);
    user.memberships = cleaned;
    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
});

module.exports = router;
