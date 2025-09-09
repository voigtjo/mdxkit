// frontend/src/components/AccountPassword.jsx
import React, { useState } from 'react';
import { Box, Paper, Stack, TextField, Button, Typography, Alert } from '@mui/material';
import { changeMyPassword } from '@/api/authApi';

export default function AccountPassword() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const disabled = !currentPassword || !newPassword || newPassword.length < 8;

  const onSave = async () => {
    setMsg(''); setErr('');
    try {
      await changeMyPassword(currentPassword, newPassword);
      setMsg('✅ Passwort geändert');
      setCurrent(''); setNew('');
    } catch (e) {
      setErr(e?.message || 'Fehler beim Ändern des Passworts');
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 480 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Passwort ändern</Typography>
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Stack spacing={2}>
          <TextField label="Aktuelles Passwort" type="password" value={currentPassword} onChange={e => setCurrent(e.target.value)} />
          <TextField label="Neues Passwort" type="password" value={newPassword} onChange={e => setNew(e.target.value)} helperText="Mindestens 8 Zeichen" />
          <Button variant="contained" onClick={onSave} disabled={disabled}>Speichern</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
