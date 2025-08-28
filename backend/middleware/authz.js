// middleware/authz.js
const DEV_BYPASS = process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development';

exports.requireRoles = (...allowed) => (req, res, next) => {
  if (DEV_BYPASS) return next(); // 🔓 Dev/PoC: alles erlauben
  const roles = req.user?.roles || [];
  const ok = allowed.length === 0 || allowed.some(r => roles.includes(r));
  if (!ok) return res.status(403).json({ error: 'Forbidden' });
  next();
};

