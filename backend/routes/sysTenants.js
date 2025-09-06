// backend/routes/sysTenants.js
// System-scope Tenant administration (requires System Admin).
// Base mount: /api/sys/tenants
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authRequired } = require('../middleware/auth');
const { requireSystemAdmin } = require('../middleware/authz');

const Tenant = require('../models/tenant');

// Ensure auth + system admin for all routes in this file
router.use(authRequired, requireSystemAdmin);

// GET /api/sys/tenants
router.get('/', async (_req, res, next) => {
  try {
    const list = await Tenant.find({}, { __v: 0 }).sort({ createdAt: 1 }).lean();
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/sys/tenants
// body: { tenantId, name, settings? }
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, name, settings } = req.body || {};
    if (!tenantId || !/^[a-zA-Z0-9_-]{2,64}$/.test(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenantId (allowed: a–Z, 0–9, _ , -, len 2–64).' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const exists = await Tenant.findOne({ tenantId });
    if (exists) return res.status(409).json({ error: 'Tenant already exists.' });

    const doc = await Tenant.create({
      tenantId,
      name: String(name).trim(),
      status: 'active',
      settings: settings || {},
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// PATCH /api/sys/tenants/:tenantId
// body: { name?, settings? }
router.patch('/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, settings } = req.body || {};
    const doc = await Tenant.findOne({ tenantId });
    if (!doc) return res.status(404).json({ error: 'Tenant not found' });

    if (typeof name === 'string' && name.trim()) doc.name = name.trim();
    if (settings && typeof settings === 'object') doc.settings = settings;

    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
});

// PATCH /api/sys/tenants/:tenantId/status
// body: { status: 'active' | 'suspended' }
router.patch('/:tenantId/status', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const doc = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: { status } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Tenant not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE /api/sys/tenants/:tenantId
// Hard delete (rare). Prefer status=suspended for "soft delete".
router.delete('/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const deleted = await Tenant.findOneAndDelete({ tenantId });
    if (!deleted) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
