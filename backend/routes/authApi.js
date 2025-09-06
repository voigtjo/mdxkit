// frontend/src/api/authApi.js

// Dev: Vite-Proxy -> '/api'
// Prod: VITE_API_BASE='https://<backend>.onrender.com/api'
const API_ROOT = (import.meta.env?.VITE_API_BASE || '/api');
const base = `${API_ROOT}/auth`;

// Einheitliches JSON-Fetch mit sauberen Fehlern
async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    // serverseitige { error } Objekte beibehalten
    if (body && typeof body === 'object' && body.error) throw body;
    throw { error: body || res.statusText || 'Request failed' };
  }
  return body;
}

/** Registrierung: { tenantId, displayName, email, password } */
export async function register(payload) {
  return jfetch(`${base}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Login:
 * - Minimal: { email, password }
 * - Optional (falls gleiche Mail in mehreren Tenants existiert): + tenantId
 */
export async function login(payload /* { email, password, tenantId? } */) {
  return jfetch(`${base}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Aktueller Benutzer (aus Access-Token) */
export async function me(accessToken) {
  return jfetch(`${base}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Refresh-Token verwenden (optional mit rotate=true für Hard-Rotation) */
export async function refresh(refreshToken, rotate = false) {
  return jfetch(`${base}/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken, rotate }),
  });
}

/** Logout: invalidiert Refresh-Tokens (serverseitig über Token-Version) */
export async function logout(accessToken) {
  return jfetch(`${base}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
