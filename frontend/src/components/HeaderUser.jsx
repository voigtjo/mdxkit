import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  if (!user) return null;

  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
      <Typography variant="body2">{user.displayName}</Typography>
      <Chip size="small" label={`Tenant: ${user.tenantId}`} />
      {user.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
      {user.isTenantAdmin && <Chip size="small" color="primary" label="TenantAdmin" />}
      <Tooltip title="Logout">
        <IconButton onClick={doLogout} size="small"><LogoutIcon fontSize="small" /></IconButton>
      </Tooltip>
    </Box>
  );
}
