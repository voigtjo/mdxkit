// frontend/src/api/printApi.js
import api from './axios';

function withTenant(tid, cfg = {}) {
  return {
    ...cfg,
    headers: {
      ...(cfg.headers || {}),
      'X-Tenant': tid,
    },
  };
}

export async function getPrints(tid) {
  const res = await api.get('/admin/prints', withTenant(tid));
  return res.data;
}

export async function uploadPrint(tid, name, text) {
  const res = await api.post('/admin/prints', { name, text }, withTenant(tid));
  return res.data;
}

export async function releasePrint(tid, id) {
  const res = await api.put(`/admin/prints/release/${encodeURIComponent(id)}`, null, withTenant(tid));
  return res.data;
}
