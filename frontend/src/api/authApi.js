// frontend/src/api/authApi.js
const base = '/api/auth';

async function j(req) {
  const res = await req;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw (data?.error ? new Error(data.error) : new Error('Request failed'));
  return data;
}

export function register(payload) {
  return j(fetch(`${base}/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export function login({ email, password }) {
  return j(fetch(`${base}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
}

export function refresh(refreshToken, rotate = false) {
  return j(fetch(`${base}/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, rotate }),
  }));
}

export function logout(accessToken) {
  console.log('[API] POST /auth/logout (Bearer present? ', !!accessToken, ')');
  return j(fetch(`${base}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  }));
}

export function me(accessToken) {
  return j(fetch(`${base}/me`, { headers: { Authorization: `Bearer ${accessToken}` } }));
}

/* ---------- NEU: Passwort ändern ---------- */

// Kanonisch: Access-Token mitgeben
export function changePassword(accessToken, currentPassword, newPassword) {
  return j(fetch(`${base}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }));
}

// Bequemer Wrapper: liest Access-Token aus localStorage
export function changeMyPassword(currentPassword, newPassword) {
  let token = '';
  try { token = localStorage.getItem('accessToken') || ''; } catch {}
  return changePassword(token, currentPassword, newPassword);
}
