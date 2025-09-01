// frontend/src/api/formatApi.js
import api from './axios';

export async function getFormats() {
  const res = await api.get('/admin/formats');
  return res.data;
}

export async function uploadFormat(name, text) {
  const res = await api.post('/admin/formats', { name, text });
  return res.data;
}

export async function releaseFormat(id) {
  const res = await api.put(`/admin/formats/release/${encodeURIComponent(id)}`);
  return res.data;
}
