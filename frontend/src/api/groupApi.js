// frontend/src/api/groupApi.js
import api from './axios';

const base = '/groups';

export const listGroups = async () => {
  const res = await api.get(base);
  return Array.isArray(res.data) ? res.data : [];
};

export const getGroup = async (id) => {
  const res = await api.get(`${base}/${encodeURIComponent(id)}`);
  return res.data;
};

export const createGroup = async (payload) => {
  const res = await api.post(base, payload);
  return res.data;
};

export const updateGroup = async (id, payload) => {
  const res = await api.put(`${base}/${encodeURIComponent(id)}`, payload);
  return res.data;
};

export const deleteGroup = async (id) => {
  const res = await api.delete(`${base}/${encodeURIComponent(id)}`);
  return res.data; // { success: true }
};

export const listGroupMembers = async (id) => {
  const res = await api.get(`${base}/${encodeURIComponent(id)}/members`);
  return Array.isArray(res.data) ? res.data : [];
};
