// frontend/src/api/groupApi.js
import api from './axios';

const base = '/groups';

function withTenant(tid, cfg = {}) {
  return {
    ...cfg,
    headers: {
      ...(cfg.headers || {}),
      'X-Tenant': tid,
    },
  };
}

export const listGroups = async (tid) => {
  const res = await api.get(base, withTenant(tid));
  return Array.isArray(res.data) ? res.data : [];
};

export const getGroup = async (tid, id) => {
  const res = await api.get(`${base}/${encodeURIComponent(id)}`, withTenant(tid));
  return res.data;
};

export const createGroup = async (tid, payload) => {
  const res = await api.post(base, payload, withTenant(tid));
  return res.data;
};

export const updateGroup = async (tid, id, payload) => {
  const res = await api.put(`${base}/${encodeURIComponent(id)}`, payload, withTenant(tid));
  return res.data;
};

export const deleteGroup = async (tid, id) => {
  const res = await api.delete(`${base}/${encodeURIComponent(id)}`, withTenant(tid));
  return res.data; // { success: true }
};

export const listGroupMembers = async (tid, id) => {
  const res = await api.get(`${base}/${encodeURIComponent(id)}/members`, withTenant(tid));
  return Array.isArray(res.data) ? res.data : [];
};
