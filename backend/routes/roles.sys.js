// backend/routes/roles.sys.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Role = require('../models/role');
const { requireRoles } = require('../middleware/authz');

/**
 * Systemweite Rollen-API (System-Scope).
 * In Produktion sollte hier eine SystemAdmin-Absicherung greifen.
 * In Dev (SKIP_AUTH=true) ist das offen.
 */

// LIST
router.get('/', async (_req, res) => {
  try {
    const roles = await Role.find({ status: { $ne: 'deleted' } }).sort({ key: 1 }).lean();
    res.json(roles.map(r => ({
      _id: String(r._id),
      key: r.key,
      name: r.name,
      description: r.description || '',
      status: r.status || 'active',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DETAIL
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await Role.findById(id).lean();
    if (!r || r.status === 'deleted') return res.status(404).json({ error: 'Role nicht gefunden' });
    res.json({
      _id: String(r._id),
      key: r.key,
      name: r.name,
      description: r.description || '',
      status: r.status || 'active'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CREATE
router.post('/', /* requireRoles('SystemAdmin') */ async (req, res) => {
  try {
    const { key, name, description = '', status = 'active' } = req.body || {};
    if (!key || !/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
      return res.status(400).json({ error: 'Ungültiger key (A-Za-z[A-Za-z0-9_]*).' });
    }
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'name ist erforderlich (min. 2 Zeichen).' });
    }
    // Blockiere system-reservierte Keys
    if (['SystemAdmin','TenantAdmin','GroupAdmin'].includes(key)) {
      return res.status(400).json({ error: 'Reservierter Key, bitte nicht als Role anlegen.' });
    }

    const doc = new Role({
      key: key.trim(),
      name: String(name).trim(),
      description: String(description || ''),
      status: ['active','suspended','deleted'].includes(status) ? status : 'active'
    });
    await doc.save();
    res.status(201).json({
      _id: String(doc._id), key: doc.key, name: doc.name, description: doc.description, status: doc.status
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'key existiert bereits' });
    res.status(500).json({ error: e.message });
  }
});

// UPDATE
router.put('/:id', /* requireRoles('SystemAdmin') */ async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const { key, name, description, status } = req.body || {};
    const updates = {};

    if (typeof key !== 'undefined') {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) return res.status(400).json({ error: 'Ungültiger key' });
      if (['SystemAdmin','TenantAdmin','GroupAdmin'].includes(key)) {
        return res.status(400).json({ error: 'Reservierter Key' });
      }
      updates.key = key.trim();
    }
    if (typeof name !== 'undefined') {
      if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'name min. 2 Zeichen' });
      updates.name = String(name).trim();
    }
    if (typeof description !== 'undefined') updates.description = String(description || '');
    if (typeof status !== 'undefined') {
      if (!['active','suspended','deleted'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
      updates.status = status;
    }
    updates.updatedAt = new Date();

    const r = await Role.findOneAndUpdate({ _id: id }, { $set: updates }, { new: true, runValidators: true, context: 'query' }).lean();
    if (!r) return res.status(404).json({ error: 'Role nicht gefunden' });

    res.json({ _id: String(r._id), key: r.key, name: r.name, description: r.description || '', status: r.status || 'active' });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'key existiert bereits' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE (soft)
router.delete('/:id', /* requireRoles('SystemAdmin') */ async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const r = await Role.findOneAndUpdate({ _id: id }, { $set: { status: 'deleted', updatedAt: new Date() } }, { new: true }).lean();
    if (!r) return res.status(404).json({ error: 'Role nicht gefunden' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
