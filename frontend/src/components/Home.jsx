// src/components/Home.jsx
import React from 'react';
import { Box, Paper, Stack, Button, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import usePerms, { PERMS as P } from '@/hooks/usePerms';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const { can } = usePerms();
  const { tenantId } = useParams();

  // Admin-Bypass
  const isSysAdmin = !!user?.isSystemAdmin;
  const isTenantAdminHere = !!user?.isTenantAdmin && user?.tenantId === tenantId;

  // Buttons:
  // - SysAdmin: immer enabled
  // - TenantAdmin im eigenen Tenant: immer enabled
  // - sonst: wie bisher über Permissions
  const canAdminButton =
    isSysAdmin || isTenantAdminHere || can(P.FORM_CREATE) || can(P.FORM_PUBLISH);

  const canManageButton =
    isSysAdmin || isTenantAdminHere || can(P.FORMDATA_EDIT);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Tenant: <strong>{tenantId}</strong>
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Aktionen</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            component={Link}
            to={`/tenant/${encodeURIComponent(tenantId)}/admin`}
            variant="contained"
            disabled={!canAdminButton}
          >
            Formularadministration
          </Button>

          <Button
            component={Link}
            to={`/tenant/${encodeURIComponent(tenantId)}/manage`}
            variant="outlined"
            disabled={!canManageButton}
          >
            Formularzuweisung
          </Button>

          <Button
            component={Link}
            to={`/tenant/${encodeURIComponent(tenantId)}/formular-test/Beispiel`}
            variant="text"
          >
            Formular-Test öffnen
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Willkommen! Wählen Sie eine Aktion.
        </Typography>
      </Paper>
    </Box>
  );
}
