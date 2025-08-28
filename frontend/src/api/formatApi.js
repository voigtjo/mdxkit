// src/api/formatApi.js
import api from './axios';

const formatsAPI = '/admin/formats';

export const getFormats = async () => {
  const res = await api.get(`${formatsAPI}`);
  return res.data; // Array<{ _id, name, text, status, updatedAt, ... }>
};

export const uploadFormat = async (name, text) => {
  const res = await api.post(`${formatsAPI}`, { name, text });
  // { message, mode: 'create'|'update', id }
  return res.data;
};

export const releaseFormat = async (id) => {
  const res = await api.put(`${formatsAPI}/release/${encodeURIComponent(id)}`);
  return res.data; // { message, updated }
};
