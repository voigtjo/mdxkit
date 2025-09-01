// frontend/src/api/formApi.js
import api from './axios';

// Sichtbare/gültige Formulare für den aktuellen User (tenant-scope)
export async function getAvailableForms() {
  const res = await api.get('/form/available');
  return res.data;
}

// Produktive Datenerfassung: Formular + Datensatz für Patient laden
export async function getFormForPatient(formName, patientId) {
  const res = await api.get(`/form/${encodeURIComponent(formName)}/${encodeURIComponent(patientId)}`);
  return res.data; // { text, format, data: {...} }
}

// Testmodus: Formular + Testdatensatz laden/erzeugen
export async function getFormForTest(formName) {
  const res = await api.get(`/form/test/${encodeURIComponent(formName)}`);
  return res.data; // { text, format, data, mode:'TEST' }
}

// Speichern (PROD)
export async function saveFormData(id, data, signature) {
  const res = await api.put(`/form/save/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
}

// Speichern (TEST)
export async function saveFormDataTest(id, data, signature) {
  const res = await api.put(`/form/save-test/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
}

// Freigeben (PROD)
export async function submitForm(id, data, signature) {
  const res = await api.post(`/form/submit/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
}

// Freigeben (TEST)
export async function submitFormTest(id, data, signature) {
  const res = await api.post(`/form/submit-test/${encodeURIComponent(id)}`, { data, signature });
  return res.data;
}

// Sichtbarkeits-Metadaten der (gültigen/aktuellen) Version setzen (Admin)
export async function updateFormMeta(formId, payload) {
  const res = await api.put(`/form/${encodeURIComponent(formId)}/meta`, payload);
  return res.data;
}

// "Patient" (Nutzer) für Anzeige laden
export async function getPatient(patientId) {
  // Falls es eine dedizierte Route gibt – hier Beispiel:
  const res = await api.get(`/user/${encodeURIComponent(patientId)}`);
  return res.data;
}
