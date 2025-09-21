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
  const p = location.pathname;
  // Group-Scope (Forms)
  if (/(\/tenant\/[^/]+\/group\/[^/]+)\/admin\/forms\/?$/i.test(p)) return 'forms';
  if (/(\/tenant\/[^/]+\/group\/[^/]+)\/admin\/?$/i.test(p)) return 'forms';

  // Tenant-Verwaltung (Users/Groups) – bewusst OHNE group in der URL
  if (/\/tenant\/[^/]+\/admin\/users\/?$/i.test(p)) return 'users';
  if (/\/tenant\/[^/]+\/admin\/groups\/?$/i.test(p)) return 'groups';

  return 'forms';
}

export default function AdminIndex() {
  const { tenantId, groupId } = useParams();
  const navigate = useNavigate();
  const active = useActiveAdminTab();
  const { can } = usePerms();

  const showForms = can(P.FORM_CREATE) || can(P.FORM_PUBLISH);
  const showUsers = true;   // Tenant-Admin-Bereich (keine Gruppe)
  const showGroups = true;  // Tenant-Admin-Bereich (keine Gruppe)

  const available = [
    ...(showForms ? ['forms'] : []),
    ...(showUsers ? ['users'] : []),
    ...(showGroups ? ['groups'] : []),
  ];

  const safeActive = available.includes(active) ? active : (available[0] || 'users');

  // sichere Umleitung auf erste verfügbare Tab-Route
  useEffect(() => {
    if (safeActive !== active) {
      if (safeActive === 'forms') navigate(`/tenant/${tenantId}/group/${groupId}/admin/forms`, { replace: true });
      if (safeActive === 'users') navigate(`/tenant/${tenantId}/admin/users`, { replace: true });
      if (safeActive === 'groups') navigate(`/tenant/${tenantId}/admin/groups`, { replace: true });
    }
  }, [safeActive, active, tenantId, groupId, navigate]);

  const onChange = (_e, v) => {
    if (v === 'forms') navigate(`/tenant/${tenantId}/group/${groupId}/admin/forms`);
    if (v === 'users') navigate(`/tenant/${tenantId}/admin/users`);
    if (v === 'groups') navigate(`/tenant/${tenantId}/admin/groups`);
  };

  const content = useMemo(() => {
    if (safeActive === 'users') return <AdminUsers key={`users-${tenantId}`} />;
    if (safeActive === 'groups') return <AdminGroups key={`groups-${tenantId}`} />;
    // forms im Group-Scope:
    return <AdminForms key={`forms-${tenantId}-${groupId}`} />;
  }, [safeActive, tenantId, groupId]);

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
