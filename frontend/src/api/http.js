// Gemeinsamer Axios-Client mit Token-Handling (Access + Refresh + Retry)
import axios from 'axios';

// Keys wie in AuthContext verwendet
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

export const api = axios.create({
  baseURL: '', // gleiche Origin, /api/... wird absolut vom Browser aufgelöst
  withCredentials: false,
});

// Access-Token anhängen
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // JSON defaulten
  if (!config.headers['Content-Type'] && config.method !== 'get') {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Bei 401: einmal Refresh versuchen, dann Originalrequest retryen
let isRefreshing = false;
let pending = [];

function flushPending(error, token) {
  pending.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pending = [];
}

async function doRefresh() {
  const refreshToken = getRefresh();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post('/api/auth/refresh', { refreshToken });
  // antwort: { accessToken, refreshToken?, user }
  if (!res?.data?.accessToken) throw new Error('Refresh failed');
  setAccess(res.data.accessToken);
  if (res.data.refreshToken) setRefresh(res.data.refreshToken);
  return res.data.accessToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;

    // Kein Retry für Anfragen an /api/auth/*
    const isAuthRoute = (config?.url || '').startsWith('/api/auth/');
    if (status !== 401 || isAuthRoute) {
      return Promise.reject(error);
    }

    // Verhindern, dass wir denselben Request mehrfach refreshen
    if (config.__isRetry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Warten bis aktueller Refresh durch ist
      return new Promise((resolve, reject) => {
        pending.push({
          resolve: async (newToken) => {
            try {
              const retryCfg = { ...config, __isRetry: true };
              retryCfg.headers = retryCfg.headers || {};
              retryCfg.headers.Authorization = `Bearer ${newToken}`;
              const resp = await api.request(retryCfg);
              resolve(resp);
            } catch (e) {
              reject(e);
            }
          },
          reject,
        });
      });
    }

    config.__isRetry = true;
    try {
      isRefreshing = true;
      const newToken = await doRefresh();
      flushPending(null, newToken);
      // Original-Request mit neuem Token wiederholen
      const retryCfg = { ...config };
      retryCfg.headers = retryCfg.headers || {};
      retryCfg.headers.Authorization = `Bearer ${newToken}`;
      return await api.request(retryCfg);
    } catch (e) {
      flushPending(e);
      clearTokens();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
