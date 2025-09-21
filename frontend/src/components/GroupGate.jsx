import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useGroup } from '@/context/GroupContext';
import { Alert, Box, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

export default function GroupGate({ children }) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { groupId } = useGroup();

  if (!user) return null;

  // Admins dürfen den Group-Scope immer betreten (kein Member-Zwang).
  if (user.isSystemAdmin || user.isTenantAdmin) {
    return children;
  }

  const memberOfGroup = (user.memberships || []).some(m => String(m.groupId) === String(groupId));

  if (!tenantId || !groupId || !memberOfGroup) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Kein Zugriff – Sie sind in dieser Gruppe nicht Mitglied.
        </Alert>
        {tenantId && (
          <Stack direction="row" spacing={1}>
            <Button component={Link} to={`/tenant/${encodeURIComponent(tenantId)}`} variant="outlined">
              Zur Tenant-Übersicht
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  return children;
}
