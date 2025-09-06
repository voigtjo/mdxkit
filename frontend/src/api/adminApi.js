// frontend/src/api/adminApi.js
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

// Alle Formulare inkl. Versionen & Vorlagen (Adminsicht)
export async function getForms(tid) {
  const res = await api.get('/admin/forms', withTenant(tid));
  return res.data;
}

// Formular hochladen/aktualisieren (Entwurf)
export async function uploadForm(tid, name, text) {
  const res = await api.post('/admin/upload-form', { name, text }, withTenant(tid));
  return res.data; // { success, version, mode }
}

// Aktuelle Version freigeben
export async function releaseFormVersion(tid, name, version) {
  const res = await api.post(
    `/admin/forms/${encodeURIComponent(name)}/release`,
    { version },
    withTenant(tid)
  );
  return res.data;
}

// Version sperren
export async function lockFormVersion(tid, name, version) {
  const res = await api.post(
    `/admin/forms/${encodeURIComponent(name)}/lock`,
    { version },
    withTenant(tid)
  );
  return res.data;
}

// Konkrete Formularversion (Text) abrufen
export async function getFormVersionText(tid, name, version) {
  const res = await api.get(
    `/admin/forms/${encodeURIComponent(name)}/version/${encodeURIComponent(version)}`,
    withTenant(tid)
  );
  return res.data; // { text, ... }
}

