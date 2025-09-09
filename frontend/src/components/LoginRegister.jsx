import React, { useState } from 'react';
import {
  Box, Paper, Stack, TextField, Button, Typography, Alert, CircularProgress
} from '@mui/material';
import { login } from '@/api/authApi';

function setTokens({ accessToken, refreshToken }) {
  try {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  } catch {}
}

export default function LoginRegister() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);

  const onLogin = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!email || !password) { setErr('Bitte Email und Passwort eingeben.'); return; }

    try {
      setBusy(true);
      const data = await login({ email, password }); // erwartet {accessToken, refreshToken}
      setTokens(data);
      // harmlos und robust: Seite neu laden → AuthProvider liest Tokens und lädt user/me
      window.location.href = '/';
    } catch (e2) {
      setErr(e2?.message || 'Login fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }} elevation={3}>
        <Typography variant="h5" sx={{ mb: 2 }}>Anmeldung</Typography>

        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        {err && <Alert severity="error"   sx={{ mb: 2 }}>{err}</Alert>}

        <Box component="form" onSubmit={onLogin}>
          <Stack spacing={2}>
            <TextField
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              fullWidth
            />
            <TextField
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button
              variant="contained"
              type="submit"
              disabled={busy}
            >
              {busy ? <CircularProgress size={20} /> : 'Einloggen'}
            </Button>
          </Stack>
        </Box>

        {/* optional: Link zum „Passwort ändern“, falls bereits eingeloggt / erzwungen wird separat */}
        {/* <Box sx={{ mt: 2 }}>
          <Button size="small" onClick={() => (window.location.href = '/account/change-password')}>
            Passwort ändern
          </Button>
        </Box> */}
      </Paper>
    </Box>
  );
}
