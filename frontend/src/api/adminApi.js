import axios from 'axios';

const API = '/api/admin';

export const uploadForm = async (name, text) => {
  const res = await axios.post(`${API}/upload-form`, { name, text });
  return res.data;
};

export const getForms = async () => {
  const res = await axios.get(`${API}/forms`);
  // 🛠 Sicherstellen, dass ein Array zurückgegeben wird
  return Array.isArray(res.data) ? res.data : [];
};
