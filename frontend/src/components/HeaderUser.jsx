// src/components/HeaderUser.jsx
import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Link } from 'react-router-dom';

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  const { tenantId } = useTenant();

  if (!user) return null;

  // Wenn Tenant in URL erzwungen wird, nehmen wir die tenantisierte Route. Sonst die neutrale.
// src/components/HeaderUser.jsx
const changePwHref = tenantId
  ? `/tenant/${encodeURIComponent(tenantId)}/account/password`
  : `/account/password`;


  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2">{user.displayName || user.email}</Typography>
      {tenantId && <Chip size="small" label={`Tenant: ${tenantId}`} />}
      {user.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
      {user.isTenantAdmin && <Chip size="small" color="primary" variant="outlined" label="TenantAdmin" />}

      <Button
        component={Link}
        to={changePwHref}
        size="small"
        variant="outlined"
        sx={{ ml: 1 }}
      >
        Passwort ändern
      </Button>

      <Tooltip title="Abmelden">
        <IconButton onClick={doLogout} size="small">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
