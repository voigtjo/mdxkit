// src/components/AccountChangePassword.jsx
import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert, Stack, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { changePassword, me } from '@/api/authApi';

function getAccessToken() {
  try { return localStorage.getItem('accessToken') || ''; } catch { return ''; }
}

export default function AccountChangePassword({ force = false, onSuccess }) {
  const nav = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = newPassword && repeat && newPassword === repeat && (!force ? currentPassword : true);

  const handleClose = () => {
    // Bei erzwungenem Wechsel kein Abbrechen anbieten
    if (force) return;
    if (onSuccess) onSuccess();
    else nav(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (newPassword !== repeat) { setErr('Die Passwörter stimmen nicht überein.'); return; }
    if (newPassword.length < 8) { setErr('Neues Passwort muss mind. 8 Zeichen haben.'); return; }

    try {
      setBusy(true);
      const access = getAccessToken();
      await changePassword(access, currentPassword, newPassword);

      // Benutzer-Infos auffrischen (optional)
      try { await me(access); } catch {}

      setMsg('✅ Passwort wurde geändert.');
      if (onSuccess) onSuccess();
      else setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (e2) {
      setErr(e2?.message || 'Fehler beim Ändern des Passworts.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 3, display:'flex', justifyContent:'center' }}>
      <Paper sx={{ p: 3, maxWidth: 520, width: '100%', position: 'relative' }} elevation={3}>
        {/* Close (X) – nur wenn nicht erzwungen */}
        {!force && (
          <IconButton
            aria-label="Schließen"
            onClick={handleClose}
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        <Typography variant="h5" gutterBottom>
          Passwort ändern
        </Typography>
        {force && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Aus Sicherheitsgründen musst du dein Passwort jetzt ändern, bevor du fortfahren kannst.
          </Alert>
        )}

        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {!force && (
              <TextField
                label="Aktuelles Passwort"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
            <TextField
              label="Neues Passwort"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              helperText="Mindestens 8 Zeichen"
            />
            <TextField
              label="Neues Passwort (Wiederholung)"
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              required
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {!force && (
                <Button variant="text" onClick={handleClose} disabled={busy}>
                  Abbrechen
                </Button>
              )}
              <Button
                variant="contained"
                type="submit"
                disabled={!canSubmit || busy}
              >
                Passwort speichern
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
