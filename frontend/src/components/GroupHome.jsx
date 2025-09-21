// src/components/GroupHome.jsx
import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import RoleVisible from '@/routes/RoleVisible';

export default function GroupHome() {
  const { tenantId: tidFromCtx } = useTenant();
  const { tenantId: tidFromUrl, groupId } = useParams();
  const tenantId = tidFromUrl || tidFromCtx;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Aktionen (Gruppe)</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <RoleVisible allow={['FormAuthor','FormPublisher']}>
            <Button
              component={Link}
              to={`/tenant/${encodeURIComponent(tenantId)}/group/${encodeURIComponent(groupId)}/admin`}
              variant="contained"
            >
              Formularadministration
            </Button>
          </RoleVisible>

          <RoleVisible allow={['Operator']}>
            <Button
              component={Link}
              to={`/tenant/${encodeURIComponent(tenantId)}/group/${encodeURIComponent(groupId)}/manage`}
              variant="outlined"
            >
              Formularzuweisung
            </Button>
          </RoleVisible>

          <RoleVisible allow={['FormDataEditor','FormPublisher','Operator']}>
            <Button
              component={Link}
              to={`/tenant/${encodeURIComponent(tenantId)}/group/${encodeURIComponent(groupId)}/formular-test/demo`}
              variant="text"
            >
              Formular-Test öffnen
            </Button>
          </RoleVisible>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        Willkommen! Wählen Sie eine Aktion für diese Gruppe.
      </Paper>
    </Box>
  );
}
