// src/api/axios.js
import axios from 'axios';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const API_ROOT_RAW = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const apiBase = API_ROOT_RAW || '/api';

function getAccess() { try { return localStorage.getItem(ACCESS_KEY) || ''; } catch { return ''; } }
function setAccess(t) { try { if (t) localStorage.setItem(ACCESS_KEY, t); } catch {} }
function getRefresh() { try { return localStorage.getItem(REFRESH_KEY) || ''; } catch { return ''; } }
function setRefresh(t) { try { if (t) localStorage.setItem(REFRESH_KEY, t); } catch {} }
function clearTokens() { try { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); } catch {} }

function currentTenantId() {
  try {
    const m = window.location.pathname.match(/\/tenant\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
    const stored = localStorage.getItem('tenantId');
    if (stored) return stored;
  } catch {}
  return 'dev';
}

/** 2) Öffentliche API (ohne Auth) */
export const publicApi = axios.create({
  baseURL: apiBase,
  withCredentials: false,
});

/** 3) System-API (mit Auth!) */
export const sysApi = axios.create({
  baseURL: `${apiBase}/sys`,
  withCredentials: false,
});
// 🔐 Bearer für sysApi anhängen
sysApi.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 1) Tenant-API (mit Auth) */
const api = axios.create({
  baseURL: `${apiBase}/tenant/${currentTenantId()}`,
  withCredentials: false,
});

function ensureBaseURLUpToDate(cfg) {
  const tid = currentTenantId();
  const expected = `${apiBase}/tenant/${tid}`;
  if (api.defaults.baseURL !== expected) api.defaults.baseURL = expected;
  cfg.baseURL = expected;
}

api.interceptors.request.use((config) => {
  ensureBaseURLUpToDate(config);
  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method && config.method.toLowerCase() !== 'get') {
    config.headers = config.headers || {};
    if (!config.headers['Content-Type']) config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// 401-Refresh-Flow bleibt unverändert …
let isRefreshing = false;
let queue = [];
function resolveQueue(error, token = null) { queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token)); queue = []; }

const REFRESH_URL = `${apiBase}/auth/refresh`;
async function doRefresh() {
  const refreshToken = getRefresh();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post(REFRESH_URL, { refreshToken });
  if (!res?.data?.accessToken) throw new Error('Refresh failed');
  setAccess(res.data.accessToken);
  if (res.data.refreshToken) setRefresh(res.data.refreshToken);
  return res.data.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error?.config || {};
    const status = error?.response?.status || 0;
    const fullUrl = (original.baseURL || '') + (original.url || '');
    const isAuthUrl = fullUrl.includes('/api/auth/');
    if (status !== 401 || isAuthUrl) return Promise.reject(error);
    if (original.__isRetry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: async (newToken) => {
            try {
              const cfg = { ...original, __isRetry: true };
              cfg.headers = cfg.headers || {};
              cfg.headers.Authorization = `Bearer ${newToken}`;
              ensureBaseURLUpToDate(cfg);
              const resp = await api.request(cfg);
              resolve(resp);
            } catch (e) { reject(e); }
          },
          reject,
        });
      });
    }

    original.__isRetry = true;
    try {
      isRefreshing = true;
      const newToken = await doRefresh();
      resolveQueue(null, newToken);
      const cfg = { ...original };
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${newToken}`;
      ensureBaseURLUpToDate(cfg);
      return await api.request(cfg);
    } catch (e) {
      resolveQueue(e, null);
      clearTokens();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
