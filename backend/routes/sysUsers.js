// backend/routes/sysUsers.js
const express = require('express');
const User = require('../models/user');

const router = express.Router();

/**
 * PUT /api/sys/users/:userId/flags
 * Body: { isSystemAdmin?: boolean }
 * Hinweis: In DEV mit SKIP_AUTH=true ist alles offen; später bitte absichern.
 */
router.put('/:userId/flags', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isSystemAdmin } = req.body || {};

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof isSystemAdmin === 'boolean') user.isSystemAdmin = isSystemAdmin;

    await user.save();
    return res.json({ user });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
