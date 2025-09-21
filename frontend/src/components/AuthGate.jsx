// src/components/AuthGate.jsx
import React from 'react';
import {
  Box, Paper, TextField, Button, Stack,
  Typography, CircularProgress, Alert
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';

/**
 * Gate, das:
 * - beim ersten Laden kurz einen Spinner zeigt (Hydration)
 * - OHNE /login-Route direkt ein Login-Formular auf "/" rendert
 * - nach erfolgreichem Login einfach {children} rendert
 */
export default function AuthGate({ children }) {
  const { user, loading, doLogin } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  // Initial: Hydration läuft → Spinner
  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Eingeloggt → App zeigen
  if (user) return children;

  // Nicht eingeloggt → Login direkt hier anzeigen (keine /login-Route nötig)
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await doLogin(email.trim(), password);
      // Nach erfolgreichem Login rendert dieses Gate automatisch children.
    } catch (err) {
      setError(err?.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: 380 }}>
        <Typography variant="h6" gutterBottom>Anmeldung</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              fullWidth
              required
            />
            <TextField
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button variant="contained" type="submit" disabled={submitting}>
              {submitting ? 'Anmelden…' : 'Anmelden'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
