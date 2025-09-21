// frontend/src/api/meApi.js
// Schlank: 1:1 das "me" vom Auth-Controller.
// Wichtig: NICHT das tenant-spezifische api benutzen.

import { publicApi } from './axios';

function withAuthHeaders(cfg = {}) {
  const token = localStorage.getItem('accessToken') || '';
  return {
    ...cfg,
    headers: {
      ...(cfg.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

export async function getMe() {
  const res = await publicApi.get('/auth/me', withAuthHeaders());
  return res.data;
}
