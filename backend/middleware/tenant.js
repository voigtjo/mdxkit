// backend/middleware/tenant.js
module.exports = function tenantResolver(req, res, next) {
  // 1) Variante: Subdomain
  // const host = req.headers.host || '';
  // const sub = host.split('.')[0];
  // const tenantIdFromSubdomain = sub === 'www' ? null : sub;

  // 2) Variante: Header
  const headerTenant = req.header('x-tenant-id');

  // 3) Variante: JWT (falls vorhanden)
  // const tenantFromJwt = req.user?.tenantId;

  const tenantId = headerTenant /* || tenantFromJwt || tenantIdFromSubdomain */;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenant id' });
  }

  req.tenantId = tenantId;
  next();
};
