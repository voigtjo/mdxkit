// src/components/LoginRegister.jsx
import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Tab, Tabs, TextField, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function LoginRegister() {
  const { doLogin, doRegister } = useAuth();
  const [tab, setTab] = useState(0);

  // Registrierung
  const [tenantId, setTenantId] = useState('dev');
  const [displayName, setDisplayName] = useState('');

  // Gemeinsame Felder
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  const resetMsg = () => { setInfo(''); setError(''); };

  async function onRegister(e) {
    e.preventDefault(); resetMsg();
    try {
      const res = await doRegister({ tenantId, displayName, email, password });
      if (res?.error) throw res;
      setInfo('Registrierung erfolgreich. Du kannst dich jetzt einloggen.');
      setTab(0);
    } catch (e) {
      setError(e?.error || 'Registrierung fehlgeschlagen');
    }
  }

  async function onLogin(e) {
    e.preventDefault(); resetMsg();
    try {
      const res = await doLogin({ email, password }); // ⬅️ kein tenantId beim Login
      if (res?.error) throw res;
      setInfo('Login erfolgreich.');
    } catch (e) {
      setError(e?.error || 'Login fehlgeschlagen');
    }
  }

  return (
    <Box sx={{ maxWidth: 460, mx: 'auto', mt: 6 }}>
      <Card>
        <Tabs value={tab} onChange={(_e, v) => { setTab(v); resetMsg(); }} centered>
          <Tab label="Login" />
          <Tab label="Registrieren" />
        </Tabs>
        <CardContent>
          {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box
            component="form"
            onSubmit={tab === 0 ? onLogin : onRegister}
            sx={{ display: 'grid', gap: 2 }}
          >
            {/* Registrieren hat weiterhin Tenant-Feld */}
            {tab === 1 && (
              <TextField
                label="Tenant ID"
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                required
              />
            )}

            {tab === 1 && (
              <TextField
                label="Anzeigename"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            )}

            <TextField label="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <TextField label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} required />

            <Button variant="contained" type="submit">
              {tab === 0 ? 'Einloggen' : 'Registrieren / Claim'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Hinweis: Wenn dein Account schon existiert, aber ohne Passwort angelegt wurde,
            setzt die Registrierung hier dein Passwort („Claim“). Andernfalls wird ein neuer Account angelegt.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
