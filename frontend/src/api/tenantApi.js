// frontend/src/api/tenantApi.js
// Zentraler Helper für Tenant-APIs (public, system, tenant-scoped).
// Hält die alten Funktionsnamen für Kompatibilität bei,
// nutzt aber die neue Trennung von publicApi, sysApi und tenantApi.

import { publicApi, sysApi, tenantApi } from './axios';

/** -------- PUBLIC (no tenant) -------- **/

// List tenants for TenantBar or public views (GET /api/tenants)
export const getActiveTenants = async () => {
  const res = await publicApi.get('/tenants');
  return Array.isArray(res.data) ? res.data : [];
};

// Single public tenant
export const getPublicTenant = async (idOrKey) => {
  const res = await publicApi.get(`/tenants/${encodeURIComponent(idOrKey)}`);
  return res.data;
};

/** -------- SYSTEM (no tenant) -------- **/

// Admin view of tenants (system scope) (GET /api/sys/tenants)
export const listAllTenants = async () => {
  const res = await sysApi.get('/tenants');
  return Array.isArray(res.data) ? res.data : [];
};

// Create tenant (SystemAdmin)
export const createTenant = async ({ tenantId, name, settings }) => {
  const res = await sysApi.post('/tenants', { tenantId, name, settings });
  return res.data;
};

// Update tenant settings (SystemAdmin)
export const updateTenant = async (tenantId, payload) => {
  const res = await sysApi.patch(`/tenants/${encodeURIComponent(tenantId)}`, payload);
  return res.data;
};

// Set tenant status (SystemAdmin)
export const setTenantStatus = async (tenantId, status) => {
  const res = await sysApi.patch(
    `/tenants/${encodeURIComponent(tenantId)}/status`,
    { status }
  );
  return res.data;
};

// Delete tenant (SystemAdmin)
export const deleteSystemTenant = async (tenantId) => {
  const res = await sysApi.delete(`/tenants/${encodeURIComponent(tenantId)}`);
  return res.data;
};

/** -------- TENANT (scoped) -------- **/

// Beispiel für tenant-scope (falls nötig)
export const getTenantScopedInfo = async () => {
  const res = await tenantApi.get('/admin'); // /api/tenant/:tid/admin
  return res.data;
};
