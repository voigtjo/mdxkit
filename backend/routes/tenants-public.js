const express = require('express');
const router = express.Router();
const Tenant = require('../models/tenant');

// GET /api/tenants  → nur aktive Tenants, minimale Felder
router.get('/', async (_req, res) => {
  try {
    const tenants = await Tenant.find({ status: 'active' })
      .select({ _id: 0, tenantId: 1, name: 1 }) // nur das Nötigste
      .sort({ name: 1 })
      .lean();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
