// frontend/src/api/formatApi.js
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

export async function getFormats(tid) {
  const res = await api.get('/admin/formats', withTenant(tid));
  return res.data;
}

export async function uploadFormat(tid, name, text) {
  const res = await api.post('/admin/formats', { name, text }, withTenant(tid));
  return res.data;
}

export async function releaseFormat(tid, id) {
  const res = await api.put(`/admin/formats/release/${encodeURIComponent(id)}`, null, withTenant(tid));
  return res.data;
}
