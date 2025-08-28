const express = require('express');
const router = express.Router();
const User = require('../models/user');

// GET /api/tenant/:tenantId/users
// → alle aktiven Users des aktuellen Tenants (kompakte Felder)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const list = await User.find({ status: 'active' })
      .setOptions({ tenantId })
      .select({ _id: 1, displayName: 1, email: 1 })
      .sort({ displayName: 1 })
      .lean();

    // Kompatibel zu ehemaligem Patient-Frontend: { _id, name }
    const mapped = list.map(u => ({
      _id: String(u._id),
      name: u.displayName || u.email || 'Unbenannt',
      email: u.email || '',
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tenant/:tenantId/users/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const u = await User.findOne({ _id: req.params.id })
      .setOptions({ tenantId })
      .select({ _id: 1, displayName: 1, email: 1, status: 1 })
      .lean();

    if (!u) return res.status(404).json({ error: 'User nicht gefunden' });
    res.json({
      _id: String(u._id),
      name: u.displayName || u.email || 'Unbenannt',
      email: u.email || '',
      status: u.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
