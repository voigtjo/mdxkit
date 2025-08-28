// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // bleibt
  withCredentials: false,
});

// Prefix-Regeln: welche Pfade NICHT prefixed werden
const NO_PREFIX = [/^\/tenants\b/, /^\/sys\b/, /^\/auth\b/, /^\/health\b/, /^\/tenant\/[^/]+\b/];

api.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('tenantId') || '';

  // Header weiterhin mitschicken (Backwards-Compat / Logging)
  if (tenantId) config.headers['x-tenant-id'] = tenantId;

  const url = config.url || '';
  const skip = NO_PREFIX.some((re) => re.test(url));
  if (!skip) {
    // automatisch /tenant/<id> voranstellen
    if (!tenantId) throw new Error('No tenant selected');
    config.url = `/tenant/${encodeURIComponent(tenantId)}${url}`;
  }
  return config;
});

export default api;
