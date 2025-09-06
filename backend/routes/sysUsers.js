const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');

const router = express.Router();

/**
 * PUT /api/sys/users/:id/flags
 * Body: { isSystemAdmin?: boolean }
 */
router.put('/:id/flags', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const { isSystemAdmin } = req.body || {};
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof isSystemAdmin === 'boolean') user.isSystemAdmin = isSystemAdmin;

    await user.save();
    return res.json({ user });
  } catch (e) { next(e); }
});

module.exports = router;
