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

// ⛔ Signatur bleibt: login(email, password)
export function login(email, password) {
  return fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(okJson)
    .then((data) => {
      // ---- DETAIL-LOG (collapsed) -----------------------------------------
      try {
        const u = data?.user || null;
        console.groupCollapsed('[API] login → payload');
        console.log('raw:', data);

        if (u) {
          const groups = Array.isArray(u.groups) ? u.groups : [];
          const memberships = Array.isArray(u.memberships) ? u.memberships : [];

          // hübsche Vorschauliste der Gruppen
          const groupsPreview = groups.map(g => ({
            groupId: g.groupId,
            _id: String(g._id || ''),      // ObjectId
            key: g.key || null,
            name: g.name || null,
            status: g.status || null,
          }));

          // memberships inklusive Rollen
          const membershipsPreview = memberships.map(m => ({
            groupObjectId: String(m.groupId || ''),     // ObjectId in der DB
            groupPublicId: m.groupPublicId || null,     // wenn vom Backend gesetzt
            roles: Array.isArray(m.roles) ? m.roles : [],
          }));

          console.log('user:', {
            id: u?._id || u?.id || null,
            email: u?.email || '',
            tenantId: u?.tenant?.tenantId || u?.tenantId || null,
            isSystemAdmin: !!u?.isSystemAdmin,
            isTenantAdmin: !!u?.isTenantAdmin,
            groupsCount: groups.length,
            groupsPreview,
            membershipsCount: memberships.length,
            membershipsPreview,
          });

          // optional zum schnellen Inspizieren im DevTools-Global-Scope
          window.__DBG_USER = u;
        } else {
          console.log('user: <missing>');
        }
        console.groupEnd();
      } catch {}
      // ---------------------------------------------------------------------

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
      // ---- DETAIL-LOG (collapsed) -----------------------------------------
      try {
        const groups = Array.isArray(u?.groups) ? u.groups : [];
        const memberships = Array.isArray(u?.memberships) ? u.memberships : [];

        const groupsPreview = groups.map(g => ({
          groupId: g.groupId,
          _id: String(g._id || ''),
          key: g.key || null,
          name: g.name || null,
          status: g.status || null,
        }));

        const membershipsPreview = memberships.map(m => ({
          groupObjectId: String(m.groupId || ''),
          groupPublicId: m.groupPublicId || null,
          roles: Array.isArray(m.roles) ? m.roles : [],
        }));

        console.groupCollapsed('[API] me()');
        console.log('user:', {
          id: u?._id || u?.id || null,
          email: u?.email || '',
          tenantId: u?.tenant?.tenantId || u?.tenantId || null,
          isSystemAdmin: !!u?.isSystemAdmin,
          isTenantAdmin: !!u?.isTenantAdmin,
          groupsCount: groups.length,
          groupsPreview,
          membershipsCount: memberships.length,
          membershipsPreview,
        });
        window.__DBG_USER = u;
        console.groupEnd();
      } catch {}
      // ---------------------------------------------------------------------

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
