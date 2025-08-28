import api from './axios';

const tenantsPublicAPI = '/tenants';
const sysTenantsAPI = '/sys/tenants';

export const getActiveTenants = async () => {
  const res = await api.get(`${tenantsPublicAPI}`);
  return res.data; // [{tenantId, name}]
};

// System-Admin:
export const listAllTenants = async () => {
  const res = await api.get(`${sysTenantsAPI}`);
  return res.data; // [{tenantId,name,status,settings,...}]
};

export const createTenant = async ({ tenantId, name, settings }) => {
  const res = await api.post(`${sysTenantsAPI}`, { tenantId, name, settings });
  return res.data;
};

export const setTenantStatus = async (tenantId, status) => {
  const res = await api.patch(`${sysTenantsAPI}/${encodeURIComponent(tenantId)}/status`, { status });
  return res.data;
};

// Optional: Namens-/Settings-Änderung (Backend-Routings später ergänzen)
export const updateTenant = async (tenantId, payload) => {
  const res = await api.patch(`${sysTenantsAPI}/${encodeURIComponent(tenantId)}`, payload);
  return res.data;
};
