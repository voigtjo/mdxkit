import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  const { tenantId } = useTenant();

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2">{user.displayName || user.email}</Typography>
      {tenantId && <Chip size="small" label={`Tenant: ${tenantId}`} />}
      {user.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
      {user.isTenantAdmin && <Chip size="small" color="primary" variant="outlined" label="TenantAdmin" />}

      <Tooltip title="Abmelden">
        <IconButton onClick={doLogout} size="small">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
