// frontend/src/api/axios.js
import axios from 'axios';

/**
 * Public (no tenant scope) → hits /api/*
 * Use for: GET /api/tenants, public info, etc.
 */
export const publicApi = axios.create({
  baseURL: '/api',
});

/**
 * System scope (no tenant) → hits /api/sys/*
 * Use for: GET/POST /api/sys/tenants, /api/sys/roles, etc.
 */
export const sysApi = axios.create({
  baseURL: '/api/sys',
});

/**
 * Tenant scope → prefixes every request with /api/tenant/:tenantId
 * and adds x-tenant-id header.
 * Use for: /users, /groups, /form, /manage, /admin (tenant endpoints)
 *
 * IMPORTANT: Pass only relative paths like "/users", "/groups", etc.
 */
export const tenantApi = axios.create();

tenantApi.interceptors.request.use((config) => {
  const tid = (typeof window !== 'undefined' && window.localStorage)
    ? (localStorage.getItem('tenantId') || '')
    : '';

  // Build tenant-scoped URL safely
  const path = (config.url || '').startsWith('/') ? config.url : `/${config.url || ''}`;
  config.url = `/api/tenant/${encodeURIComponent(tid)}${path}`;

  // Ensure headers object exists
  config.headers = config.headers || {};
  if (tid) config.headers['x-tenant-id'] = tid;

  return config;
});

// Default export remains tenant-scoped for backward compatibility
export default tenantApi;
