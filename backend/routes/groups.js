// backend/routes/groups.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Group = require('../models/group');
const User = require('../models/user');
const { requireRoles } = require('../middleware/authz');

// Hilfen
const isKey = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-_]+$/.test(v);
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 1;
const toObjectId = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

// LIST
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const list = await Group.find({ status: { $ne: 'deleted' } })
      .setOptions({ tenantId })
      .sort({ name: 1, key: 1 })
      .lean();

    res.json(list.map(g => ({
      _id: String(g._id),
      key: g.key,
      name: g.name,
      description: g.description || '',
      status: g.status || 'active',
      primaryAdminUserId: g.primaryAdminUserId ? String(g.primaryAdminUserId) : null,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DETAIL
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const g = await Group.findOne({ _id: id }).setOptions({ tenantId }).lean();
    if (!g || g.status === 'deleted') return res.status(404).json({ error: 'Group nicht gefunden' });

    res.json({
      _id: String(g._id),
      key: g.key,
      name: g.name,
      description: g.description || '',
      status: g.status || 'active',
      primaryAdminUserId: g.primaryAdminUserId ? String(g.primaryAdminUserId) : null,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
router.post('/', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { key, name, description = '', status = 'active', primaryAdminUserId = null } = req.body || {};

    if (!isKey(key)) return res.status(400).json({ error: 'key ist erforderlich: [a-z0-9][a-z0-9-_]+' });
    if (!isNonEmpty(name)) return res.status(400).json({ error: 'name ist erforderlich (min. 2 Zeichen)' });

    let primaryAdmin = null;
    if (primaryAdminUserId) {
      const oid = toObjectId(primaryAdminUserId);
      if (!oid) return res.status(400).json({ error: 'Ungültige primaryAdminUserId' });
      primaryAdmin = await User.findOne({ _id: oid, status: { $ne: 'deleted' } })
        .setOptions({ tenantId }).lean();
      if (!primaryAdmin) {
        return res.status(400).json({ error: 'primaryAdminUserId gehört nicht zu diesem Tenant oder existiert nicht' });
      }
    }

    const doc = new Group({
      tenantId,
      key: key.trim(),
      name: name.trim(),
      description: String(description || ''),
      status: ['active','suspended','deleted'].includes(status) ? status : 'active',
      primaryAdminUserId: primaryAdmin ? primaryAdmin._id : null
    });

    await doc.save();
    res.status(201).json({
      _id: String(doc._id),
      key: doc.key,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      primaryAdminUserId: doc.primaryAdminUserId ? String(doc.primaryAdminUserId) : null
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'key existiert bereits in diesem Tenant' });
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const { key, name, description, status, primaryAdminUserId } = req.body || {};
    const updates = {};

    if (typeof key !== 'undefined') {
      if (!isKey(key)) return res.status(400).json({ error: 'Ungültiger key: [a-z0-9][a-z0-9-_]+' });
      updates.key = key.trim();
    }
    if (typeof name !== 'undefined') {
      if (!isNonEmpty(name)) return res.status(400).json({ error: 'name min. 2 Zeichen' });
      updates.name = name.trim();
    }
    if (typeof description !== 'undefined') updates.description = String(description || '');
    if (typeof status !== 'undefined') {
      if (!['active','suspended','deleted'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
      updates.status = status;
    }
    if (typeof primaryAdminUserId !== 'undefined') {
      if (primaryAdminUserId === null) {
        updates.primaryAdminUserId = null;
      } else {
        const oid = toObjectId(primaryAdminUserId);
        if (!oid) return res.status(400).json({ error: 'Ungültige primaryAdminUserId' });
        const admin = await User.findOne({ _id: oid, status: { $ne: 'deleted' } })
          .setOptions({ tenantId }).lean();
        if (!admin) return res.status(400).json({ error: 'primaryAdminUserId gehört nicht zu diesem Tenant oder existiert nicht' });
        updates.primaryAdminUserId = admin._id;
      }
    }

    updates.updatedAt = new Date();

    const g = await Group.findOneAndUpdate(
      { _id: id },
      { $set: updates },
      { new: true, runValidators: true, context: 'query', tenantId }
    ).lean();

    if (!g) return res.status(404).json({ error: 'Group nicht gefunden' });

    res.json({
      _id: String(g._id),
      key: g.key,
      name: g.name,
      description: g.description || '',
      status: g.status || 'active',
      primaryAdminUserId: g.primaryAdminUserId ? String(g.primaryAdminUserId) : null
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'key existiert bereits' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft)
router.delete('/:id', requireRoles('TenantAdmin', 'SystemAdmin'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const g = await Group.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'deleted', updatedAt: new Date() } },
      { new: true, tenantId }
    ).lean();

    if (!g) return res.status(404).json({ error: 'Group nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MEMBERS (read-only Übersicht): users mit Mitgliedschaft in der Group
router.get('/:id/members', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const users = await User.find({
      status: { $ne: 'deleted' },
      'memberships.groupId': new mongoose.Types.ObjectId(id)
    })
      .setOptions({ tenantId })
      .select({ _id: 1, displayName: 1, email: 1, status: 1, memberships: 1 })
      .sort({ displayName: 1, email: 1 })
      .lean();

    const mapped = users.map(u => {
      const m = (u.memberships || []).find(x => String(x.groupId) === id);
      return {
        _id: String(u._id),
        name: u.displayName || u.email || 'Unbenannt',
        email: u.email || '',
        status: u.status || 'active',
        roles: Array.isArray(m?.roles) ? m.roles : []
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
