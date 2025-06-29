// src/api/manageApi.js
import axios from 'axios';

const API = '/api/manage';

export const assignForm = async (formName, patientId) => {
  const res = await axios.post(`${API}/assign`, { formName, patientId });
  return res.data;
};

export const acceptForm = async (id) => {
  const res = await axios.post(`${API}/accept/${id}`);
  return res.data;
};

export const reopenForm = async (id) => {
  const res = await axios.post(`${API}/reopen/${id}`);
  return res.data;
};

export const getFormsByName = async (formName) => {
  const res = await axios.get(`${API}/byForm/${formName}`);
  return res.data;
};

export const getFormsByPatient = async (patientId) => {
  const res = await axios.get(`${API}/byPatient/${patientId}`);
  return res.data;
};

export const deleteFormAssignment = async (entryId) => {
  const res = await axios.delete(`${API}/assignment/${entryId}`);
  return res.data;
};

// 🆕 ALLE Formulareinträge abrufen
export const getAllFormData = async () => {
  const res = await axios.get(`${API}/allFormData`);
  return res.data;
};
