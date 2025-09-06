// frontend/src/api/manageApi.js
import api from './axios';

/** Formular einem Nutzer zuweisen */
export async function assignForm(formName, userId) {
  // patientId als Fallback für ältere Backends mitsenden
  const res = await api.post('/manage/assign', { formName, userId, patientId: userId });
  return res.data;
}

/** Einträge nach Formularnamen */
export async function getFormsByName(formName) {
  const res = await api.get(`/manage/byForm/${encodeURIComponent(formName)}`);
  return res.data;
}

/** Alle Formulardaten des Tenants */
export async function getAllFormData() {
  const res = await api.get('/manage/allFormData');
  return res.data;
}

/** Zuweisung löschen (nur offen) */
export async function deleteFormAssignment(id) {
  const res = await api.delete(`/manage/assignment/${encodeURIComponent(id)}`);
  return res.data;
}

/** Freigegeben -> offen (erneut zuweisen) */
export async function reopenForm(id) {
  const res = await api.post(`/manage/reopen/${encodeURIComponent(id)}`);
  return res.data;
}

/** Freigegeben -> angenommen */
export async function acceptForm(id) {
  const res = await api.post(`/manage/accept/${encodeURIComponent(id)}`);
  return res.data;
}
