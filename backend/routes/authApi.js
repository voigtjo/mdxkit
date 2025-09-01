const base = '/api/auth';

export async function register(payload) {
  const res = await fetch(`${base}/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function login(payload) {
  const res = await fetch(`${base}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function me(accessToken) {
  const res = await fetch(`${base}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function refresh(refreshToken, rotate = false) {
  const res = await fetch(`${base}/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, rotate }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function logout(accessToken) {
  const res = await fetch(`${base}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
