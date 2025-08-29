// src/api/formApi.js
import api from './axios';

const base = '/form';

/** ------------------ Bestehende Endpunkte ------------------ **/

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

/** ------------------ Patienten/User-Infos ------------------ **/

export const getPatient = async (id) => {
  const res = await api.get(`/users/${encodeURIComponent(id)}`);
  return res.data;
};

/** ------------------ NEU: Sichtbarkeit / Zuweisung ------------------ **/

// Sichtbare Formulare (Admins sehen alle; Operator/Moderator nur globale + eigene Gruppen)
export const getAvailableForms = async (params = {}) => {
  const res = await api.get(`${base}/available`, { params });
  return Array.isArray(res.data) ? res.data : [];
};

// Admin: Formular-Metadaten setzen (global oder Gruppenliste)
export const updateFormMeta = async (formId, { isGlobal, groupIds = [] }) => {
  const res = await api.put(`${base}/${encodeURIComponent(formId)}/meta`, { isGlobal, groupIds });
  return res.data;
};
