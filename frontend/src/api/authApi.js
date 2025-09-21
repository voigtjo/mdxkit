// src/api/authApi.js
const base = '/api/auth';

/* ---------------- Helper ---------------- */
function okJson(res) {
  if (!res || typeof res.ok !== 'boolean') {
    const e = new Error('Bad response');
    e.status = 0;
    throw e;
  }
  return res.json().catch(() => ({})).then((data) => {
    if (!res.ok) {
      const e = new Error(data?.error || `HTTP ${res.status}`);
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  });
}

/* ---------------- Token-Helpers ---------------- */
export function saveTokens({ accessToken, refreshToken } = {}) {
  try {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  } catch {}
}
export function clearTokens() {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch {}
}
export function getAccessToken() {
  try { return localStorage.getItem('accessToken') || ''; } catch { return ''; }
}
export function getRefreshToken() {
  try { return localStorage.getItem('refreshToken') || ''; } catch { return ''; }
}

/* ---------------- Public Endpoints ---------------- */
export function register(payload) {
  return fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(okJson);
}

// ⚠️ Signatur: login(email, password)
export function login(email, password) {
  return fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(okJson)
    .then((data) => {
      // API-Layer: präzises Logging (inkl. Gruppen)
      try {
        const u = data?.user || null;
        if (u) {
          console.log('[API] login → user', {
            id: u?._id || u?.id || null,
            email: u?.email || '',
            tenantId: u?.tenant?.tenantId || u?.tenantId || null,
            isSystemAdmin: !!u?.isSystemAdmin,
            isTenantAdmin: !!u?.isTenantAdmin,
            membershipsCount: Array.isArray(u?.memberships) ? u.memberships.length : 0,
            groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
            groupsPreview: Array.isArray(u?.groups) ? u.groups.slice(0, 5) : [],
          });
        } else {
          console.log('[API] login → ok (ohne user payload)');
        }
      } catch {}
      return data;
    });
}

export function refresh(refreshToken, rotate = false) {
  return fetch(`${base}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, rotate }),
  }).then(okJson);
}

export function logout() {
  const at = getAccessToken();
  return fetch(`${base}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
    },
  }).then(okJson);
}

/* ---------------- Bequeme Wrapper ---------------- */
export function meStored() {
  const at = getAccessToken();
  const headers = at ? { Authorization: `Bearer ${at}` } : {};
  return fetch(`${base}/me`, { headers })
    .then(okJson)
    .then((u) => {
      try {
        console.log('[API] me()', {
          id: u?._id || u?.id || null,
          email: u?.email || '',
          tenantId: u?.tenant?.tenantId || u?.tenantId || null,
          isSystemAdmin: !!u?.isSystemAdmin,
          isTenantAdmin: !!u?.isTenantAdmin,
          membershipsCount: Array.isArray(u?.memberships) ? u.memberships.length : 0,
          groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
          groupsPreview: Array.isArray(u?.groups) ? u.groups.slice(0, 5) : [],
        });
      } catch {}
      return u;
    });
}

export function refreshStored(rotate = false) {
  const rt = getRefreshToken();
  if (!rt) {
    const e = new Error('No refresh token');
    e.status = 401;
    throw e;
  }
  return refresh(rt, rotate);
}

/* ---------------- Passwort ändern ---------------- */
export function changePassword(accessToken, currentPassword, newPassword) {
  return fetch(`${base}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then(okJson);
}
export function changeMyPassword(currentPassword, newPassword) {
  return changePassword(getAccessToken(), currentPassword, newPassword);
}

/* Kompatibilitätsalias */
export { meStored as me };
