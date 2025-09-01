// frontend/src/api/adminApi.js
import api from './axios';

// Alle Formulare inkl. Versionen & Vorlagen (Adminsicht)
export async function getForms() {
  const res = await api.get('/admin/forms');
  return res.data;
}

// Formular hochladen/aktualisieren (Entwurf)
export async function uploadForm(name, text) {
  const res = await api.post('/admin/upload-form', { name, text });
  return res.data; // { success, version, mode }
}

// Aktuelle Version freigeben
export async function releaseFormVersion(name, version) {
  const res = await api.post(`/admin/forms/${encodeURIComponent(name)}/release`, { version });
  return res.data;
}

// Version sperren
export async function lockFormVersion(name, version) {
  const res = await api.post(`/admin/forms/${encodeURIComponent(name)}/lock`, { version });
  return res.data;
}

// Konkrete Formularversion (Text) abrufen
export async function getFormVersionText(name, version) {
  const res = await api.get(`/admin/forms/${encodeURIComponent(name)}/version/${encodeURIComponent(version)}`);
  return res.data; // { text, ... }
}

// Format-/Printvorlagen zuweisen
export async function assignTemplatesToForm(name, formFormatId, formPrintId) {
  const res = await api.put(
    `/admin/forms/${encodeURIComponent(name)}/assign-templates`,
    { formFormatId, formPrintId }
  );
  return res.data;
}
