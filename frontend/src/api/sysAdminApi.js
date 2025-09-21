// System-Admin API – robust gegenüber verschiedenen Backends:
// - verwendet bevorzugt `sysApi` (Basis z.B. /system), fällt sonst auf `api` zurück
// - probiert Endpunkt-Varianten: /admins  ODER  /system/admins
import apiDefault, { sysApi as sysApiMaybe } from './axios';

const isProd = import.meta?.env?.MODE === 'production' || process.env.NODE_ENV === 'production';
const dlog = (...a) => { if (!isProd) console.debug('[sysAdminApi]', ...a); };

const http = sysApiMaybe || apiDefault;

// generischer Helper: probiert mehrere Pfade nacheinander
async function tryPaths(method, paths, data) {
  let lastErr;
  for (const p of paths) {
    try {
      // method: 'get' | 'post' | 'patch' | 'delete'
      const res = await http[method](p, data);
      dlog(method.toUpperCase(), '→', p, 'OK');
      return res;
    } catch (e) {
      lastErr = e;
      dlog(method.toUpperCase(), '→', p, 'FAIL');
    }
  }
  throw lastErr || new Error('Request failed');
}

// Liste der System-Admins
export async function listSysAdmins() {
  const res = await tryPaths('get', ['/admins', '/system/admins']);
  return Array.isArray(res.data) ? res.data : (res.data?.items || []);
}

// SysAdmin einladen
export async function inviteSysAdmin({ email, displayName }) {
  const payload = { email, displayName };
  const res = await tryPaths('post', ['/admins/invite', '/system/admins/invite'], payload);
  return res.data; // ggf. { email, tempPassword, ... }
}

// Status ändern (active/suspended)
export async function setSysAdminStatus(id, status) {
  const payload = { status };
  const enc = encodeURIComponent(id);
  const res = await tryPaths('patch', [`/admins/${enc}/status`, `/system/admins/${enc}/status`], payload);
  return res.data;
}

// SysAdmin-Rechte entziehen
export async function revokeSysAdmin(id) {
  const enc = encodeURIComponent(id);
  const res = await tryPaths('patch', [`/admins/${enc}/revoke`, `/system/admins/${enc}/revoke`]);
  return res.data;
}

// SysAdmin löschen
export async function deleteSysAdmin(id) {
  const enc = encodeURIComponent(id);
  const res = await tryPaths('delete', [`/admins/${enc}`, `/system/admins/${enc}`]);
  return res.data;
}
