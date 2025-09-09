// src/api/tenantApi.js
import api, { publicApi, sysApi } from './axios';

// System: alle Tenants (nur SysAdmin, Bearer nötig → sysApi)
export async function listAllTenants() {
  const res = await sysApi.get('/tenants');                // → /api/sys/tenants
  return res.data;
}
export async function createTenant({ tenantId, name }) {
  const res = await sysApi.post('/tenants', { tenantId, name });
  return res.data;
}
export async function updateTenant(idOrKey, patch) {
  const res = await sysApi.patch(`/tenants/${encodeURIComponent(idOrKey)}`, patch);
  return res.data;
}
export async function setTenantStatus(idOrKey, status) {
  const res = await sysApi.patch(`/tenants/${encodeURIComponent(idOrKey)}/status`, { status });
  return res.data;
}

// Public/SysAdmin-Bar: aktive Tenants (öffentliche Route → publicApi)
export async function getActiveTenants() {
  const res = await publicApi.get('/tenants');             // → /api/tenants
  return res.data; // [{ tenantId, name }]
}

// (optional) einzelner Tenant (öffentlich)
export async function getTenant(idOrKey) {
  const res = await publicApi.get(`/tenants/${encodeURIComponent(idOrKey)}`);
  return res.data;
}
