import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { tenantId } = useTenant();
  const { user } = useAuth();

  const isTenantAdmin = !!user?.isTenantAdmin;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Aktionen</Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Formular-Administration */}
          <Button
            component={Link}
            to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}/admin` : '#'}
            variant="contained"
            disabled={!tenantId}
          >
            Formularadministration
          </Button>

          {/* Formularzuweisung */}
          <Button
            component={Link}
            to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}/manage` : '#'}
            variant="outlined"
            disabled={!tenantId}
          >
            Formularzuweisung
          </Button>

          {/* Formular-Test */}
          <Button
            component={Link}
            to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}/formular-test/demo` : '#'}
            variant="text"
            disabled={!tenantId}
          >
            Formular-Test öffnen
          </Button>

          {/* ➕ Benutzerverwaltung (nur für TenantAdmins) */}
          {isTenantAdmin && (
            <Button
              component={Link}
              to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}/admin/users` : '#'}
              variant="outlined"
              disabled={!tenantId}
            >
              Benutzerverwaltung
            </Button>
          )}

          {/* ➕ Gruppenverwaltung (nur für TenantAdmins) */}
          {isTenantAdmin && (
            <Button
              component={Link}
              to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}/admin/groups` : '#'}
              variant="outlined"
              disabled={!tenantId}
            >
              Gruppenverwaltung
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        Willkommen! Wählen Sie eine Aktion.
      </Paper>
    </Box>
  );
}
