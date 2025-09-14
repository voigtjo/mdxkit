// frontend/src/api/tenantAdminApi.js
import { sysApi } from './axios';
import { refresh } from './authApi';

function getAccess() {
  try { return localStorage.getItem('accessToken') || ''; } catch { return ''; }
}
function getRefresh() {
  try { return localStorage.getItem('refreshToken') || ''; } catch { return ''; }
}
function setAccess(t) { try { if (t) localStorage.setItem('accessToken', t); } catch {} }
function setRefresh(t){ try { if (t) localStorage.setItem('refreshToken', t); } catch {} }

async function req(method, url, data) {
  const headers = { Authorization: `Bearer ${getAccess()}` };
  try {
    const res = await sysApi.request({ method, url, data, headers });
    return res.data;
  } catch (err) {
    if (err?.response?.status === 401) {
      // try refresh once
      const rt = getRefresh();
      if (!rt) throw err;
      try {
        const r = await refresh(rt, true);
        setAccess(r.accessToken);
        if (r.refreshToken) setRefresh(r.refreshToken);
        const res2 = await sysApi.request({
          method, url, data,
          headers: { Authorization: `Bearer ${r.accessToken}` }
        });
        return res2.data;
      } catch (e2) { throw e2; }
    }
    throw err;
  }
}

export function listTenantAdmins(tenantId) {
  return req('get', `/tenants/${encodeURIComponent(tenantId)}/admins`);
}
export function inviteTenantAdmin(tenantId, payload) {
  return req('post', `/tenants/${encodeURIComponent(tenantId)}/admins/invite`, payload);
}
export function setTenantAdminStatus(tenantId, userId, status) {
  return req('patch', `/tenants/${encodeURIComponent(tenantId)}/admins/${encodeURIComponent(userId)}/status`, { status });
}
export function revokeTenantAdmin(tenantId, userId) {
  return req('patch', `/tenants/${encodeURIComponent(tenantId)}/admins/${encodeURIComponent(userId)}/revoke`);
}
export function deleteTenantAdmin(tenantId, userId) {
  return req('delete', `/tenants/${encodeURIComponent(tenantId)}/admins/${encodeURIComponent(userId)}`);
}
