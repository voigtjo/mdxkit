// src/api/adminApi.js
import api from './axios';

const adminAPI = '/admin';

export const uploadForm = async (name, text) => {
  const res = await api.post(`${adminAPI}/upload-form`, { name, text });
  return res.data;
};

export const getForms = async () => {
  const res = await api.get(`${adminAPI}/forms`);
  return res.data;
};

export const lockFormVersion = async (formName, version) => {
  const res = await api.post(`${adminAPI}/forms/${encodeURIComponent(formName)}/lock`, { version });
  return res.data;
};

export const releaseFormVersion = async (formName) => {
  const res = await api.post(`${adminAPI}/forms/${encodeURIComponent(formName)}/release`);
  return res.data;
};

export const getFormVersionText = async (formName, version) => {
  const res = await api.get(`${adminAPI}/forms/${encodeURIComponent(formName)}/version/${version}`);
  return res.data;
};

export const assignTemplatesToForm = async (formName, formFormatId, formPrintId) => {
  const res = await api.put(`${adminAPI}/forms/${encodeURIComponent(formName)}/assign-templates`, {
    formFormatId,
    formPrintId
  });
  return res.data;
};
