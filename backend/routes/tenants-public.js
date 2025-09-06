// backend/routes/tenants-public.js
const express = require('express');
const mongoose = require('mongoose');
const Tenant = require('../models/tenant');

const router = express.Router();

// GET /api/tenants  → nur aktive Tenants (minimal)
router.get('/', async (_req, res) => {
  try {
    const tenants = await Tenant.find({ status: 'active' })
      .select({ _id: 0, tenantId: 1, name: 1 })
      .sort({ name: 1 })
      .lean();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tenants/:idOrKey
 * Sucht flexibel nach:
 *  - tenantId === :idOrKey
 *  - key === :idOrKey        (falls dein Schema ein 'key' hat)
 *  - _id === :idOrKey        (falls gültige ObjectId übergeben wird)
 * Nur aktive Tenants werden zurückgegeben.
 */
router.get('/:idOrKey', async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const byObjectId = mongoose.isValidObjectId(idOrKey);

    const query = {
      status: 'active',
      $or: [
        { tenantId: idOrKey },
        { key: idOrKey },               // harmless, auch wenn Feld nicht existiert
        ...(byObjectId ? [{ _id: idOrKey }] : []),
      ],
    };

    const t = await Tenant.findOne(query)
      .select({ _id: 0, tenantId: 1, name: 1 })
      .lean();

    if (!t) return res.status(404).json({ error: 'Tenant not found' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
