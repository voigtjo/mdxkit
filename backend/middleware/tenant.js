// backend/middleware/tenant.js
module.exports = function tenantFromParam(req, res, next) {
  const { tenantId } = req.params || {};
  if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });
  req.tenantId = String(tenantId);
  next();
};
