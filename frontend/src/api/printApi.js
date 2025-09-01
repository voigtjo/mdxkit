// frontend/src/api/printApi.js
import api from './axios';

export async function getPrints() {
  const res = await api.get('/admin/prints');
  return res.data;
}

export async function uploadPrint(name, text) {
  const res = await api.post('/admin/prints', { name, text });
  return res.data;
}

export async function releasePrint(id) {
  const res = await api.put(`/admin/prints/release/${encodeURIComponent(id)}`);
  return res.data;
}
