// backend/routes/sysTenants.js
const express = require('express');
const router = express.Router();

const Tenant = require('../models/tenant');
const { authRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/authz');

// Nur System-Admins dürfen hier rein
router.use(authRequired, requireRoles('SystemAdmin'));

// Helpers
function isTenantIdValid(s) {
  return typeof s === 'string' && /^[a-zA-Z0-9_-]{2,64}$/.test(s);
}

/**
 * GET /api/sys/tenants
 * Liefert alle Tenants (Frontend filtert selbst aktive/gesperrte).
 */
router.get('/', async (_req, res, next) => {
  try {
    const list = await Tenant.find({}, { tenantId: 1, key: 1, name: 1, status: 1, updatedAt: 1 })
      .sort({ tenantId: 1 })
      .lean();

    // Fallback: key -> tenantId synchronisieren, falls im Modell nicht genutzt
    const normalized = (list || []).map(t => ({
      tenantId: t.tenantId || t.key,   // Frontend erwartet tenantId
      name: t.name || t.tenantId || t.key,
      status: t.status || 'active',
      updatedAt: t.updatedAt,
    }));

    res.json(normalized);
  } catch (e) { next(e); }
});

/**
 * POST /api/sys/tenants
 * Body: { tenantId, name, settings? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, name, settings } = req.body || {};
    if (!isTenantIdValid(tenantId)) {
      return res.status(400).json({ error: 'Ungültige tenantId (a–Z, 0–9, _ , -, 2–64)' });
    }
    if (!name || String(name).trim().length < 1) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    const exists = await Tenant.findOne({ $or: [{ tenantId }, { key: tenantId }] }).lean();
    if (exists) return res.status(409).json({ error: 'Tenant existiert bereits' });

    const doc = await Tenant.create({
      tenantId,
      key: tenantId,              // optionaler Alias für ältere Stellen
      name: String(name).trim(),
      status: 'active',
      settings: typeof settings === 'object' && settings ? settings : {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      tenantId: doc.tenantId || doc.key,
      name: doc.name,
      status: doc.status,
    });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/sys/tenants/:tenantId
 * Body: { name?, settings? }
 */
router.patch('/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { name, settings } = req.body || {};

    const updates = {};
    if (typeof name !== 'undefined') {
      if (!name || String(name).trim().length < 1) {
        return res.status(400).json({ error: 'Ungültiger Name' });
      }
      updates.name = String(name).trim();
    }
    if (typeof settings !== 'undefined') {
      if (settings && typeof settings !== 'object') {
        return res.status(400).json({ error: 'settings muss ein Objekt sein' });
      }
      updates.settings = settings || {};
    }
    updates.updatedAt = new Date();

    const doc = await Tenant.findOneAndUpdate(
      { $or: [{ tenantId }, { key: tenantId }] },
      { $set: updates },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Tenant nicht gefunden' });

    res.json({
      tenantId: doc.tenantId || doc.key,
      name: doc.name,
      status: doc.status,
    });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/sys/tenants/:tenantId/status
 * Body: { status: 'active' | 'suspended' }
 */
router.patch('/:tenantId/status', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }

    const doc = await Tenant.findOneAndUpdate(
      { $or: [{ tenantId }, { key: tenantId }] },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Tenant nicht gefunden' });

    res.json({
      tenantId: doc.tenantId || doc.key,
      name: doc.name,
      status: doc.status,
    });
  } catch (e) { next(e); }
});

module.exports = router;
