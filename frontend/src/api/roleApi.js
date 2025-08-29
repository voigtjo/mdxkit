// frontend/src/api/roleApi.js
import { sysApi } from './axios';

const base = '/roles';

export const listRoles = async () => {
  const res = await sysApi.get(base);
  return Array.isArray(res.data) ? res.data : [];
};

export const createRole = async (payload) => {
  const res = await sysApi.post(base, payload);
  return res.data;
};

export const updateRole = async (id, payload) => {
  const res = await sysApi.put(`${base}/${encodeURIComponent(id)}`, payload);
  return res.data;
};

export const deleteRole = async (id) => {
  const res = await sysApi.delete(`${base}/${encodeURIComponent(id)}`);
  return res.data;
};
