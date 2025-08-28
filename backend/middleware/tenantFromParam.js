// backend/middleware/tenantFromParam.js
const Tenant = require('../models/tenant');

const CACHE = new Map();
const TTL = 30_000;

module.exports = async function tenantFromParam(req, res, next) {
  const { tenantId } = req.params; // <-- aus der URL
  if (!tenantId) return res.status(400).json({ error: 'Missing tenant id in path' });

  const cached = CACHE.get(tenantId);
  if (!cached || Date.now() - cached.ts > TTL) {
    const t = await Tenant.findOne({ tenantId }).select({ status: 1, _id: 0 });
    if (!t) return res.status(404).json({ error: 'Unknown tenant' });
    CACHE.set(tenantId, { status: t.status, ts: Date.now() });
  }
  const info = CACHE.get(tenantId);
  if (info.status !== 'active') return res.status(423).json({ error: 'Tenant suspended' });

  req.tenantId = tenantId; // wie bisher – alle Routen nutzen req.tenantId
  return next();
};
