// src/components/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTenant } from '@/context/TenantContext';

export default function Home() {
  const { tenantId } = useTenant();
  const disabled = !tenantId;

  const t = (path) => (tenantId ? `/tenant/${tenantId}${path}` : '#');

  return (
    <Box sx={{ p: 4, display: 'grid', placeItems: 'start' }}>
      <Typography variant="h4" gutterBottom>Formular-System</Typography>
      <Typography variant="body1" gutterBottom>
        Willkommen! Bitte wähle einen Modus:
      </Typography>

      <Stack spacing={2} sx={{ mt: 2, width: 480 }}>
        <Button
          component={Link}
          to={t('/admin')}
          variant="contained"
          disabled={disabled}
        >
          FORMULARADMINISTRATION
        </Button>

        <Button
          component={Link}
          to={t('/manage')}
          variant="outlined"
          disabled={disabled}
        >
          FORMULARZUWEISUNG
        </Button>

        <Button
          component={Link}
          to={t('/admin/format')}
          variant="outlined"
          color="secondary"
          disabled={disabled}
        >
          FORMATVORLAGEN VERWALTEN
        </Button>

        <Button
          component={Link}
          to={t('/admin/print')}
          variant="outlined"
          color="secondary"
          disabled={disabled}
        >
          DRUCKVORLAGEN VERWALTEN
        </Button>
      </Stack>

      {disabled && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Bitte oben einen Mandanten auswählen.
        </Typography>
      )}
    </Box>
  );
}
