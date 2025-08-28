// src/api/userApi.js  (oder formApi.js)
import api from './axios';

const base = '/form';

export const getFormForPatient = async (formName, patientId) => {
  const res = await api.get(`${base}/${encodeURIComponent(formName)}/${encodeURIComponent(patientId)}`);
  return res.data;
};

export const getFormForTest = async (formName) => {
  const res = await api.get(`${base}/test/${encodeURIComponent(formName)}`);
  return res.data;
};

export const saveFormData = async (id, data, signature) => {
  const res = await api.put(`${base}/save/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
};

export const saveFormDataTest = async (id, data, signature) => {
  const res = await api.put(`${base}/save-test/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
};

export const submitForm = async (id, data, signature) => {
  const res = await api.post(`${base}/submit/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
};

export const submitFormTest = async (id, data, signature) => {
  const res = await api.post(`${base}/submit-test/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
};

// Patienten/User-Infos (bleibt wie von dir umgestellt)
export const getPatient = async (id) => {
  const res = await api.get(`/users/${encodeURIComponent(id)}`);
  return res.data;
};
