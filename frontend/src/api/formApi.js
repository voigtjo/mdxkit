// frontend/src/api/formApi.js
import api from './axios';

function withTenant(tid, cfg = {}) {
  return {
    ...cfg,
    headers: {
      ...(cfg.headers || {}),
      'X-Tenant': tid,
    },
  };
}

// Sichtbare/gültige Formulare für den aktuellen User (tenant-scope)
export async function getAvailableForms(tid) {
  const res = await api.get('/form/available', withTenant(tid));
  return res.data;
}

// Produktive Datenerfassung: Formular + Datensatz für Patient laden
export async function getFormForPatient(tid, formName, patientId) {
  const res = await api.get(
    `/form/${encodeURIComponent(formName)}/${encodeURIComponent(patientId)}`,
    withTenant(tid)
  );
  return res.data; // { text, format, data: {...} }
}

// Testmodus: Formular + Testdatensatz laden/erzeugen
export async function getFormForTest(tid, formName) {
  const res = await api.get(
    `/form/test/${encodeURIComponent(formName)}`,
    withTenant(tid)
  );
  return res.data; // { text, format, data, mode:'TEST' }
}

// Speichern (PROD)
export async function saveFormData(tid, id, data, signature) {
  const res = await api.put(
    `/form/save/${encodeURIComponent(id)}`,
    { data, signature },
    withTenant(tid)
  );
  return res.data;
}

// Speichern (TEST)
export async function saveFormDataTest(tid, id, data, signature) {
  const res = await api.put(
    `/form/save-test/${encodeURIComponent(id)}`,
    { data, signature },
    withTenant(tid)
  );
  return res.data;
}

// Freigeben (PROD)
export async function submitForm(tid, id, data, signature) {
  const res = await api.post(
    `/form/submit/${encodeURIComponent(id)}`,
    { data, signature },
    withTenant(tid)
  );
  return res.data;
}

// Freigeben (TEST)
export async function submitFormTest(tid, id, data, signature) {
  const res = await api.post(
    `/form/submit-test/${encodeURIComponent(id)}`,
    { data, signature },
    withTenant(tid)
  );
  return res.data;
}

// Sichtbarkeits-Metadaten der (gültigen/aktuellen) Version setzen (Admin)
export async function updateFormMeta(tid, formId, payload) {
  const res = await api.put(
    `/form/${encodeURIComponent(formId)}/meta`,
    payload,
    withTenant(tid)
  );
  return res.data;
}

// "Patient" (Nutzer) für Anzeige laden
export async function getPatient(tid, patientId) {
  const res = await api.get(`/user/${encodeURIComponent(patientId)}`, withTenant(tid));
  return res.data;
}
