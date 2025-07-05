import axios from 'axios';
const API = '/api/admin/prints';

export const getPrints = async () => {
  const res = await axios.get(API);
  return res.data;
};

export const uploadPrint = async (name, text) => {
  const res = await axios.post(API, { name, text });
  return res.data;
};

export const releasePrint = async (id) => {
  const res = await axios.put(`${API}/release/${id}`);
  return res.data;
};
