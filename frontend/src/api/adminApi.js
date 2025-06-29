import axios from 'axios';

const API = '/api/admin';

export const uploadForm = async (name, text) => {
  const res = await axios.post(`${API}/upload-form`, { name, text });
  return res.data;
};

export const getForms = async () => {
  const res = await axios.get(`${API}/forms`);
  return res.data;
};

export const lockFormVersion = async (formName, version) => {
  const res = await axios.post(`${API}/forms/${formName}/lock`, { version });
  return res.data;
};


export const releaseFormVersion = async (formName) => {
  const res = await axios.post(`${API}/forms/${formName}/release`);
  return res.data;
};

export const getFormVersionText = async (formName, version) => {
  const res = await axios.get(`${API}/forms/${formName}/version/${version}`);
  return res.data;
};




