// src/components/AdminIndex.jsx
import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Paper, Tabs, Tab, Stack, Typography } from '@mui/material';
import AdminForms from './AdminForms';
import AdminUsers from './AdminUsers';
import AdminGroups from './AdminGroups';
import usePerms, { PERMS as P } from '@/hooks/usePerms';

function useActiveAdminTab() {
  const location = useLocation();
  if (location.pathname.endsWith('/groups')) return 'groups';
  if (location.pathname.endsWith('/users')) return 'users';
  if (location.pathname.endsWith('/forms')) return 'forms';
  if (location.pathname.endsWith('/admin')) return 'forms';
  return 'forms';
}

export default function AdminIndex() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const active = useActiveAdminTab();
  const { can } = usePerms();

  const showForms = can(P.FORM_CREATE) || can(P.FORM_PUBLISH);
  const showUsers = true;
  const showGroups = true;

  const available = [
    ...(showForms ? ['forms'] : []),
    ...(showUsers ? ['users'] : []),
    ...(showGroups ? ['groups'] : []),
  ];

  const safeActive = available.includes(active) ? active : (available[0] || 'users');

  useEffect(() => {
    if (safeActive !== active) {
      if (safeActive === 'forms') navigate(`/tenant/${tenantId}/admin/forms`, { replace: true });
      if (safeActive === 'users') navigate(`/tenant/${tenantId}/admin/users`, { replace: true });
      if (safeActive === 'groups') navigate(`/tenant/${tenantId}/admin/groups`, { replace: true });
    }
  }, [safeActive, active, tenantId, navigate]);

  const onChange = (_e, v) => {
    if (v === 'forms') navigate(`/tenant/${tenantId}/admin/forms`);
    if (v === 'users') navigate(`/tenant/${tenantId}/admin/users`);
    if (v === 'groups') navigate(`/tenant/${tenantId}/admin/groups`);
  };

  const content = useMemo(() => {
    if (safeActive === 'users') return <AdminUsers key={`users-${tenantId}`} />;
    if (safeActive === 'groups') return <AdminGroups key={`groups-${tenantId}`} />;
    return <AdminForms key={`forms-${tenantId}`} />;
  }, [safeActive, tenantId]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5">Administration</Typography>
        <Typography variant="body2" color="text.secondary">
          Mandant: <strong>{tenantId}</strong>
        </Typography>
      </Stack>

      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={safeActive}
          onChange={onChange}
          aria-label="Admin Tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          {showForms && <Tab value="forms" label="Forms" />}
          {showUsers && <Tab value="users" label="Users" />}
          {showGroups && <Tab value="groups" label="Groups" />}
        </Tabs>
      </Paper>

      <Box>{content}</Box>
    </Box>
  );
}
