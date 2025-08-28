// src/api/printApi.js
import api from './axios';

const printsAPI = '/admin/prints';

export const getPrints = async () => {
  const res = await api.get(`${printsAPI}`);
  return res.data; // Array<{ _id, name, text, status, updatedAt, ... }>
};

export const uploadPrint = async (name, text) => {
  const res = await api.post(`${printsAPI}`, { name, text });
  // { message, mode: 'create'|'update', id }
  return res.data;
};

export const releasePrint = async (id) => {
  const res = await api.put(`${printsAPI}/release/${encodeURIComponent(id)}`);
  return res.data; // { message, updated }
};
