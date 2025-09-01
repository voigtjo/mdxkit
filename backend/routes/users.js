// backend/routes/users.js
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

async function sanitizeMemberships(tenantId, memberships) {
  if (!Array.isArray(memberships)) return [];
  // Valid Groups (im Tenant)
  const groupIds = memberships.map(m => m?.groupId).filter(Boolean);
  const validGroupIds = (await Group.find({
    _id: { $in: groupIds.map(toObjectId).filter(Boolean) },
    status: { $ne: 'deleted' }
  }).setOptions({ tenantId }).select({ _id: 1 }).lean()).map(g => String(g._id));
  const validGroupSet = new Set(validGroupIds);

  // Valid roles from Role collection (active/suspended)
  const allRoles = Array.from(new Set(memberships.flatMap(m => Array.isArray(m?.roles) ? m.roles : [])))
    .filter(k => typeof k === 'string' && k.trim() && !FORBIDDEN_ROLE_KEYS.has(k));
  const dbRoles = await Role.find({ key: { $in: allRoles }, status: { $ne: 'deleted' } }).select({ key: 1 }).lean();
  const validRoleSet = new Set(dbRoles.map(r => r.key));

  // Compose
  const cleaned = [];
  for (const m of memberships) {
    const gid = String(m?.groupId || '');
    if (!validGroupSet.has(gid)) continue;
    const roles = Array.isArray(m?.roles) ? m.roles.filter(r => validRoleSet.has(r) && !FORBIDDEN_ROLE_KEYS.has(r)) : [];
    cleaned.push({ groupId: toObjectId(gid), roles: Array.from(new Set(roles)) });
  }
  return cleaned;
}

// LIST (kompakt)
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId; // <— statt const { tenantId } = req.params
    const users = await User.find(
      { tenantId, status: { $ne: 'deleted' } },
      'displayName email status defaultGroupId memberships isTenantAdmin'
    ).lean();

    users.forEach(u => { u.name = u.displayName || u.email || ''; });
    res.json(users);
  } catch (e) {
    next(e);
  }
});


// DETAIL
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOne({ _id: id }).setOptions({ tenantId }).lean();
    if (!u || u.status === 'deleted') return res.status(404).json({ error: 'User nicht gefunden' });

    res.json({
      _id: String(u._id),
      displayName: u.displayName || '',
      email: u.email || '',
      status: u.status || 'active',
      isSystemAdmin: !!u.isSystemAdmin, // nur lesbar (nicht setzbar hier)
      isTenantAdmin: !!u.isTenantAdmin,
      defaultGroupId: u.defaultGroupId ? String(u.defaultGroupId) : null,
      memberships: (u.memberships || []).map(m => ({
        groupId: String(m.groupId),
        roles: Array.isArray(m.roles) ? m.roles : []
      })),
      profile: u.profile || {},
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
router.post('/', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
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

    const cleanedMemberships = await sanitizeMemberships(tenantId, memberships);
    let defaultGid = null;
    if (defaultGroupId) {
      const oid = toObjectId(defaultGroupId);
      if (!oid) return res.status(400).json({ error: 'Ungültige defaultGroupId' });
      const found = cleanedMemberships.some(m => String(m.groupId) === String(oid));
      if (!found) return res.status(400).json({ error: 'defaultGroupId muss in memberships enthalten sein' });
      defaultGid = oid;
    }

    const doc = new User({
      tenantId,
      displayName: String(displayName).trim(),
      email: String(email || '').trim(),
      status: ['active','suspended','deleted'].includes(status) ? status : 'active',
      isTenantAdmin: !!isTenantAdmin,
      // isSystemAdmin darf hier NICHT gesetzt werden
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
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
      updates.email = String(email || '').trim();
    }
    if (typeof status !== 'undefined') {
      if (!['active','suspended','deleted'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
      updates.status = status;
    }
    if (typeof isTenantAdmin !== 'undefined') {
      updates.isTenantAdmin = !!isTenantAdmin;
    }
    if (typeof memberships !== 'undefined') {
      updates.memberships = await sanitizeMemberships(tenantId, memberships);
    }
    if (typeof defaultGroupId !== 'undefined') {
      if (defaultGroupId === null) {
        updates.defaultGroupId = null;
      } else {
        const oid = toObjectId(defaultGroupId);
        if (!oid) return res.status(400).json({ error: 'Ungültige defaultGroupId' });
        const mbs = updates.memberships ?? (await User.findOne({ _id: id }).setOptions({ tenantId }).select({ memberships: 1 }).lean()).memberships;
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
      { _id: id },
      { $set: updates },
      { new: true, runValidators: true, setDefaultsOnInsert: true, context: 'query', tenantId }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });

    res.json({
      _id: String(u._id),
      name: u.displayName || u.email || 'Unbenannt',
      email: u.email || '',
      status: u.status,
      isTenantAdmin: !!u.isTenantAdmin
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft)
router.delete('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const u = await User.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { new: true, tenantId }
    ).lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/tenant/:tenantId/users/:userId/flags
 * Body: { isTenantAdmin?: boolean, defaultGroupId?: ObjectId | null }
 */
router.put('/:userId/flags', async (req, res, next) => {
  try {
    const { tenantId } = req.params; // String (z. B. 'dev')
    const { userId } = req.params;
    const { isTenantAdmin, defaultGroupId } = req.body || {};

    const user = await User.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: 'User not found in tenant' });
    }

    if (typeof isTenantAdmin === 'boolean') {
      user.isTenantAdmin = isTenantAdmin;
    }

    if (defaultGroupId === null) {
      user.defaultGroupId = null;
    } else if (defaultGroupId) {
      // validieren, dass die Group zum selben Tenant gehört
      const grp = await Group.findById(defaultGroupId);
      if (!grp || grp.tenantId !== tenantId) {
        return res.status(400).json({ error: 'defaultGroupId not in tenant' });
      }
      user.defaultGroupId = grp._id;
    }

    await user.save();
    return res.json({ user });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/tenant/:tenantId/users/:userId/memberships
 * Body: { memberships: [{ groupId, roles: [String] }, ...] }
 * Validiert, dass alle groups zum Tenant gehören.
 */
router.put('/:userId/memberships', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { userId } = req.params;
    const { memberships } = req.body || {};

    const user = await User.findById(userId);
    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: 'User not found in tenant' });
    }

    if (!Array.isArray(memberships)) {
      return res.status(400).json({ error: 'memberships must be array' });
    }

    // Validierung: alle GroupIds gehören zu diesem Tenant
    const groupIds = memberships.map(m => m.groupId).filter(Boolean);
    const groups = await Group.find({ _id: { $in: groupIds } });
    const invalid = groups.find(g => g.tenantId !== tenantId);
    if (invalid) {
      return res.status(400).json({ error: 'One or more groups are not in tenant' });
    }

    // Speichern (einfach ersetzen)
    user.memberships = memberships.map(m => ({
      groupId: new mongoose.Types.ObjectId(String(m.groupId)),
      roles: Array.isArray(m.roles) ? m.roles : [],
    }));

    await user.save();
    return res.json({ user });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
