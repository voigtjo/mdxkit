// src/api/manageApi.js
import api from './axios';

const manageAPI = '/manage';

export const assignForm = async (formName, patientId) => {
  const res = await api.post(`${manageAPI}/assign`, { formName, patientId });
  return res.data;
};

export const acceptForm = async (id) => {
  const res = await api.post(`${manageAPI}/accept/${id}`);
  return res.data;
};

export const reopenForm = async (id) => {
  const res = await api.post(`${manageAPI}/reopen/${id}`);
  return res.data;
};

export const getFormsByName = async (formName) => {
  const res = await api.get(`${manageAPI}/byForm/${encodeURIComponent(formName)}`);
  return res.data;
};

export const getFormsByPatient = async (patientId) => {
  const res = await api.get(`${manageAPI}/byPatient/${encodeURIComponent(patientId)}`);
  return res.data;
};

export const deleteFormAssignment = async (entryId) => {
  const res = await api.delete(`${manageAPI}/assignment/${entryId}`);
  return res.data;
};

// 🆕 ALLE Formulareinträge abrufen
export const getAllFormData = async () => {
  const res = await api.get(`${manageAPI}/allFormData`);
  return res.data;
};
