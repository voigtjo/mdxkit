// backend/middleware/sysAuth.js
const DEV_BYPASS = process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development';

exports.requireSystemAdmin = (req, res, next) => {
  if (DEV_BYPASS) return next();
  if (!req.user?.isSystemAdmin) return res.status(403).json({ error: 'Forbidden (SystemAdmin required)' });
  next();
};
