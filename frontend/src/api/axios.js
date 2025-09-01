// frontend/src/api/axios.js
// Drei Axios-Instanzen:
// 1) default export `api`  → /api/tenant/:tenantId (mit Bearer + Refresh-Handling)
// 2) named export `publicApi` → /api (ohne Auth)
// 3) named export `sysApi`    → /api/sys (ohne Auth)

import axios from 'axios';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

function getAccess() {
  return localStorage.getItem(ACCESS_KEY) || '';
}
function setAccess(t) {
  if (t) localStorage.setItem(ACCESS_KEY, t);
}
function getRefresh() {
  return localStorage.getItem(REFRESH_KEY) || '';
}
function setRefresh(t) {
  if (t) localStorage.setItem(REFRESH_KEY, t);
}
function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Tenant aus aktueller URL (/tenant/:tenantId/...) ableiten */
function currentTenantId() {
  try {
    const m = window.location.pathname.match(/\/tenant\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : 'dev';
  } catch {
    return 'dev';
  }
}

/** 2) Öffentliche API (ohne Auth) */
export const publicApi = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

/** 3) System-API (ohne Auth) */
export const sysApi = axios.create({
  baseURL: '/api/sys',
  withCredentials: false,
});

/** 1) Tenant-API (mit Auth) */
const api = axios.create({
  baseURL: `/api/tenant/${currentTenantId()}`,
  withCredentials: false,
});

function ensureBaseURLUpToDate(cfg) {
  const tid = currentTenantId();
  const expected = `/api/tenant/${tid}`;
  if (api.defaults.baseURL !== expected) {
    api.defaults.baseURL = expected;
  }
  cfg.baseURL = expected;
}

// Access-Token anhängen
api.interceptors.request.use((config) => {
  ensureBaseURLUpToDate(config);

  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method && config.method.toLowerCase() !== 'get') {
    config.headers = config.headers || {};
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }
  return config;
});

// 401 → Refresh (einmal) → Retry
let isRefreshing = false;
let queue = [];

function resolveQueue(error, token = null) {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  queue = [];
}

async function doRefresh() {
  const refreshToken = getRefresh();
  if (!refreshToken) throw new Error('No refresh token');

  // Refresh läuft über /api/auth/refresh (ohne tenant-scope)
  const res = await axios.post('/api/auth/refresh', { refreshToken });
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

    const isAuthUrl =
      (original.baseURL && original.url && (original.baseURL + original.url).includes('/api/auth/')) ||
      (original.url || '').startsWith('/api/auth/');

    if (status !== 401 || isAuthUrl) {
      return Promise.reject(error);
    }
    if (original.__isRetry) {
      return Promise.reject(error);
    }

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
