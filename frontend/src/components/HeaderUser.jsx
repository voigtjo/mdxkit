// src/components/HeaderUser.jsx
import React, { useMemo } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  const { tenantId: ctxTid } = useTenant();
  const nav = useNavigate();
  const loc = useLocation();

  if (!user) return null;

  // ---- TenantId robust ermitteln (Backend -> Context -> URL) ----
  const tid = useMemo(() => {
    const fromUser = user?.tenant?.tenantId || user?.tenantId || '';
    if (fromUser) return fromUser;
    if (ctxTid) return ctxTid;
    const m = (loc.pathname || '').match(/^\/tenant\/([^/]+)/);
    return m?.[1] || '';
  }, [user, ctxTid, loc.pathname]);

  // ---- Rolle bestimmen ----
  const role = user.isSystemAdmin ? 'SysAdmin' : (user.isTenantAdmin ? 'TenantAdmin' : 'User');
  const roleChipColor = user.isSystemAdmin ? 'secondary' : (user.isTenantAdmin ? 'primary' : 'default');

  // ---- „Zum Tenant“-Button nur zeigen, wenn sinnvoll ----
  const alreadyOnTenant = tid && new RegExp(`^/tenant/${tid}(/|$)`).test(loc.pathname || '');
  const canJumpToTenant = !user.isSystemAdmin && !!tid && !alreadyOnTenant;

  const goTenant = () => nav(`/tenant/${encodeURIComponent(tid)}`);

  // Debug (einmal pro Render sichtbar)
  try {
    // eslint-disable-next-line no-console
    console.debug('[HeaderUser] user:', {
      email: user?.email,
      tenantId: tid,
      role,
      path: loc.pathname
    });
  } catch {}

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 1 }}>
      {user.email && <Typography variant="body2">{user.email}</Typography>}
      <Chip size="small" variant="outlined" label={`Tenant: ${tid || '–'}`} />
      <Chip size="small" color={roleChipColor} label={`Role: ${role}`} />

      {canJumpToTenant && (
        <Button size="small" variant="outlined" onClick={goTenant}>
          Zum Tenant
        </Button>
      )}

      <Button
        size="small"
        variant="outlined"
        onClick={() => (window.location.href = '/account/change-password')}
      >
        Passwort ändern
      </Button>
      <Button size="small" variant="contained" color="secondary" onClick={doLogout}>
        Abmelden
      </Button>
    </Stack>
  );
}
