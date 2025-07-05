import axios from 'axios';
const API = '/api/admin/formats';

export const getFormats = async () => {
  const res = await axios.get(API);
  return res.data;
};

export const uploadFormat = async (name, text) => {
  const res = await axios.post(API, { name, text });
  return res.data;
};

export const releaseFormat = async (id) => {
  const res = await axios.put(`${API}/release/${id}`);
  return res.data;
};
