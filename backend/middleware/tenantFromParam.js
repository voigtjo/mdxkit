// backend/middleware/tenantFromParam.js
const Tenant = require('../models/tenant');

const CACHE = new Map();      // key -> { _id, ts }
const TTL_MS = 60_000;        // 60s Cache

module.exports = async function tenantFromParam(req, res, next) {
  try {
    const raw = req.params?.tenantId;
    if (!raw) return res.status(400).json({ error: 'Missing tenant id in path' });

    // Wir interpretieren :tenantId als TENANT KEY (z.B. "dev", "acme", ...)
    const key = String(raw).trim();

    const cached = CACHE.get(key);
    if (cached && (Date.now() - cached.ts) < TTL_MS) {
      req.tenant     = cached._id; // ObjectId des Tenants (für DB-Queries)
      req.tenantKey  = key;        // lesbarer Schlüssel
      req.tenantId   = key;        // Backwards-Compat (falls noch irgendwo genutzt)
      return next();
    }

    const t = await Tenant.findOne({ key }).select({ _id: 1, status: 1 }).lean();
    if (!t) return res.status(404).json({ error: 'Unknown tenant' });
    if (t.status !== 'active') return res.status(423).json({ error: 'Tenant suspended' });

    CACHE.set(key, { _id: t._id, ts: Date.now() });

    req.tenant     = t._id;  // ⬅️ ab jetzt überall als ObjectId verfügbar
    req.tenantKey  = key;
    req.tenantId   = key;    // Kompatibilität
    return next();
  } catch (e) {
    return next(e);
  }
};
