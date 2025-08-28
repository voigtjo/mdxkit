// middleware/sysAuth.js
const DEV_BYPASS = process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development';
exports.requireSystemAdmin = (req, res, next) => {
  if (DEV_BYPASS) return next();
  const roles = req.user?.roles || [];
  if (!roles.includes('SystemAdmin')) return res.status(403).json({ error: 'Forbidden (SystemAdmin required)' });
  next();
};
