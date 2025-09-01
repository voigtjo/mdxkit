// frontend/src/api/manageApi.js
import api from './axios';

// Formular einem Nutzer zuweisen
export async function assignForm(formName, patientId) {
  const res = await api.post('/manage/assign', { formName, patientId });
  return res.data;
}

// Einträge nach Formular
export async function getFormsByName(formName) {
  const res = await api.get(`/manage/byForm/${encodeURIComponent(formName)}`);
  return res.data;
}

// Alle Formulardaten
export async function getAllFormData() {
  const res = await api.get('/manage/allFormData');
  return res.data;
}

// Zuweisung löschen (nur offen)
export async function deleteFormAssignment(id) {
  const res = await api.delete(`/manage/assignment/${encodeURIComponent(id)}`);
  return res.data;
}

// Reopen (freigegeben -> offen)
export async function reopenForm(id) {
  const res = await api.post(`/manage/reopen/${encodeURIComponent(id)}`);
  return res.data;
}

// Accept (freigegeben -> angenommen)
export async function acceptForm(id) {
  const res = await api.post(`/manage/accept/${encodeURIComponent(id)}`);
  return res.data;
}
