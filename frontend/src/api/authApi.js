const base = '/api/auth';

// Registrierung bleibt mit tenantId (neue User müssen einem Tenant zugeordnet werden)
export async function register(payload) {
  const res = await fetch(`${base}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), // { tenantId, displayName, email, password }
  });
  return res.json();
}

// ⬇️ Login OHNE tenantId – nur { email, password }
export async function login({ email, password }) {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function refresh(refreshToken, rotate = false) {
  const res = await fetch(`${base}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, rotate }),
  });
  return res.json();
}

export async function logout(accessToken) {
  const res = await fetch(`${base}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function me(accessToken) {
  const res = await fetch(`${base}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
